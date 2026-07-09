"use server";

import { revalidatePath } from "next/cache";
import { ListingPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import {
  assignSeasonOfferToVehicle,
  buildOfferTemplatePersistence,
  bulkAssignSeasonOfferToVehicles,
  expireStaleVehicleOffers,
  removeSeasonOfferFromVehicle,
  syncVehiclesForSeasonOffer,
} from "@/lib/vehicles/vehicle-offers-server";
import {
  computeOfferDiscountAmount,
  type OfferDiscountType,
  type SeasonOfferTemplateInput,
} from "@/lib/vehicles/vehicle-offers";
import { formatVehicleName } from "@/lib/vehicles/display";

async function requireManage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:manage")) throw new Error("Forbidden");
  return session.user;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export type SeasonOfferTemplateRow = {
  id: string;
  name: string;
  offerType: string;
  offerDiscountType: OfferDiscountType;
  offerAmount: number | null;
  offerPercent: number | null;
  offerStartDate: string | null;
  offerEndDate: string | null;
  isEnabled: boolean;
  vehicleCount: number;
  discountLabel: string;
};

function formatDiscountLabel(template: {
  offerDiscountType: string | null;
  offerAmount: unknown;
  offerPercent: unknown;
}): string {
  if (template.offerDiscountType === "PERCENT") {
    const percent = toNumber(template.offerPercent);
    return percent != null ? `${percent}%` : "—";
  }
  const amount = toNumber(template.offerAmount);
  return amount != null ? `$${amount.toLocaleString()}` : "—";
}

export async function listSeasonOfferTemplates(): Promise<SeasonOfferTemplateRow[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  await expireStaleVehicleOffers();

  const templates = await prisma.seasonOffer.findMany({
    include: { _count: { select: { vehicles: true } } },
    orderBy: [{ isEnabled: "desc" }, { updatedAt: "desc" }],
  });

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    offerType: template.offerType,
    offerDiscountType: template.offerDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    offerAmount: toNumber(template.offerAmount),
    offerPercent: toNumber(template.offerPercent),
    offerStartDate: template.offerStartDate?.toISOString() ?? null,
    offerEndDate: template.offerEndDate?.toISOString() ?? null,
    isEnabled: template.isEnabled,
    vehicleCount: template._count.vehicles,
    discountLabel: formatDiscountLabel(template),
  }));
}

export async function createSeasonOfferTemplate(input: SeasonOfferTemplateInput) {
  await requireManage();
  const data = buildOfferTemplatePersistence(input);
  const created = await prisma.seasonOffer.create({ data });
  revalidatePaths();
  return created.id;
}

export async function updateSeasonOfferTemplate(id: string, input: SeasonOfferTemplateInput) {
  await requireManage();
  const data = buildOfferTemplatePersistence(input);
  await prisma.seasonOffer.update({ where: { id }, data });
  await syncVehiclesForSeasonOffer(id);
  revalidatePaths();
}

export async function toggleSeasonOfferTemplate(id: string, isEnabled: boolean) {
  await requireManage();
  await prisma.seasonOffer.update({ where: { id }, data: { isEnabled } });
  if (!isEnabled) {
    await prisma.vehicle.updateMany({
      where: { seasonOfferId: id },
      data: {
        seasonOfferId: null,
        isOnOffer: false,
        offerType: null,
        offerDiscountType: null,
        offerAmount: null,
        offerPercent: null,
        offerStartDate: null,
        offerEndDate: null,
        discountedPrice: null,
      },
    });
  } else {
    await syncVehiclesForSeasonOffer(id);
  }
  revalidatePaths();
}

export async function deleteSeasonOfferTemplate(id: string) {
  await requireManage();
  await prisma.vehicle.updateMany({
    where: { seasonOfferId: id },
    data: {
      seasonOfferId: null,
      isOnOffer: false,
      offerType: null,
      offerDiscountType: null,
      offerAmount: null,
      offerPercent: null,
      offerStartDate: null,
      offerEndDate: null,
      discountedPrice: null,
    },
  });
  await prisma.seasonOffer.delete({ where: { id } });
  revalidatePaths();
}

export async function assignOfferToVehicle(vehicleId: string, seasonOfferId: string) {
  await requireManage();
  await assignSeasonOfferToVehicle(vehicleId, seasonOfferId);
  revalidatePaths();
}

export async function bulkAssignOfferToVehicles(vehicleIds: string[], seasonOfferId: string) {
  await requireManage();
  const result = await bulkAssignSeasonOfferToVehicles(vehicleIds, seasonOfferId);
  revalidatePaths();
  return result;
}

/**
 * Create a brand-new offer and assign it exclusively to a single vehicle.
 * The offer is still stored as a SeasonOffer template (so pricing stays consistent),
 * but it is only linked to the one vehicle it was created for.
 */
export async function createAndAssignOfferToVehicle(
  vehicleId: string,
  input: SeasonOfferTemplateInput
) {
  await requireManage();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { listingPurpose: true, status: true },
  });

  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.listingPurpose !== ListingPurpose.SALE) {
    throw new Error("Offers can only be assigned to sale vehicles");
  }
  if (vehicle.status === "SOLD") {
    throw new Error("Offers cannot be assigned to sold vehicles");
  }

  const data = buildOfferTemplatePersistence(input);
  const created = await prisma.seasonOffer.create({ data });

  await assignSeasonOfferToVehicle(vehicleId, created.id);
  revalidatePaths();

  return created.id;
}

export async function removeOfferFromVehicle(vehicleId: string) {
  await requireManage();
  await removeSeasonOfferFromVehicle(vehicleId);
  revalidatePaths();
}

export type AssignableOfferOption = {
  id: string;
  label: string;
  offerType: string;
  discountLabel: string;
};

export async function listAssignableOffers(): Promise<AssignableOfferOption[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  const templates = await prisma.seasonOffer.findMany({
    where: { isEnabled: true },
    orderBy: { name: "asc" },
  });

  return templates.map((template) => ({
    id: template.id,
    label: template.name,
    offerType: template.offerType,
    discountLabel: formatDiscountLabel(template),
  }));
}

export async function previewOfferForVehicle(vehicleId: string, seasonOfferId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [vehicle, template] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { price: true } }),
    prisma.seasonOffer.findUnique({ where: { id: seasonOfferId } }),
  ]);

  if (!vehicle || !template) throw new Error("Vehicle or offer not found");

  const amount = computeOfferDiscountAmount(vehicle.price, {
    isOnOffer: true,
    offerType: template.offerType,
    offerDiscountType: template.offerDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    offerAmount: toNumber(template.offerAmount),
    offerPercent: toNumber(template.offerPercent),
    offerStartDate: template.offerStartDate,
    offerEndDate: template.offerEndDate,
  });

  return {
    originalPrice: vehicle.price,
    discount: amount,
    finalPrice: vehicle.price - amount,
  };
}

function revalidatePaths() {
  revalidatePath("/admin/marketing/offers");
  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
  revalidatePath("/");
}

// Legacy exports used elsewhere — redirect to new model
export async function listActiveVehicleOffers() {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      listingPurpose: ListingPurpose.SALE,
      seasonOfferId: { not: null },
    },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      price: true,
      status: true,
      seasonOffer: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: formatVehicleName(vehicle),
    status: vehicle.status,
    offerName: vehicle.seasonOffer?.name ?? null,
    offerType: vehicle.seasonOffer?.offerType ?? null,
  }));
}
