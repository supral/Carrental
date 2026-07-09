"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";

interface BookingSummary {
  id: string;
  vehicleName: string;
  rentalDays: number;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  pickupAt: string;
  dropoffAt: string;
  optionLines: Array<{
    type: string;
    category: "insurance" | "extra";
    label: string;
    quantity: number;
    lineTotalCents: number;
  }>;
}

export default function RentalBookingSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId && !bookingId) {
      setError("Missing booking reference.");
      setLoading(false);
      return;
    }

    const query = sessionId
      ? `session_id=${encodeURIComponent(sessionId)}`
      : `booking_id=${encodeURIComponent(bookingId!)}`;

    fetch(`/api/rentals/checkout/session?${query}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Could not verify payment");
        }
        setBooking(json.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not verify payment");
      })
      .finally(() => setLoading(false));
  }, [sessionId, bookingId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-primary/20 bg-accent p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Payment verification issue</h1>
          <p className="mt-3 text-gray-600">{error}</p>
          <Link href="/car-rental" className="mt-6 inline-block font-semibold text-primary hover:text-primary/80">
            Back to car rental
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Booking confirmed &amp; paid</h1>
        <p className="mt-3 text-gray-600">
          Your rental for <strong>{booking.vehicleName}</strong> is confirmed.
        </p>
          <div className="mt-6 rounded-xl border border-green-100 bg-white p-5 text-left text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-900">Pickup:</span>{" "}
              {format(new Date(booking.pickupAt), "dd MMM yyyy, HH:mm")}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Drop-off:</span>{" "}
              {format(new Date(booking.dropoffAt), "dd MMM yyyy, HH:mm")}
            </p>
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between gap-4">
                <span>Rental Price</span>
                <span className="font-medium">{formatPrice(booking.baseAmountCents / 100)}</span>
              </div>
              {booking.optionLines
                .filter((line) => line.category === "insurance")
                .map((line) => (
                  <div key={line.type} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span className="font-medium">+{formatPrice(line.lineTotalCents / 100)}</span>
                  </div>
                ))}
              {booking.optionLines
                .filter((line) => line.category === "extra")
                .map((line) => (
                  <div key={line.type} className="flex justify-between gap-4">
                    <span>
                      {line.label}
                      {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                    </span>
                    <span className="font-medium">+{formatPrice(line.lineTotalCents / 100)}</span>
                  </div>
                ))}
              <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
                <span>Tax</span>
                <span className="font-medium">{formatPrice(booking.taxAmountCents / 100)}</span>
              </div>
              <div className="flex justify-between gap-4 text-base font-bold text-gray-900">
                <span>Grand Total</span>
                <span className="text-primary">{formatPrice(booking.totalAmountCents / 100)}</span>
              </div>
            </div>
          </div>
        <Link
          href="/car-rental"
          className="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Back to car rental
        </Link>
      </div>
    </div>
  );
}
