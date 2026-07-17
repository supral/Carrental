import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAndConfirmRentalBooking, createRentalBooking } from "@/lib/rentals/availability-service";
import {
  createRentalCheckoutSession,
} from "@/lib/rentals/stripe-checkout";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";
import { sendRentalBookingConfirmationEmail } from "@/lib/rentals/rental-booking-email";
import { getAppBaseUrl, shouldBypassStripePayment } from "@/lib/stripe";
import { parseSelectedRentalOptions } from "@/lib/rentals/option-catalog";

export const dynamic = "force-dynamic";

const bookingSchema = z.object({
  vehicleId: z.string().min(1),
  pickupAddress: z.string().trim().min(1),
  dropoffAddress: z.string().trim().min(1),
  pickupDateTime: z.string().min(1),
  dropoffDateTime: z.string().min(1),
  customerName: z.string().trim().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().trim().min(1),
  customerAddress: z.string().trim().min(1),
  customerZip: z.string().trim().optional(),
  customerDob: z.string().min(1),
  customerCountry: z.string().trim().min(1),
  drivingLicenceNumber: z.string().trim().optional(),
  licencePhotoUrl: z.string().trim().optional(),
  notes: z.string().optional(),
  selectedOptions: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive().max(10),
      })
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid booking data" },
        { status: 400 }
      );
    }

    const { pickupDateTime, dropoffDateTime, customerDob: customerDobInput, ...bookingInput } = parsed.data;
    const pickupAt = new Date(pickupDateTime);
    const dropoffAt = new Date(dropoffDateTime);
    const customerDob = new Date(customerDobInput);

    if (Number.isNaN(customerDob.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid date of birth" }, { status: 400 });
    }

    if (shouldBypassStripePayment()) {
      try {
        const confirmed = await createAndConfirmRentalBooking({
          ...bookingInput,
          drivingLicenceNumber: bookingInput.drivingLicenceNumber?.trim() || undefined,
          licencePhotoUrl: bookingInput.licencePhotoUrl?.trim() || undefined,
          selectedOptions: parseSelectedRentalOptions(bookingInput.selectedOptions),
          pickupAt,
          dropoffAt,
          customerDob,
        });
        const baseUrl = getAppBaseUrl();

        await sendRentalBookingConfirmationEmail(confirmed).catch((error) => {
          console.error("[rental-booking-email]", error);
        });

        console.log(
          `[rental-booking] Stripe bypassed — booking ${confirmed.id} confirmed, confirmation email sent to ${confirmed.customerEmail ?? "n/a"}`
        );

        return NextResponse.json({
          success: true,
          data: {
            id: confirmed.id,
            status: confirmed.status,
            paymentStatus: confirmed.paymentStatus,
            rentalDays: confirmed.rentalDays,
            baseAmountCents: confirmed.baseAmountCents,
            extrasAmountCents: confirmed.extrasAmountCents,
            taxAmountCents: confirmed.taxAmountCents,
            totalAmountCents: confirmed.totalAmountCents,
            currency: confirmed.currency,
            checkoutUrl: null,
            successUrl: `${baseUrl}/car-rental/booking/success?booking_id=${confirmed.id}`,
          },
        });
      } catch (payError) {
        if (payError instanceof RentalUnavailableError) {
          return NextResponse.json({ success: false, error: payError.message }, { status: 409 });
        }
        throw payError;
      }
    }

    const booking = await createRentalBooking({
      ...bookingInput,
      drivingLicenceNumber: bookingInput.drivingLicenceNumber?.trim() || undefined,
      licencePhotoUrl: bookingInput.licencePhotoUrl?.trim() || undefined,
      selectedOptions: parseSelectedRentalOptions(bookingInput.selectedOptions),
      pickupAt,
      dropoffAt,
      customerDob,
    });

    const checkout = await createRentalCheckoutSession(booking.id);

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        rentalDays: booking.rentalDays,
        baseAmountCents: booking.baseAmountCents,
        extrasAmountCents: booking.extrasAmountCents,
        taxAmountCents: booking.taxAmountCents,
        totalAmountCents: booking.totalAmountCents,
        currency: booking.currency,
        checkoutUrl: checkout.checkoutUrl,
        successUrl: null,
      },
    });
  } catch (error) {
    if (error instanceof RentalUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Booking failed";
    const friendlyMessage = message.includes("Transaction API error")
      ? "Booking could not be completed due to a temporary database issue. Please try again."
      : message;
    return NextResponse.json({ success: false, error: friendlyMessage }, { status: 400 });
  }
}
