import { NextRequest, NextResponse } from "next/server";
import { releaseVehicleReservation } from "@/lib/vehicles/reservation-service";
import { getReservationTokenFromHeaders } from "@/lib/vehicles/reservation-token";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await context.params;
    const reservationToken = getReservationTokenFromHeaders(request.headers);

    if (!reservationToken) {
      return NextResponse.json({ success: false, message: "Missing reservation token" }, { status: 400 });
    }

    const released = await releaseVehicleReservation(vehicleId, reservationToken);

    return NextResponse.json({ success: true, released });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Release failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
