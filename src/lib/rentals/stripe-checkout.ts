import { prisma } from "@/lib/prisma";
import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";
import {
  claimRentalBookingPayment,
  sendRentalLoserNotifications,
} from "@/lib/rentals/rental-overlap";
import { handleRentalBookingStatusChange } from "@/lib/rentals/rental-inventory-units";
import { formatRentalPriceSummary } from "@/lib/rentals/pricing";
import { formatVehicleName } from "@/lib/vehicles/display";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";
import { sendRentalBookingConfirmationEmail } from "@/lib/rentals/rental-booking-email";
import { sendRentalAgreementRequestEmail } from "@/lib/rentals/rental-workflow-emails";

async function sendConfirmationAndAgreementEmails(booking: {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  pickupAt: Date;
  dropoffAt: Date;
  agreementToken?: string | null;
  [key: string]: unknown;
}) {
  await sendRentalBookingConfirmationEmail(booking as never).catch((error) => {
    console.error("[rental-booking-email]", error);
  });
  if (booking.agreementToken) {
    await sendRentalAgreementRequestEmail({
      id: booking.id,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      pickupAt: booking.pickupAt,
      dropoffAt: booking.dropoffAt,
      agreementToken: booking.agreementToken,
    }).catch((error) => {
      console.error("[rental-agreement-email]", error);
    });
  }
}

export async function confirmRentalBookingWithoutPayment(bookingId: string) {
  const existing = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true },
  });

  if (!existing) {
    throw new Error("Booking not found");
  }

  const wasAlreadyPaid = existing.paymentStatus === RentalPaymentStatus.PAID;
  const result = await claimRentalBookingPayment(bookingId);
  if (result.cancelledLosers.length > 0) {
    await sendRentalLoserNotifications(
      result.cancelledLosers.filter(
        (booking): booking is (typeof result.cancelledLosers)[number] & { customerEmail: string } =>
          Boolean(booking.customerEmail)
      )
    );
  }

  if (!wasAlreadyPaid) {
    await sendConfirmationAndAgreementEmails(result.confirmed);
  }

  return result.confirmed;
}

export async function createRentalCheckoutSession(bookingId: string) {
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
          price: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === RentalBookingStatus.CANCELLED) {
    throw new Error("This booking has been cancelled");
  }

  if (booking.paymentStatus === RentalPaymentStatus.PAID) {
    throw new Error("This booking has already been paid");
  }

  if (booking.totalAmountCents <= 0) {
    throw new Error("Invalid booking amount");
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const vehicleName = formatVehicleName(booking.vehicle);
  const optionLines = parsePricedRentalOptionLines(booking.selectedOptions);

  const lineItems = [
    {
      quantity: 1,
      price_data: {
        currency: booking.currency,
        unit_amount: booking.baseAmountCents,
        product_data: {
          name: `Vehicle Rental: ${vehicleName}`,
          description: formatRentalPriceSummary(
            booking.vehicle.price,
            booking.rentalDays,
            booking.baseAmountCents
          ),
        },
      },
    },
    ...optionLines.map((line) => ({
      quantity: 1,
      price_data: {
        currency: booking.currency,
        unit_amount: line.lineTotalCents,
        product_data: {
          name: line.label,
          description: `${line.quantity > 1 ? `${line.quantity} × ` : ""}${line.description}`,
        },
      },
    })),
  ];

  if (booking.taxAmountCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: booking.currency,
        unit_amount: booking.taxAmountCents,
        product_data: {
          name: "Tax",
          description: "GST / taxes",
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customerEmail || undefined,
    line_items: lineItems,
    metadata: {
      bookingId: booking.id,
      vehicleId: booking.vehicleId,
    },
    success_url: `${baseUrl}/car-rental/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/car-rental/booking/cancel?booking_id=${booking.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session");
  }

  await prisma.rentalBooking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export async function markRentalBookingPaid(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return null;
  }

  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    throw new Error("Missing booking metadata on Stripe session");
  }

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
    throw new Error("Booking not found for paid session");
  }

  if (booking.paymentStatus === RentalPaymentStatus.PAID) {
    return booking;
  }

  const result = await claimRentalBookingPayment(bookingId);
  if (result.cancelledLosers.length > 0) {
    await sendRentalLoserNotifications(
      result.cancelledLosers.filter(
        (booking): booking is (typeof result.cancelledLosers)[number] & { customerEmail: string } =>
          Boolean(booking.customerEmail)
      )
    );
  }

  await sendConfirmationAndAgreementEmails(result.confirmed);

  return prisma.rentalBooking.update({
    where: { id: bookingId },
    data: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    },
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
}

export async function cancelUnpaidRentalBooking(bookingId: string) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true, status: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.paymentStatus === RentalPaymentStatus.PAID) {
    throw new Error("Paid bookings cannot be cancelled online");
  }

  const previousStatus = booking.status;

  const updated = await prisma.rentalBooking.update({
    where: { id: bookingId },
    data: { status: RentalBookingStatus.CANCELLED },
  });

  await handleRentalBookingStatusChange(
    bookingId,
    previousStatus,
    RentalBookingStatus.CANCELLED
  );

  return updated;
}
