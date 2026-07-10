"use server";

import {
  searchAvailableRentalVehicles,
  type RentalAvailabilitySearchInput,
} from "@/lib/rentals/availability-service";
import type { RentalSearchResponse } from "@/types/rental";

export async function searchRentalVehiclesAction(
  input: RentalAvailabilitySearchInput
): Promise<RentalSearchResponse> {
  const result = await searchAvailableRentalVehicles(input);

  return {
    success: true,
    data: result.data,
    meta: result.meta,
  };
}
