import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  computeOfferDiscountAmount,
  validateSeasonOffer,
  validateSeasonOfferTemplate,
  type SeasonOfferInput,
  type SeasonOfferTemplateInput,
  type SeasonOfferTemplateLike,
} from "@/lib/vehicles/vehicle-offers";

const clearedOfferFields = {
  isOnOffer: false,
  offerType: null,
  offerDiscountType: null,
  offerAmount: null,
  offerPercent: null,
  offerStartDate: null,
  offerEndDate: null,
  discountedPrice: null,
} as const;

/** Fields to clear promotional pricing when a vehicle is sold or offer is removed. */
export const vehicleOfferClearedFields = clearedOfferFields;

function templateToInput(template: SeasonOfferTemplateLike): SeasonOfferInput {
  return {
    isOnOffer: true,
    offerType: template.offerType,
    offerDiscountType: template.offerDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    offerAmount:
      template.offerAmount != null
        ? typeof template.offerAmount === "object" && "toNumber" in template.offerAmount
          ? template.offerAmount.toNumber()
          : Number(template.offerAmount)
        : null,
    offerPercent:
      template.offerPercent != null
        ? typeof template.offerPercent === "object" && "toNumber" in template.offerPercent
          ? template.offerPercent.toNumber()
          : Number(template.offerPercent)
        : null,
    offerStartDate: template.offerStartDate,
    offerEndDate: template.offerEndDate,
  };
}

export function buildOfferTemplatePersistence(input: SeasonOfferTemplateInput) {
  const validated = validateSeasonOfferTemplate(input);

  return {
    name: validated.name!,
    offerType: validated.offerType!,
    offerDiscountType: validated.offerDiscountType || "AMOUNT",
    offerAmount:
      validated.offerDiscountType === "AMOUNT" && validated.offerAmount != null
        ? new Prisma.Decimal(validated.offerAmount)
        : null,
    offerPercent:
      validated.offerDiscountType === "PERCENT" && validated.offerPercent != null
        ? new Prisma.Decimal(validated.offerPercent)
        : null,
    offerStartDate: validated.offerStartDate ?? null,
    offerEndDate: validated.offerEndDate ?? null,
    isEnabled: validated.isEnabled !== false,
  };
}

export function buildOfferPersistence(price: number, input: SeasonOfferInput) {
  const validated = validateSeasonOffer(price, input);

  if (!validated.isOnOffer) {
    return clearedOfferFields;
  }

  const offerAmount = validated.offerAmount!;
  const discountedPrice = price - offerAmount;
  const discountType = validated.offerDiscountType || "AMOUNT";

  return {
    isOnOffer: true,
    offerType: validated.offerType!,
    offerDiscountType: discountType,
    offerAmount: new Prisma.Decimal(offerAmount),
    offerPercent:
      discountType === "PERCENT" && validated.offerPercent != null
        ? new Prisma.Decimal(validated.offerPercent)
        : null,
    offerStartDate: validated.offerStartDate ?? null,
    offerEndDate: validated.offerEndDate ?? null,
    discountedPrice: new Prisma.Decimal(discountedPrice),
  };
}

function buildVehicleCacheFromTemplate(price: number, template: SeasonOfferTemplateLike) {
  try {
    const offerData = buildOfferPersistence(price, templateToInput(template));
    return offerData;
  } catch {
    return clearedOfferFields;
  }
}

/** Sync denormalized offer fields on all vehicles linked to a template. */
export async function syncVehiclesForSeasonOffer(seasonOfferId: string) {
  const template = await prisma.seasonOffer.findUnique({ where: { id: seasonOfferId } });
  if (!template) return;

  const vehicles = await prisma.vehicle.findMany({
    where: { seasonOfferId },
    select: { id: true, price: true },
  });

  await Promise.all(
    vehicles.map((vehicle) =>
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: buildVehicleCacheFromTemplate(vehicle.price, template),
      })
    )
  );
}

export async function assignSeasonOfferToVehicle(vehicleId: string, seasonOfferId: string) {
  const [vehicle, template] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, price: true, listingPurpose: true, status: true },
    }),
    prisma.seasonOffer.findUnique({ where: { id: seasonOfferId } }),
  ]);

  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.listingPurpose !== "SALE") {
    throw new Error("Offers can only be assigned to sale vehicles");
  }
  if (vehicle.status === "SOLD") {
    throw new Error("Offers cannot be assigned to sold vehicles");
  }
  if (!template || !template.isEnabled) throw new Error("Offer not found or disabled");

  const cache = buildVehicleCacheFromTemplate(vehicle.price, template);

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      seasonOfferId,
      ...cache,
    },
  });
}

/** Assign one offer template to many sale vehicles at once. */
export async function bulkAssignSeasonOfferToVehicles(
  vehicleIds: string[],
  seasonOfferId: string
): Promise<{ assigned: number; skipped: number }> {
  if (vehicleIds.length === 0) {
    return { assigned: 0, skipped: 0 };
  }

  const template = await prisma.seasonOffer.findUnique({ where: { id: seasonOfferId } });
  if (!template || !template.isEnabled) throw new Error("Offer not found or disabled");

  const vehicles = await prisma.vehicle.findMany({
    where: {
      id: { in: vehicleIds },
      listingPurpose: "SALE",
      status: { not: "SOLD" },
    },
    select: { id: true, price: true },
  });

  await Promise.all(
    vehicles.map((vehicle) =>
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          seasonOfferId,
          ...buildVehicleCacheFromTemplate(vehicle.price, template),
        },
      })
    )
  );

  return {
    assigned: vehicles.length,
    skipped: vehicleIds.length - vehicles.length,
  };
}

export async function removeSeasonOfferFromVehicle(vehicleId: string) {
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      seasonOfferId: null,
      ...clearedOfferFields,
    },
  });
}

/** Remove stale promotional pricing from vehicles already marked sold. */
export async function clearOffersOnSoldVehicles() {
  await prisma.vehicle.updateMany({
    where: {
      status: "SOLD",
      OR: [{ seasonOfferId: { not: null } }, { isOnOffer: true }],
    },
    data: {
      seasonOfferId: null,
      ...clearedOfferFields,
    },
  });
}

/** Expire ended templates and unlink vehicles. */
export async function expireStaleVehicleOffers(now = new Date()) {
  const expiredTemplates = await prisma.seasonOffer.findMany({
    where: {
      offerEndDate: { lt: now },
      isEnabled: true,
    },
    select: { id: true },
  });

  if (expiredTemplates.length === 0) return { count: 0 };

  const ids = expiredTemplates.map((row) => row.id);

  await prisma.$transaction([
    prisma.seasonOffer.updateMany({
      where: { id: { in: ids } },
      data: { isEnabled: false },
    }),
    prisma.vehicle.updateMany({
      where: { seasonOfferId: { in: ids } },
      data: {
        seasonOfferId: null,
        ...clearedOfferFields,
      },
    }),
  ]);

  return { count: ids.length };
}
