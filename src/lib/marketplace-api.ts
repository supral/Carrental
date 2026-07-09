import { VehicleSearchParams, VehiclesResponse, FilterOptions, Vehicle } from "@/types";
import { vehicles as localVehicles } from "@/data/vehicles";

function siteApiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function buildQuery(params: VehicleSearchParams): string {
  const search = new URLSearchParams();
  search.set("listingPurpose", params.listingPurpose || "sale");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null && key !== "listingPurpose") {
      search.set(key, String(value));
    }
  });
  const q = search.toString();
  return q ? `?${q}` : "";
}

function filterLocal(params: VehicleSearchParams): Vehicle[] {
  let result = [...localVehicles].filter(
    (vehicle) => (vehicle.listingPurpose || "sale") === (params.listingPurpose || "sale")
  );

  if (params.category) result = result.filter((v) => v.category === params.category);
  if (params.make) {
    const makes = params.make.split(",");
    result = result.filter((v) => makes.includes(v.make));
  }
  if (params.model) result = result.filter((v) => v.model === params.model);
  if (params.minPrice) result = result.filter((v) => v.price >= Number(params.minPrice));
  if (params.maxPrice) result = result.filter((v) => v.price <= Number(params.maxPrice));
  if (params.minYear) result = result.filter((v) => v.year >= Number(params.minYear));
  if (params.maxYear) result = result.filter((v) => v.year <= Number(params.maxYear));
  if (params.minKm) result = result.filter((v) => v.mileage >= Number(params.minKm));
  if (params.maxKm) result = result.filter((v) => v.mileage <= Number(params.maxKm));
  if (params.fuelType) result = result.filter((v) => v.fuelType === params.fuelType);
  if (params.transmission) result = result.filter((v) => v.transmission === params.transmission);
  if (params.bodyType) result = result.filter((v) => v.bodyType === params.bodyType);
  if (params.condition) result = result.filter((v) => v.condition === params.condition);
  if (params.color) result = result.filter((v) => v.color === params.color);
  if (params.driveType) result = result.filter((v) => v.driveType === params.driveType);
  if (params.doors) result = result.filter((v) => v.doors === Number(params.doors));
  if (params.seats) result = result.filter((v) => v.seats === Number(params.seats));
  if (params.location) result = result.filter((v) => v.location === params.location);
  if (params.offersOnly === true || params.offersOnly === "true") {
    result = result.filter((v) => v.offer?.isOnOffer);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    result = result.filter(
      (v) => v.make.toLowerCase().includes(s) || v.model.toLowerCase().includes(s)
    );
  }

  switch (params.sort) {
    case "price-asc":
      result.sort(
        (a, b) => (a.offer?.displayPrice ?? a.price) - (b.offer?.displayPrice ?? b.price)
      );
      break;
    case "price-desc":
      result.sort(
        (a, b) => (b.offer?.displayPrice ?? b.price) - (a.offer?.displayPrice ?? a.price)
      );
      break;
    case "discount-desc":
      result.sort(
        (a, b) => (b.offer?.savingsAmount ?? 0) - (a.offer?.savingsAmount ?? 0)
      );
      break;
    case "km-asc": result.sort((a, b) => a.mileage - b.mileage); break;
    default: result.sort((a, b) => b.year - a.year); break;
  }

  return result;
}

function paginateLocal(items: Vehicle[], page: number, limit: number): VehiclesResponse {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return { data: items.slice(start, start + limit), total, page: safePage, limit, totalPages };
}

function getLocalFilterOptions(category?: string, listingPurpose: "sale" | "rental" = "sale"): FilterOptions {
  let list = [...localVehicles].filter((vehicle) => (vehicle.listingPurpose || "sale") === listingPurpose);
  if (category) list = list.filter((v) => v.category === category);
  const makes = [...new Set(list.map((v) => v.make))].sort();
  const models: Record<string, string[]> = {};
  makes.forEach((make) => {
    models[make] = [...new Set(list.filter((v) => v.make === make).map((v) => v.model))].sort();
  });
  return {
    makes,
    models,
    fuelTypes: [...new Set(list.map((v) => v.fuelType))].sort(),
    transmissions: [...new Set(list.map((v) => v.transmission))].sort(),
    bodyTypes: [...new Set(list.map((v) => v.bodyType))].sort(),
    conditions: [...new Set(list.map((v) => v.condition))].sort(),
    colors: [...new Set(list.map((v) => v.color))].sort(),
    driveTypes: [...new Set(list.map((v) => v.driveType))].sort(),
    doors: [...new Set(list.map((v) => v.doors))].sort((a, b) => a - b),
    seats: [...new Set(list.map((v) => v.seats))].sort((a, b) => a - b),
    features: [...new Set(list.flatMap((v) => v.features))].sort(),
    locations: [...new Set(list.map((v) => v.location))].sort(),
    years: [...new Set(list.map((v) => v.year))].sort((a, b) => b - a),
    priceRange: { min: Math.min(...list.map((v) => v.price)), max: Math.max(...list.map((v) => v.price)) },
    kmRange: { min: Math.min(...list.map((v) => v.mileage)), max: Math.max(...list.map((v) => v.mileage)) },
  };
}

export async function fetchVehiclesPaginated(params: VehicleSearchParams): Promise<VehiclesResponse> {
  try {
    const res = await fetch(`${siteApiBase()}/api/vehicles${buildQuery(params)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    return {
      data: json.data,
      total: json.total,
      page: json.page,
      limit: json.limit,
      totalPages: json.totalPages,
    };
  } catch {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 9;
    return paginateLocal(filterLocal({ ...params, listingPurpose: params.listingPurpose || "sale" }), page, limit);
  }
}

export async function fetchFilterOptions(category?: string, listingPurpose: "sale" | "rental" = "sale"): Promise<FilterOptions> {
  try {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    q.set("listingPurpose", listingPurpose);
    const res = await fetch(`${siteApiBase()}/api/vehicles/filters?${q.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    return json.data;
  } catch {
    return getLocalFilterOptions(category, listingPurpose);
  }
}

export {
  fetchVehicles,
  fetchFeaturedVehicles,
  fetchVehicleById,
  fetchVehiclesByIds,
  submitForm,
} from "./api";
