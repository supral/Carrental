import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import {
  getWorkflowDisplayStatus,
  WORKFLOW_STATUS_BADGE_CLASS,
  type WorkflowDisplayStatus,
} from "@/lib/rentals/rental-workflow";

export type RentalBookingStatusLabel = "Confirmed" | "Pending" | "Cancelled";

export type RentalLifecycleStatus = "Scheduled" | "Ongoing" | "Completed" | "Cancelled";

/** Status shown in UI badges and lists. */
export type RentalDisplayStatus = WorkflowDisplayStatus | "Scheduled" | "Ongoing";

export type RentalBookingStatusInput = {
  status: RentalBookingStatus | string;
  pickupAt: Date | string;
  dropoffAt: Date | string;
};

export type RentalBookingStatusResult = {
  bookingStatus: RentalBookingStatusLabel;
  lifecycleStatus: RentalLifecycleStatus;
};

const PENDING_DB_STATUSES = new Set<string>([
  RentalBookingStatus.PENDING,
  RentalBookingStatus.RESERVED,
]);

const CONFIRMED_DB_STATUSES = new Set<string>([
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
  RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
  RentalBookingStatus.READY_FOR_PICKUP,
  RentalBookingStatus.ACTIVE,
  RentalBookingStatus.RETURNED,
  RentalBookingStatus.AWAITING_PAYMENT,
  RentalBookingStatus.COMPLETED,
]);

function toTime(value: Date | string): number {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(time)) {
    throw new Error("Invalid booking date/time");
  }
  return time;
}

/** Map stored confirmation status without mutating the database. */
export function mapRentalBookingStatusLabel(
  status: RentalBookingStatus | string
): RentalBookingStatusLabel {
  if (status === RentalBookingStatus.CANCELLED || status === "CANCELLED") {
    return "Cancelled";
  }
  if (PENDING_DB_STATUSES.has(status)) {
    return "Pending";
  }
  if (CONFIRMED_DB_STATUSES.has(status)) {
    return "Confirmed";
  }
  return "Pending";
}

/**
 * Derives confirmation + lifecycle status from stored status and pickup/drop-off timestamps.
 */
export function getRentalBookingStatus(
  booking: RentalBookingStatusInput,
  now: Date = new Date()
): RentalBookingStatusResult {
  const bookingStatus = mapRentalBookingStatusLabel(booking.status);

  if (bookingStatus === "Cancelled") {
    return { bookingStatus, lifecycleStatus: "Cancelled" };
  }

  if (booking.status === RentalBookingStatus.ACTIVE) {
    return { bookingStatus, lifecycleStatus: "Ongoing" };
  }
  if (
    booking.status === RentalBookingStatus.COMPLETED ||
    booking.status === RentalBookingStatus.RETURNED ||
    booking.status === RentalBookingStatus.AWAITING_PAYMENT
  ) {
    return { bookingStatus, lifecycleStatus: "Completed" };
  }

  const nowMs = now.getTime();
  const pickupMs = toTime(booking.pickupAt);
  const dropoffMs = toTime(booking.dropoffAt);

  let lifecycleStatus: RentalLifecycleStatus;
  if (nowMs < pickupMs) {
    lifecycleStatus = "Scheduled";
  } else if (nowMs < dropoffMs) {
    lifecycleStatus = "Ongoing";
  } else {
    lifecycleStatus = "Completed";
  }

  return { bookingStatus, lifecycleStatus };
}

/** Prefer explicit workflow status labels for admin / operational UIs. */
export function getRentalBookingDisplayStatus(
  booking: RentalBookingStatusInput,
  _now: Date = new Date()
): RentalDisplayStatus {
  return getWorkflowDisplayStatus(booking.status);
}

export const RENTAL_DISPLAY_STATUS_BADGE_CLASS: Record<string, string> = {
  ...WORKFLOW_STATUS_BADGE_CLASS,
  Scheduled: "bg-blue-100 text-blue-800",
  Ongoing: "bg-green-100 text-green-800",
};

export function getRentalDisplayStatusBadgeClass(status: RentalDisplayStatus | string): string {
  return RENTAL_DISPLAY_STATUS_BADGE_CLASS[status] ?? "bg-gray-100 text-gray-700";
}

export const RENTAL_BOOKING_STATUS_STEPS = [
  {
    label: "Booking submitted",
    description: "Your rental request has been received.",
    isComplete: (
      status: RentalBookingStatus,
      _payment: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) => status !== RentalBookingStatus.CANCELLED,
  },
  {
    label: "Payment received",
    description: "Your payment has been confirmed.",
    isComplete: (
      _status: RentalBookingStatus,
      payment: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) => payment === RentalPaymentStatus.PAID,
  },
  {
    label: "Agreement completed",
    description: "Your digital rental agreement has been submitted.",
    isComplete: (
      status: RentalBookingStatus,
      _payment?: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) =>
      status === RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT ||
      status === RentalBookingStatus.READY_FOR_PICKUP ||
      status === RentalBookingStatus.ACTIVE ||
      status === RentalBookingStatus.RETURNED ||
      status === RentalBookingStatus.AWAITING_PAYMENT ||
      status === RentalBookingStatus.COMPLETED,
  },
  {
    label: "Vehicle picked up",
    description: "Your rental is active.",
    isComplete: (
      status: RentalBookingStatus,
      _payment?: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) =>
      status === RentalBookingStatus.ACTIVE ||
      status === RentalBookingStatus.RETURNED ||
      status === RentalBookingStatus.AWAITING_PAYMENT ||
      status === RentalBookingStatus.COMPLETED,
  },
  {
    label: "Rental completed",
    description: "Your rental has been closed. Thank you for choosing us.",
    isComplete: (
      status: RentalBookingStatus,
      _payment?: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) => status === RentalBookingStatus.COMPLETED,
  },
] as const;

/** @deprecated Prefer getRentalBookingDisplayStatus for UI labels. */
export function formatRentalBookingStatus(status: RentalBookingStatus | string): string {
  return getWorkflowDisplayStatus(status);
}

export function getRentalCurrentStepIndex(
  status: RentalBookingStatus,
  paymentStatus: RentalPaymentStatus,
  booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
  now: Date = new Date()
): number {
  if (status === RentalBookingStatus.CANCELLED) return -1;

  let index = 0;
  for (let i = 0; i < RENTAL_BOOKING_STATUS_STEPS.length; i++) {
    const step = RENTAL_BOOKING_STATUS_STEPS[i];
    if (step.isComplete(status, paymentStatus, booking, now)) {
      index = i;
    }
  }
  return index;
}
