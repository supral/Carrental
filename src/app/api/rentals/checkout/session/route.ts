import { NextRequest, NextResponse } from "next/server";
import { markRentalBookingPaid } from "@/lib/rentals/stripe-checkout";
import {
  formatRentalBookingConfirmation,
  loadRentalBookingConfirmation,
} from "@/lib/rentals/booking-confirmation";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const bookingId = request.nextUrl.searchParams.get("booking_id");

  if (!sessionId && !bookingId) {
    return NextResponse.json(
      { success: false, error: "Missing session_id or booking_id" },
      { status: 400 }
    );
  }

  try {
    if (bookingId) {
      const result = await loadRentalBookingConfirmation(bookingId);

      if (result.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    const booking = await markRentalBookingPaid(sessionId!);

    if (!booking) {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: formatRentalBookingConfirmation(booking),
    });
  } catch (error) {
    if (error instanceof RentalUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to verify payment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
