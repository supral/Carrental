import { NextRequest, NextResponse } from "next/server";
import { getFeaturedPublicVehicles } from "@/lib/vehicles/public-vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const purpose = request.nextUrl.searchParams.get("listingPurpose");
  const listingPurpose = purpose === "rental" ? "rental" : "sale";
  const data = await getFeaturedPublicVehicles(listingPurpose);
  return NextResponse.json({ success: true, data });
}
