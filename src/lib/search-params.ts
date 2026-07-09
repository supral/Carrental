import {
  parseAsString,
  parseAsInteger,
  createSearchParamsCache,
  createSerializer,
} from "nuqs/server";
import { VehicleSearchParams } from "@/types";

export const searchParamsParsers = {
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

export const searchParamsCache = createSearchParamsCache(searchParamsParsers);
export const serializeSearchParams = createSerializer(searchParamsParsers);

export function toQueryString(params: VehicleSearchParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  );
  return new URLSearchParams(entries as [string, string][]).toString();
}

export function getActiveFilterChips(params: VehicleSearchParams): { key: string; label: string; value: string }[] {
  const chips: { key: string; label: string; value: string }[] = [];
  const labels: Record<string, string> = {
    category: "Category",
    make: "Make",
    model: "Model",
    minPrice: "Min Price",
    maxPrice: "Max Price",
    minYear: "From Year",
    maxYear: "To Year",
    minKm: "Min Km",
    maxKm: "Max Km",
    fuelType: "Fuel",
    transmission: "Transmission",
    bodyType: "Body",
    condition: "Condition",
    color: "Color",
    driveType: "Drive",
    doors: "Doors",
    seats: "Seats",
    features: "Features",
    location: "Location",
    search: "Search",
    offersOnly: "Offers Only",
  };

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "sort" || key === "page" || key === "limit") continue;
    const displayValue =
      key === "offersOnly" ? "Yes" : String(value);
    chips.push({ key, label: labels[key] || key, value: displayValue });
  }

  return chips;
}
