import { prisma } from "@/lib/prisma";
import { ListingPurpose, VehicleStatus } from "@prisma/client";
import { countActiveReservations, type FleetAvailability } from "@/lib/rentals/fleet-inventory";
import { getDynamicVehicleRentalOptions } from "@/lib/rentals/dynamic-rental-options";
import type { VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";
import type { Vehicle } from "@/types";

const rentalBookingVehicleSelect = {
  id: true,
  make: true,
  model: true,
  year: true,
  price: true,
  mileage: true,
  fuelType: true,
  transmission: true,
  bodyType: true,
  condition: true,
  color: true,
  doors: true,
  seats: true,
  driveType: true,
  location: true,
  totalUnits: true,
  availableUnits: true,
  dealer: { select: { name: true, phone: true } },
  images: { orderBy: { order: "asc" as const }, take: 1, select: { url: true } },
} as const;

type RentalBookingVehicleRow = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.vehicle.findFirst<{ select: typeof rentalBookingVehicleSelect }>
    >
  >
>;

function mapToBookingVehicle(row: RentalBookingVehicleRow): Vehicle {
  const image = row.images[0]?.url || "/images/fleet/mg-zs.png";

  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    price: row.price,
    mileage: row.mileage,
    fuelType: row.fuelType as Vehicle["fuelType"],
    transmission: row.transmission as Vehicle["transmission"],
    bodyType: row.bodyType as Vehicle["bodyType"],
    category: "cars",
    listingPurpose: "rental",
    condition: row.condition as Vehicle["condition"],
    color: row.color || "White",
    doors: row.doors ?? 4,
    seats: row.seats ?? 5,
    driveType: (row.driveType || "AWD") as Vehicle["driveType"],
    location: row.location,
    dealer: {
      name: row.dealer.name,
      phone: row.dealer.phone || "0411 528 466",
    },
    image,
    images: image ? [image] : [],
    description: "",
    features: [],
    totalUnits: row.totalUnits ?? 1,
    availableUnits: row.availableUnits ?? row.totalUnits ?? 1,
  };
}

function buildFleetAvailability(
  vehicleRow: RentalBookingVehicleRow,
  reservedForRange: number
): FleetAvailability {
  const totalUnits = Math.max(1, vehicleRow.totalUnits ?? 1);
  const storedAvailable = Math.max(0, vehicleRow.availableUnits ?? totalUnits);
  const rangeAvailable = Math.max(0, totalUnits - reservedForRange);
  const availableUnits = Math.min(storedAvailable, rangeAvailable);

  return {
    totalUnits,
    reservedUnits: totalUnits - availableUnits,
    availableUnits,
  };
}

export type RentalBookPageData = {
  vehicle: Vehicle;
  vehicleOptions: VehicleRentalOptionConfig[];
  fleetAvailability: FleetAvailability;
};

/** Lightweight loader for the rental checkout page — one vehicle query + parallel reservation count. */
export async function getRentalBookPageData(
  vehicleId: string,
  pickupAt: Date,
  dropoffAt: Date
): Promise<RentalBookPageData | null> {
  const [vehicleRow, reservedForRange, vehicleOptions] = await Promise.all([
    prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        status: VehicleStatus.ACTIVE,
        listingPurpose: ListingPurpose.RENTAL,
      },
      select: rentalBookingVehicleSelect,
    }),
    countActiveReservations(vehicleId, { pickupAt, dropoffAt }),
    getDynamicVehicleRentalOptions(vehicleId),
  ]);

  if (!vehicleRow) {
    return null;
  }

  return {
    vehicle: mapToBookingVehicle(vehicleRow),
    vehicleOptions,
    fleetAvailability: buildFleetAvailability(vehicleRow, reservedForRange),
  };
}
