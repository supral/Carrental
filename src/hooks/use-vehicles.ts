"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { fetchVehiclesPaginated, fetchFilterOptions } from "@/lib/marketplace-api";
import { VehicleSearchParams } from "@/types";

export const vehicleSearchParsers = {
  category: parseAsString.withDefault("cars"),
  search: parseAsString,
  make: parseAsString,
  model: parseAsString,
  minPrice: parseAsString,
  maxPrice: parseAsString,
  minYear: parseAsString,
  maxYear: parseAsString,
  minKm: parseAsString,
  maxKm: parseAsString,
  fuelType: parseAsString,
  transmission: parseAsString,
  bodyType: parseAsString,
  condition: parseAsString,
  color: parseAsString,
  driveType: parseAsString,
  doors: parseAsString,
  seats: parseAsString,
  features: parseAsString,
  location: parseAsString,
  offersOnly: parseAsString,
  sort: parseAsString.withDefault("newest"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(9),
};

export function useVehicleSearchParams() {
  return useQueryStates(vehicleSearchParsers, { shallow: false });
}

export function useVehiclesQuery(params: VehicleSearchParams) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: () => fetchVehiclesPaginated(params),
  });
}

export function useFilterOptionsQuery(category?: string) {
  return useQuery({
    queryKey: ["filter-options", category],
    queryFn: () => fetchFilterOptions(category),
    staleTime: 5 * 60 * 1000,
  });
}
