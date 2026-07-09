import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";

export const RENTAL_BOOKING_STATUS_STEPS = [
  {
    label: "Booking submitted",
    description: "Your rental request has been received.",
    isComplete: (status: RentalBookingStatus, payment: RentalPaymentStatus) =>
      status !== RentalBookingStatus.CANCELLED,
  },
  {
    label: "Payment received",
    description: "Your payment has been confirmed.",
    isComplete: (_status: RentalBookingStatus, payment: RentalPaymentStatus) =>
      payment === RentalPaymentStatus.PAID,
  },
  {
    label: "Rental confirmed",
    description: "Your rental is confirmed and ready for pickup.",
    isComplete: (status: RentalBookingStatus) =>
      status === RentalBookingStatus.CONFIRMED ||
      status === RentalBookingStatus.ACTIVE ||
      status === RentalBookingStatus.COMPLETED,
  },
  {
    label: "Rental completed",
    description: "Your rental period has ended. Thank you for choosing us.",
    isComplete: (status: RentalBookingStatus) => status === RentalBookingStatus.COMPLETED,
  },
] as const;

export function formatRentalBookingStatus(status: RentalBookingStatus): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRentalCurrentStepIndex(
  status: RentalBookingStatus,
  paymentStatus: RentalPaymentStatus
): number {
  if (status === RentalBookingStatus.CANCELLED) return -1;

  let index = 0;
  for (let i = 0; i < RENTAL_BOOKING_STATUS_STEPS.length; i++) {
    const step = RENTAL_BOOKING_STATUS_STEPS[i];
    if (step.isComplete(status, paymentStatus)) {
      index = i;
    }
  }
  return index;
}
