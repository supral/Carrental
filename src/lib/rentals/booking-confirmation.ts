import { RentalPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";
import { formatVehicleName } from "@/lib/vehicles/display";

export type RentalBookingConfirmation = {
  id: string;
  status: string;
  paymentStatus: string;
  rentalDays: number;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  optionLines: ReturnType<typeof parsePricedRentalOptionLines>;
  currency: string;
  pickupAt: string;
  dropoffAt: string;
  vehicleName: string;
};

type BookingWithVehicle = {
  id: string;
  status: string;
  paymentStatus: RentalPaymentStatus;
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
};

export function formatRentalBookingConfirmation(
  booking: BookingWithVehicle
): RentalBookingConfirmation {
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

const bookingInclude = {
  vehicle: {
    select: {
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
    },
  },
} as const;

export async function loadRentalBookingConfirmation(bookingId: string): Promise<{
  data?: RentalBookingConfirmation;
  error?: string;
}> {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.paymentStatus !== RentalPaymentStatus.PAID) {
    return { error: "Payment not completed" };
  }

  return { data: formatRentalBookingConfirmation(booking) };
}
