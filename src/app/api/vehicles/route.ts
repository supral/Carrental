import { NextRequest, NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/vehicles/public-vehicle-service";
import type { VehicleSearchParams } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: VehicleSearchParams = {
    category: "cars",
    listingPurpose: (searchParams.get("listingPurpose") as "sale" | "rental") || "sale",
    search: searchParams.get("search") || undefined,
    make: searchParams.get("make") || undefined,
    model: searchParams.get("model") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    minYear: searchParams.get("minYear") || undefined,
    maxYear: searchParams.get("maxYear") || undefined,
    minKm: searchParams.get("minKm") || undefined,
    maxKm: searchParams.get("maxKm") || undefined,
    fuelType: searchParams.get("fuelType") || undefined,
    transmission: searchParams.get("transmission") || undefined,
    bodyType: searchParams.get("bodyType") || undefined,
    condition: searchParams.get("condition") || undefined,
    color: searchParams.get("color") || undefined,
    driveType: searchParams.get("driveType") || undefined,
    doors: searchParams.get("doors") || undefined,
    seats: searchParams.get("seats") || undefined,
    location: searchParams.get("location") || undefined,
    offersOnly: searchParams.get("offersOnly") || undefined,
    sort: (searchParams.get("sort") as VehicleSearchParams["sort"]) || "newest",
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
  };

  const result = await getPublicVehicles(params);
  return NextResponse.json({ success: true, ...result });
}
