import { prisma } from "@/lib/prisma";
import { ListingPurpose, Prisma, VehicleStatus } from "@prisma/client";
import {
  blockingRentalBookingFilter,
  rentalDateOverlapFilter,
  type DateRange,
  type FleetAvailability,
} from "@/lib/rentals/fleet-inventory";
import {
  parseVehicleRentalOptions,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";
import type { Vehicle } from "@/types";

const rentalBookingSelect = {
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
  rentalAvailableFrom: true,
  rentalAvailableTo: true,
  rentalOptions: true,
  dealer: { select: { name: true, phone: true } },
  vehicleType: { select: { name: true } },
  images: { orderBy: { order: "asc" as const }, take: 1, select: { url: true } },
} satisfies Prisma.VehicleSelect;

type RentalBookingRow = Prisma.VehicleGetPayload<{ select: typeof rentalBookingSelect }>;

function mapBookingVehicle(row: RentalBookingRow): Vehicle {
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
    dealer: row.dealer ?? { name: "Everest Car Rental", phone: "0411 528 466" },
    image,
    images: image ? [image] : [],
    description: "",
    features: [],
    totalUnits: row.totalUnits ?? 1,
    availableUnits: row.availableUnits ?? row.totalUnits ?? 1,
    rentalAvailableFrom: row.rentalAvailableFrom?.toISOString(),
    rentalAvailableTo: row.rentalAvailableTo?.toISOString(),
    vehicleTypeName: row.vehicleType?.name,
  };
}

export type RentalBookingPageData = {
  vehicle: Vehicle;
  fleetAvailability: FleetAvailability;
  vehicleOptions: VehicleRentalOptionConfig[];
};

/** Single parallel fetch for the rental booking page — avoids spec groups and duplicate vehicle queries. */
export async function loadRentalBookingPageData(
  vehicleId: string,
  range: DateRange
): Promise<RentalBookingPageData | null> {
  const [row, reservedForRange] = await Promise.all([
    prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        status: VehicleStatus.ACTIVE,
        listingPurpose: ListingPurpose.RENTAL,
      },
      select: rentalBookingSelect,
    }),
    prisma.rentalBooking.count({
      where: {
        vehicleId,
        ...rentalDateOverlapFilter(range.pickupAt, range.dropoffAt),
        ...blockingRentalBookingFilter(),
      },
    }),
  ]);

  if (!row) return null;

  const totalUnits = Math.max(1, row.totalUnits ?? 1);
  const storedAvailable = Math.max(0, row.availableUnits ?? totalUnits);
  const rangeAvailable = Math.max(0, totalUnits - reservedForRange);
  const availableUnits = Math.min(storedAvailable, rangeAvailable);

  return {
    vehicle: mapBookingVehicle(row),
    fleetAvailability: {
      totalUnits,
      reservedUnits: totalUnits - availableUnits,
      availableUnits,
    },
    vehicleOptions: parseVehicleRentalOptions(row.rentalOptions),
  };
}
