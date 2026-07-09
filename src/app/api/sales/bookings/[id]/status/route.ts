import { NextRequest, NextResponse } from "next/server";
import { getSaleBookingStatusForCustomer } from "@/lib/sales/sale-booking-service";
import { formatVehicleName } from "@/lib/vehicles/display";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }

  const booking = await getSaleBookingStatusForCustomer(id, email);

  if (!booking) {
    return NextResponse.json(
      { success: false, error: "Booking not found. Check your reference and email." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      customerName: booking.customerName,
      vehicleId: booking.vehicle.id,
      vehicleName: formatVehicleName(booking.vehicle),
      vehiclePrice: booking.vehicle.price,
      agreedPriceCents: booking.agreedPriceCents,
      meetingScheduledAt: booking.meetingScheduledAt?.toISOString() ?? null,
      meetingLocation: booking.meetingLocation,
      meetingNotes: booking.meetingNotes,
      dealerName: booking.dealer.name,
      dealerPhone: booking.dealer.phone,
      createdAt: booking.createdAt.toISOString(),
      paidAt: booking.paidAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
    },
  });
}
