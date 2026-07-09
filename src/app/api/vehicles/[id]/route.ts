import { NextResponse } from "next/server";
import { getPublicVehicleById } from "@/lib/vehicles/public-vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vehicle = await getPublicVehicleById(id);

  if (!vehicle) {
    return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: vehicle });
}
