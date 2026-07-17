import type { RentalSearchRequest, RentalSearchResponse } from "@/types/rental";

export interface RentalBookingResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    paymentStatus: string;
    rentalDays: number;
    totalAmountCents: number;
    currency: string;
    checkoutUrl: string | null;
    successUrl: string | null;
  };
}

export async function searchAvailableRentals(
  request: RentalSearchRequest,
  options?: { page?: number; limit?: number }
): Promise<RentalSearchResponse> {
  const res = await fetch("/api/rentals/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, page: options?.page, limit: options?.limit }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Failed to search available cars");
  }

  return json as RentalSearchResponse;
}

export async function createRentalBookingRequest(payload: {
  vehicleId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerZip?: string;
  customerDob: string;
  customerCountry: string;
  drivingLicenceNumber?: string;
  licencePhotoUrl?: string;
  notes?: string;
  selectedOptions?: Array<{ type: string; quantity: number }>;
}): Promise<RentalBookingResponse> {
  const res = await fetch("/api/rentals/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to submit booking");
  }

  return json as RentalBookingResponse;
}

export async function fetchRentalVehicleAvailability(
  vehicleId: string,
  pickupDateTime: string,
  dropoffDateTime: string
): Promise<{
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}> {
  const params = new URLSearchParams({ pickupDateTime, dropoffDateTime });
  const res = await fetch(`/api/rentals/vehicles/${vehicleId}/availability?${params}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Could not check availability");
  }
  return json.data;
}
