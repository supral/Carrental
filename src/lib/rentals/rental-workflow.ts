import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";

export type WorkflowDisplayStatus =
  | "Pending"
  | "Confirmed"
  | "Waiting for Customer Form"
  | "Waiting for Vehicle Assignment"
  | "Ready For Pickup"
  | "Active Rental"
  | "Returned"
  | "Awaiting Payment"
  | "Completed"
  | "Cancelled";

const LABEL_BY_STATUS: Record<string, WorkflowDisplayStatus> = {
  [RentalBookingStatus.PENDING]: "Pending",
  [RentalBookingStatus.RESERVED]: "Pending",
  [RentalBookingStatus.CONFIRMED]: "Confirmed",
  [RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM]: "Waiting for Customer Form",
  [RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT]: "Waiting for Vehicle Assignment",
  [RentalBookingStatus.READY_FOR_PICKUP]: "Ready For Pickup",
  [RentalBookingStatus.ACTIVE]: "Active Rental",
  [RentalBookingStatus.RETURNED]: "Returned",
  [RentalBookingStatus.AWAITING_PAYMENT]: "Awaiting Payment",
  [RentalBookingStatus.COMPLETED]: "Completed",
  [RentalBookingStatus.CANCELLED]: "Cancelled",
};

export function getWorkflowDisplayStatus(
  status: RentalBookingStatus | string
): WorkflowDisplayStatus {
  return LABEL_BY_STATUS[status] ?? "Pending";
}

export const WORKFLOW_STATUS_BADGE_CLASS: Record<WorkflowDisplayStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-blue-100 text-blue-800",
  "Waiting for Customer Form": "bg-amber-100 text-amber-900",
  "Waiting for Vehicle Assignment": "bg-orange-100 text-orange-900",
  "Ready For Pickup": "bg-sky-100 text-sky-900",
  "Active Rental": "bg-emerald-100 text-emerald-900",
  Returned: "bg-violet-100 text-violet-900",
  "Awaiting Payment": "bg-rose-100 text-rose-900",
  Completed: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-800",
};

/** Statuses that occupy fleet capacity for overlapping dates. */
export const WORKFLOW_BLOCKING_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.PENDING,
  RentalBookingStatus.RESERVED,
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
  RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
  RentalBookingStatus.READY_FOR_PICKUP,
  RentalBookingStatus.ACTIVE,
];

/** Hold inventory when entering these (excluding PENDING which has its own TTL rules). */
export const WORKFLOW_INVENTORY_CONSUMING_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.RESERVED,
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
  RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
  RentalBookingStatus.READY_FOR_PICKUP,
  RentalBookingStatus.ACTIVE,
];

export const WORKFLOW_INVENTORY_RELEASING_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.CANCELLED,
  RentalBookingStatus.COMPLETED,
  RentalBookingStatus.RETURNED,
  RentalBookingStatus.AWAITING_PAYMENT,
];

export function isPostConfirmationStatus(status: RentalBookingStatus | string): boolean {
  return (
    status !== RentalBookingStatus.PENDING &&
    status !== RentalBookingStatus.RESERVED &&
    status !== RentalBookingStatus.CANCELLED
  );
}

export function settlementPaymentCleared(
  paymentStatus: RentalPaymentStatus | string,
  outstandingBalanceCents: number
): boolean {
  if (outstandingBalanceCents <= 0) return true;
  return (
    paymentStatus === RentalPaymentStatus.PAID ||
    paymentStatus === "PAID"
  );
}

export const RENTAL_WORKFLOW_TIMELINE = [
  { status: RentalBookingStatus.PENDING, label: "Booking created" },
  { status: RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM, label: "Agreement requested" },
  { status: RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT, label: "Customer form completed" },
  { status: RentalBookingStatus.READY_FOR_PICKUP, label: "Vehicle assigned" },
  { status: RentalBookingStatus.ACTIVE, label: "Vehicle picked up" },
  { status: RentalBookingStatus.RETURNED, label: "Vehicle returned" },
  { status: RentalBookingStatus.AWAITING_PAYMENT, label: "Awaiting payment" },
  { status: RentalBookingStatus.COMPLETED, label: "Rental closed" },
] as const;

export function getWorkflowTimelineIndex(status: RentalBookingStatus | string): number {
  if (status === RentalBookingStatus.CANCELLED) return -1;
  if (status === RentalBookingStatus.CONFIRMED) return 1;
  const idx = RENTAL_WORKFLOW_TIMELINE.findIndex((step) => step.status === status);
  if (idx >= 0) return idx;
  if (status === RentalBookingStatus.RESERVED) return 0;
  return 0;
}
