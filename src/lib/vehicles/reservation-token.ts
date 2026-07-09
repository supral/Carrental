const STORAGE_KEY = "nb_reservation_token";

/** Browser-only token identifying the current checkout session (guest customers). */
export function getOrCreateReservationToken(): string {
  if (typeof window === "undefined") {
    throw new Error("Reservation token is only available in the browser");
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `res_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(STORAGE_KEY, token);
  return token;
}

export function getReservationTokenFromHeaders(headers: Headers): string | null {
  return headers.get("x-reservation-token")?.trim() || null;
}
