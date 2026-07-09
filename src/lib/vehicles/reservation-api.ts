import { ListingPurpose } from "@prisma/client";
import { getOrCreateReservationToken } from "@/lib/vehicles/reservation-token";
import {
  RESERVATION_CONFLICT_MESSAGE,
  RESERVATION_TOKEN_HEADER,
} from "@/lib/vehicles/reservation-constants";

export type ReserveVehiclePurpose = typeof ListingPurpose.RENTAL | typeof ListingPurpose.SALE;

export async function reserveVehicleForCheckout(
  vehicleId: string,
  purpose: ReserveVehiclePurpose
) {
  const reservationToken = getOrCreateReservationToken();

  const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [RESERVATION_TOKEN_HEADER]: reservationToken,
    },
    body: JSON.stringify({ purpose }),
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 409) {
    throw new Error(json.message || RESERVATION_CONFLICT_MESSAGE);
  }

  if (!res.ok) {
    throw new Error(json.message || json.error || "Could not reserve vehicle");
  }

  return {
    reservationToken,
    expiresAt: json.data?.reservationExpiresAt as string | undefined,
  };
}

export async function releaseVehicleCheckout(vehicleId: string) {
  const reservationToken = getOrCreateReservationToken();

  await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}/release`, {
    method: "POST",
    headers: {
      [RESERVATION_TOKEN_HEADER]: reservationToken,
    },
  }).catch(() => undefined);
}

export function reservationAuthHeaders(): Record<string, string> {
  return {
    [RESERVATION_TOKEN_HEADER]: getOrCreateReservationToken(),
  };
}
