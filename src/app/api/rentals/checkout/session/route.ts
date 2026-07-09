import { NextRequest, NextResponse } from "next/server";
import { RentalPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { markRentalBookingPaid } from "@/lib/rentals/stripe-checkout";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";
import { formatVehicleName } from "@/lib/vehicles/display";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";

export const dynamic = "force-dynamic";

function formatBookingConfirmation(booking: {
  id: string;
  status: string;
  paymentStatus: string;
  rentalDays: number;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  selectedOptions: unknown;
  currency: string;
  pickupAt: Date;
  dropoffAt: Date;
  vehicle: {
    title: string | null;
    make: string;
    model: string;
    year: number;
    vehicleNumber: string | null;
  };
}) {
  return {
    id: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    rentalDays: booking.rentalDays,
    baseAmountCents: booking.baseAmountCents,
    extrasAmountCents: booking.extrasAmountCents,
    taxAmountCents: booking.taxAmountCents,
    totalAmountCents: booking.totalAmountCents,
    optionLines: parsePricedRentalOptionLines(booking.selectedOptions),
    currency: booking.currency,
    pickupAt: booking.pickupAt.toISOString(),
    dropoffAt: booking.dropoffAt.toISOString(),
    vehicleName: formatVehicleName(booking.vehicle),
  };
}

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
      const booking = await prisma.rentalBooking.findUnique({
        where: { id: bookingId },
        include: {
          vehicle: {
            select: {
              title: true,
              make: true,
              model: true,
              year: true,
              vehicleNumber: true,
            },
          },
        },
      });

      if (!booking) {
        return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
      }

      if (booking.paymentStatus !== RentalPaymentStatus.PAID) {
        return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: formatBookingConfirmation(booking),
      });
    }

    const booking = await markRentalBookingPaid(sessionId!);

    if (!booking) {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: formatBookingConfirmation(booking),
    });
  } catch (error) {
    if (error instanceof RentalUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to verify payment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
