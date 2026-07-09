import { NextRequest, NextResponse } from "next/server";
import { getPublicVehiclesByIds } from "@/lib/vehicles/public-vehicle-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  const data = await getPublicVehiclesByIds(ids);
  return NextResponse.json({ success: true, data });
}
