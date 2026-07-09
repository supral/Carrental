import { SaleBookingStatus } from "@prisma/client";
import { format } from "date-fns";

export const SALE_BOOKING_STATUS_STEPS = [
  {
    status: SaleBookingStatus.PENDING,
    label: "Request submitted",
    description: "We've received your purchase request and notified our team.",
  },
  {
    status: SaleBookingStatus.ACCEPTED,
    label: "Request accepted",
    description: "Our team has accepted your request and will arrange a viewing with you.",
  },
  {
    status: SaleBookingStatus.MEETING_SCHEDULED,
    label: "Viewing scheduled",
    description: "A meeting has been arranged to view the vehicle.",
  },
  {
    status: SaleBookingStatus.DEAL_FINALIZED,
    label: "Deal finalized",
    description: "You've agreed on the purchase terms and price.",
  },
  {
    status: SaleBookingStatus.PAID,
    label: "Payment received",
    description: "Payment has been confirmed.",
  },
  {
    status: SaleBookingStatus.COMPLETED,
    label: "Car provided",
    description: "Your vehicle has been handed over. Enjoy your new car!",
  },
] as const;

const STATUS_ORDER: SaleBookingStatus[] = [
  SaleBookingStatus.PENDING,
  SaleBookingStatus.ACCEPTED,
  SaleBookingStatus.MEETING_SCHEDULED,
  SaleBookingStatus.DEAL_FINALIZED,
  SaleBookingStatus.PAID,
  SaleBookingStatus.COMPLETED,
];

export function getSaleBookingStepIndex(status: SaleBookingStatus): number {
  if (status === SaleBookingStatus.CANCELLED) return -1;
  return STATUS_ORDER.indexOf(status);
}

export function formatSaleBookingStatus(status: SaleBookingStatus): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSaleBookingStatusUrl(bookingId: string, email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    id: bookingId,
    email,
  });
  return `${base.replace(/\/$/, "")}/vehicles/booking/status?${params.toString()}`;
}

export function formatPreferredContactTime(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Any time";
}

export function suggestMeetingDateTimeFromPreferredTime(
  preferredContactTime: string | null | undefined,
  referenceDate: Date = new Date()
): string {
  const label = formatPreferredContactTime(preferredContactTime);
  let hours = 10;
  let minutes = 0;

  if (label.includes("Morning")) {
    hours = 10;
    minutes = 0;
  } else if (label.includes("Afternoon")) {
    hours = 14;
    minutes = 30;
  } else if (label.includes("Evening")) {
    hours = 18;
    minutes = 0;
  }

  const suggested = new Date(referenceDate);
  suggested.setDate(suggested.getDate() + 1);

  const day = suggested.getDay();
  if (day === 0) suggested.setDate(suggested.getDate() + 1);
  if (day === 6) suggested.setDate(suggested.getDate() + 2);

  suggested.setHours(hours, minutes, 0, 0);
  return format(suggested, "yyyy-MM-dd'T'HH:mm");
}

export function buildDefaultMeetingNotes(
  preferredContactTime: string | null | undefined,
  existingNotes?: string | null
): string {
  if (existingNotes?.trim()) return existingNotes;
  return `Buyer preferred contact time: ${formatPreferredContactTime(preferredContactTime)}`;
}

export function isViewingTimePassed(
  status: SaleBookingStatus | string,
  meetingScheduledAt: Date | string | null | undefined,
  now = new Date()
) {
  return (
    status === SaleBookingStatus.MEETING_SCHEDULED &&
    meetingScheduledAt != null &&
    new Date(meetingScheduledAt) < now
  );
}
