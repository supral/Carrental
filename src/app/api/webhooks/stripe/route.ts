import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { markRentalBookingPaid } from "@/lib/rentals/stripe-checkout";
import { prisma } from "@/lib/prisma";
import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { releaseVehicleReservation } from "@/lib/vehicles/reservation-service";
import { handleRentalBookingStatusChange } from "@/lib/rentals/rental-inventory-units";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          await markRentalBookingPaid(session.id);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        const vehicleId = session.metadata?.vehicleId;
        const reservationToken = session.metadata?.reservationToken;

        if (bookingId) {
          const booking = await prisma.rentalBooking.findUnique({
            where: { id: bookingId },
            select: { status: true },
          });

          if (booking) {
            await prisma.rentalBooking.updateMany({
              where: {
                id: bookingId,
                paymentStatus: RentalPaymentStatus.UNPAID,
              },
              data: { status: RentalBookingStatus.CANCELLED },
            });
            await handleRentalBookingStatusChange(
              bookingId,
              booking.status,
              RentalBookingStatus.CANCELLED
            );
          }
        }

        if (vehicleId && reservationToken) {
          await releaseVehicleReservation(vehicleId, reservationToken);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
