import { isWithinRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import type { RentalVehicleResult } from "@/types/rental";
import type { Vehicle } from "@/types";

/** Instant client-side filter using fleet already loaded on the page. */
export function filterFleetForInstantSearch(
  fleet: Vehicle[],
  pickupDateTime: string,
  dropoffDateTime: string
): RentalVehicleResult[] {
  const pickupAt = new Date(pickupDateTime);
  const dropoffAt = new Date(dropoffDateTime);

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime()) || dropoffAt <= pickupAt) {
    return [];
  }

  return fleet
    .filter((vehicle) => {
      if ((vehicle.availableUnits ?? vehicle.totalUnits ?? 1) <= 0) {
        return false;
      }

      return isWithinRentalAvailabilityWindow(
        pickupAt,
        dropoffAt,
        vehicle.rentalAvailableFrom ? new Date(vehicle.rentalAvailableFrom) : null,
        vehicle.rentalAvailableTo ? new Date(vehicle.rentalAvailableTo) : null
      );
    })
    .map((vehicle) => ({
      ...vehicle,
      listingPurpose: "rental" as const,
      rating: 4.5,
      totalUnits: vehicle.totalUnits ?? 1,
      availableUnits: vehicle.availableUnits ?? vehicle.totalUnits ?? 1,
      reservedUnits:
        (vehicle.totalUnits ?? 1) - (vehicle.availableUnits ?? vehicle.totalUnits ?? 1),
    }));
}
