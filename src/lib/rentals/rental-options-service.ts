import { getVehicleRentalOptionsForBookingFromDb } from "@/lib/rentals/dynamic-rental-options";
import type { SelectedRentalOptionInput, VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";
import { calculateBookingPrice, validateSelectedOptions } from "@/lib/rentals/price-calculator";

export async function getVehicleRentalOptionsForBooking(vehicleId: string) {
  return getVehicleRentalOptionsForBookingFromDb(vehicleId);
}

export function buildBookingQuote(input: {
  pricePerDayAud: number;
  vehicleOptions: VehicleRentalOptionConfig[];
  pickupAt: Date;
  dropoffAt: Date;
  selectedOptions: SelectedRentalOptionInput[];
}) {
  const validatedSelections = validateSelectedOptions(input.vehicleOptions, input.selectedOptions);

  return {
    selectedOptions: validatedSelections,
    breakdown: calculateBookingPrice({
      pricePerDayAud: input.pricePerDayAud,
      pickupAt: input.pickupAt,
      dropoffAt: input.dropoffAt,
      vehicleOptions: input.vehicleOptions,
      selectedOptions: validatedSelections,
    }),
  };
}

export async function quoteRentalBooking(input: {
  vehicleId: string;
  pickupAt: Date;
  dropoffAt: Date;
  selectedOptions: SelectedRentalOptionInput[];
}) {
  const vehicle = await getVehicleRentalOptionsForBooking(input.vehicleId);

  return buildBookingQuote({
    pricePerDayAud: vehicle.pricePerDayAud,
    vehicleOptions: vehicle.options,
    pickupAt: input.pickupAt,
    dropoffAt: input.dropoffAt,
    selectedOptions: input.selectedOptions,
  });
}
