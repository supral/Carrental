import { NextRequest, NextResponse } from "next/server";
import { getPublicFilterOptions } from "@/lib/vehicles/public-vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const listingPurpose =
    request.nextUrl.searchParams.get("listingPurpose") === "rental" ? "rental" : "sale";
  const data = await getPublicFilterOptions(listingPurpose);
  return NextResponse.json({ success: true, data });
}
