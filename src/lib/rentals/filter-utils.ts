import type { RentalResultFilters, RentalResultSort, RentalVehicleResult } from "@/types/rental";

export function filterAndSortRentalResults(
  vehicles: RentalVehicleResult[],
  filters: RentalResultFilters
): RentalVehicleResult[] {
  let result = vehicles.filter((vehicle) => vehicle.availableUnits > 0);

  if (filters.minPrice != null) {
    result = result.filter((v) => v.price >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    result = result.filter((v) => v.price <= filters.maxPrice!);
  }
  if (filters.make) {
    result = result.filter((v) => v.make.toLowerCase() === filters.make!.toLowerCase());
  }
  if (filters.bodyType) {
    result = result.filter((v) => v.bodyType.toLowerCase() === filters.bodyType!.toLowerCase());
  }
  if (filters.transmission) {
    result = result.filter((v) => v.transmission.toLowerCase() === filters.transmission!.toLowerCase());
  }
  if (filters.fuelType) {
    result = result.filter((v) => v.fuelType.toLowerCase() === filters.fuelType!.toLowerCase());
  }
  if (filters.seats != null) {
    result = result.filter((v) => v.seats >= filters.seats!);
  }

  result.sort(getSortComparator(filters.sort || "price-asc"));

  return result;
}

function getSortComparator(sort: RentalResultSort) {
  switch (sort) {
    case "price-desc":
      return (a: RentalVehicleResult, b: RentalVehicleResult) => b.price - a.price;
    case "newest":
      return (a: RentalVehicleResult, b: RentalVehicleResult) => b.year - a.year;
    case "rating":
      return (a: RentalVehicleResult, b: RentalVehicleResult) => b.rating - a.rating;
    case "price-asc":
    default:
      return (a: RentalVehicleResult, b: RentalVehicleResult) => a.price - b.price;
  }
}

export function paginateResults<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

export function buildFilterOptions(vehicles: RentalVehicleResult[]) {
  return {
    makes: [...new Set(vehicles.map((v) => v.make))].sort(),
    bodyTypes: [...new Set(vehicles.map((v) => v.bodyType))].sort(),
    transmissions: [...new Set(vehicles.map((v) => v.transmission))].sort(),
    fuelTypes: [...new Set(vehicles.map((v) => v.fuelType))].sort(),
    seats: [...new Set(vehicles.map((v) => v.seats))].sort((a, b) => a - b),
    priceRange: {
      min: vehicles.length ? Math.min(...vehicles.map((v) => v.price)) : 0,
      max: vehicles.length ? Math.max(...vehicles.map((v) => v.price)) : 0,
    },
  };
}

export function buildRentalDetailUrl(
  vehicleId: string,
  params: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupDate: string;
    pickupTime: string;
    dropoffDate: string;
    dropoffTime: string;
  },
  action: "details" | "rent" = "details"
) {
  if (action === "rent") {
    const search = new URLSearchParams({
      pickupAddress: params.pickupAddress,
      dropoffAddress: params.dropoffAddress,
      pickupDate: params.pickupDate,
      pickupTime: params.pickupTime,
      dropoffDate: params.dropoffDate,
      dropoffTime: params.dropoffTime,
    });
    return `/car-rental/${vehicleId}/book?${search.toString()}`;
  }

  return buildRentalDetailsUrl(vehicleId, params);
}

export function buildRentalDetailsUrl(
  vehicleId: string,
  params: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupDate: string;
    pickupTime: string;
    dropoffDate: string;
    dropoffTime: string;
  }
) {
  const search = new URLSearchParams({
    pickupAddress: params.pickupAddress,
    dropoffAddress: params.dropoffAddress,
    pickupDate: params.pickupDate,
    pickupTime: params.pickupTime,
    dropoffDate: params.dropoffDate,
    dropoffTime: params.dropoffTime,
  });

  return `/car-rental/${vehicleId}?${search.toString()}`;
}
