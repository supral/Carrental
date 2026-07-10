import { ListingPurpose, VehicleStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { resolveVehicleOffer } from "@/lib/vehicles/vehicle-offers";
import type { FleetAvailability } from "@/lib/rentals/fleet-inventory";
import type { RentalVehicleResult } from "@/types/rental";

export const rentalSearchInclude = {
  dealer: { select: { name: true, phone: true, rating: true } },
  images: { orderBy: { order: "asc" as const }, take: 1, select: { url: true } },
  vehicleType: { select: { id: true, name: true } },
  seasonOffer: true,
} as const;

export type RentalSearchVehicleRow = Prisma.VehicleGetPayload<{
  include: typeof rentalSearchInclude;
}>;

export function mapRentalSearchVehicle(
  vehicle: RentalSearchVehicleRow,
  fleet: FleetAvailability
): RentalVehicleResult {
  const image = vehicle.images[0]?.url || "/images/everest-logo-stacked.png";
  const offer = resolveVehicleOffer(vehicle);

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: offer.displayPrice,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType as RentalVehicleResult["fuelType"],
    transmission: vehicle.transmission as RentalVehicleResult["transmission"],
    bodyType: vehicle.bodyType as RentalVehicleResult["bodyType"],
    category: "cars",
    listingPurpose: "rental",
    condition: vehicle.condition as RentalVehicleResult["condition"],
    color: vehicle.color || "White",
    doors: vehicle.doors ?? 4,
    seats: vehicle.seats ?? 5,
    driveType: (vehicle.driveType || "AWD") as RentalVehicleResult["driveType"],
    location: vehicle.location,
    dealer: {
      name: vehicle.dealer.name,
      phone: vehicle.dealer.phone || "0411 528 466",
    },
    image,
    images: image ? [image] : [],
    description: vehicle.description ?? "",
    features: vehicle.features,
    featured: vehicle.featured,
    totalUnits: fleet.totalUnits,
    availableUnits: fleet.availableUnits,
    reservedUnits: fleet.reservedUnits,
    vehicleTypeId: vehicle.vehicleTypeId ?? undefined,
    vehicleTypeName: vehicle.vehicleType?.name,
    rentalAvailableFrom: vehicle.rentalAvailableFrom?.toISOString(),
    rentalAvailableTo: vehicle.rentalAvailableTo?.toISOString(),
    offer,
    rating: vehicle.dealer.rating > 0 ? vehicle.dealer.rating : 4.5,
  };
}

export function buildRentalSearchVehicleWhere(
  pickupAt: Date,
  dropoffAt: Date
): Prisma.VehicleWhereInput {
  return {
    status: VehicleStatus.ACTIVE,
    listingPurpose: ListingPurpose.RENTAL,
    availableUnits: { gt: 0 },
    AND: [
      {
        OR: [{ rentalAvailableFrom: null }, { rentalAvailableFrom: { lte: pickupAt } }],
      },
      {
        OR: [{ rentalAvailableTo: null }, { rentalAvailableTo: { gte: dropoffAt } }],
      },
    ],
  };
}
