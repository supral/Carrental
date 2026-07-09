import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSaleBooking } from "@/lib/sales/sale-booking-service";
import { getReservationTokenFromHeaders } from "@/lib/vehicles/reservation-token";
import { assertVehicleReservedByToken, VehicleReservationConflictError } from "@/lib/vehicles/reservation-service";

export const dynamic = "force-dynamic";

const bookingSchema = z.object({
  vehicleId: z.string().min(1),
  customerName: z.string().trim().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().trim().min(1),
  customerAddress: z.string().trim().optional(),
  customerMessage: z.string().trim().optional(),
  preferredContactTime: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid booking data" }, { status: 400 });
    }

    const reservationToken = getReservationTokenFromHeaders(request.headers);
    if (!reservationToken) {
      return NextResponse.json({ success: false, error: "Missing vehicle reservation" }, { status: 400 });
    }

    await assertVehicleReservedByToken(parsed.data.vehicleId, reservationToken);

    const booking = await createSaleBooking(parsed.data);

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error) {
    if (error instanceof VehicleReservationConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Booking failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
