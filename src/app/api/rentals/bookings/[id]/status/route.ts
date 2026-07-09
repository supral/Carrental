import { NextRequest, NextResponse } from "next/server";
import { getRentalBookingStatusForCustomer } from "@/lib/bookings/customer-bookings-service";
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

  const booking = await getRentalBookingStatusForCustomer(id, email);

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
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupAt: booking.pickupAt.toISOString(),
      dropoffAt: booking.dropoffAt.toISOString(),
      rentalDays: booking.rentalDays,
      baseAmountCents: booking.baseAmountCents,
      extrasAmountCents: booking.extrasAmountCents,
      taxAmountCents: booking.taxAmountCents,
      totalAmountCents: booking.totalAmountCents,
      createdAt: booking.createdAt.toISOString(),
      paidAt: booking.paidAt?.toISOString() ?? null,
    },
  });
}
