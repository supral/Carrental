import { prisma } from "@/lib/prisma";
import { ListingPurpose, VehicleStatus } from "@prisma/client";
import {
  parseVehicleRentalOptions,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";

function mapDbCategory(category: string): "insurance" | "extra" {
  return category === "INSURANCE" || category === "PROTECTION" ? "insurance" : "extra";
}

function mapDbPriceType(priceType: string): "per_rental" | "per_day" {
  return priceType === "PER_RENTAL" ? "per_rental" : "per_day";
}

/** Load enabled rental options for a vehicle from relational tables, with JSON fallback. */
export async function getDynamicVehicleRentalOptions(
  vehicleId: string
): Promise<VehicleRentalOptionConfig[]> {
  const assignments = await prisma.vehicleRentalOption.findMany({
    where: { vehicleId, enabled: true },
    include: { rentalOption: true },
    orderBy: { rentalOption: { sortOrder: "asc" } },
  });

  if (assignments.length > 0) {
    return assignments
      .filter((row) => row.rentalOption.active)
      .map((row) => ({
        type: row.rentalOption.id,
        enabled: true,
        price: row.priceOverride ?? row.rentalOption.price,
        priceType: mapDbPriceType(row.rentalOption.priceType),
        maxQuantity: row.rentalOption.maxQuantity ?? undefined,
        description: row.rentalOption.description ?? undefined,
        label: row.rentalOption.name,
        category: mapDbCategory(row.rentalOption.category),
        supportsQuantity: row.rentalOption.supportsQuantity,
        defaultMaxQuantity: row.rentalOption.maxQuantity ?? undefined,
        defaultDescription: row.rentalOption.description ?? undefined,
      }));
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { rentalOptions: true },
  });

  return parseVehicleRentalOptions(vehicle?.rentalOptions);
}

export async function getVehicleRentalOptionsForBookingFromDb(vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    select: {
      id: true,
      price: true,
    },
  });

  if (!vehicle) {
    throw new Error("Rental vehicle not found");
  }

  const options = await getDynamicVehicleRentalOptions(vehicleId);

  return {
    vehicleId: vehicle.id,
    pricePerDayAud: vehicle.price,
    options,
  };
}
