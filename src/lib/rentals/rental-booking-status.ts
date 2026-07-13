import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";

export type RentalBookingStatusLabel = "Confirmed" | "Pending" | "Cancelled";

export type RentalLifecycleStatus = "Scheduled" | "Ongoing" | "Completed" | "Cancelled";

/** Status shown in UI badges and lists. */
export type RentalDisplayStatus =
  | "Pending"
  | "Scheduled"
  | "Ongoing"
  | "Completed"
  | "Cancelled";

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
  RentalBookingStatus.ACTIVE,
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
 * Compares full date+time instants (server `now` when called on the server).
 */
export function getRentalBookingStatus(
  booking: RentalBookingStatusInput,
  now: Date = new Date()
): RentalBookingStatusResult {
  const bookingStatus = mapRentalBookingStatusLabel(booking.status);

  if (bookingStatus === "Cancelled") {
    return { bookingStatus, lifecycleStatus: "Cancelled" };
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

/**
 * Status to show in tables and badges:
 * Cancelled → Cancelled; unconfirmed → Pending; otherwise lifecycle (Scheduled/Ongoing/Completed).
 */
export function getRentalBookingDisplayStatus(
  booking: RentalBookingStatusInput,
  now: Date = new Date()
): RentalDisplayStatus {
  const { bookingStatus, lifecycleStatus } = getRentalBookingStatus(booking, now);
  if (lifecycleStatus === "Cancelled") return "Cancelled";
  if (bookingStatus === "Pending") return "Pending";
  return lifecycleStatus;
}

export const RENTAL_DISPLAY_STATUS_BADGE_CLASS: Record<RentalDisplayStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Ongoing: "bg-green-100 text-green-800",
  Completed: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-800",
};

export function getRentalDisplayStatusBadgeClass(status: RentalDisplayStatus): string {
  return RENTAL_DISPLAY_STATUS_BADGE_CLASS[status];
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
    label: "Rental confirmed",
    description: "Your rental is confirmed and ready for pickup.",
    isComplete: (
      status: RentalBookingStatus,
      _payment?: RentalPaymentStatus,
      _booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      _now?: Date
    ) =>
      status === RentalBookingStatus.CONFIRMED ||
      status === RentalBookingStatus.ACTIVE ||
      status === RentalBookingStatus.COMPLETED,
  },
  {
    label: "Rental completed",
    description: "Your rental period has ended. Thank you for choosing us.",
    isComplete: (
      status: RentalBookingStatus,
      _payment: RentalPaymentStatus,
      booking?: Pick<RentalBookingStatusInput, "pickupAt" | "dropoffAt">,
      now: Date = new Date()
    ) => {
      if (status === RentalBookingStatus.COMPLETED) return true;
      if (
        status === RentalBookingStatus.CANCELLED ||
        status === RentalBookingStatus.PENDING ||
        status === RentalBookingStatus.RESERVED
      ) {
        return false;
      }
      if (!booking) return false;
      return getRentalBookingStatus({ status, ...booking }, now).lifecycleStatus === "Completed";
    },
  },
] as const;

/** @deprecated Prefer getRentalBookingDisplayStatus for UI labels. */
export function formatRentalBookingStatus(status: RentalBookingStatus | string): string {
  return mapRentalBookingStatusLabel(status);
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
