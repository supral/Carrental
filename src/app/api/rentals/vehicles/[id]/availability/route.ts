import { NextRequest, NextResponse } from "next/server";
import { getFleetAvailability } from "@/lib/rentals/fleet-inventory";
import { getPublicRentalVehicleById } from "@/lib/vehicles/public-vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const pickupDateTime = request.nextUrl.searchParams.get("pickupDateTime");
  const dropoffDateTime = request.nextUrl.searchParams.get("dropoffDateTime");

  const vehicle = await getPublicRentalVehicleById(id);
  if (!vehicle) {
    return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
  }

  const pickupAt = pickupDateTime ? new Date(pickupDateTime) : new Date();
  const dropoffAt = dropoffDateTime
    ? new Date(dropoffDateTime)
    : new Date(pickupAt.getTime() + 24 * 60 * 60 * 1000);

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime()) || dropoffAt <= pickupAt) {
    return NextResponse.json({ success: false, error: "Invalid date range" }, { status: 400 });
  }

  const fleet = await getFleetAvailability(id, { pickupAt, dropoffAt });

  return NextResponse.json({
    success: true,
    data: fleet,
  });
}
