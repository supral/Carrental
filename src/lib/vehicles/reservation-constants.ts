import { ListingPurpose } from "@prisma/client";

/** How long a checkout reservation holds the vehicle before auto-release. */
export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export const RESERVATION_TOKEN_HEADER = "x-reservation-token";

export const RESERVATION_CONFLICT_MESSAGE =
  "This vehicle is already being rented/purchased by another customer.";

export const RESERVATION_API_CONFLICT_MESSAGE =
  "Vehicle is already reserved by another customer.";

export type ReservationPurpose = typeof ListingPurpose.RENTAL | typeof ListingPurpose.SALE;
