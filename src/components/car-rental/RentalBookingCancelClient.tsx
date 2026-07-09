"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function RentalBookingCancelClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const [message, setMessage] = useState("Your payment was cancelled.");

  useEffect(() => {
    if (!bookingId) return;

    fetch(`/api/rentals/bookings/${bookingId}/cancel`, { method: "POST" }).catch(() => {
      setMessage("Your payment was cancelled. If you need help, please contact us.");
    });
  }, [bookingId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mt-3 text-gray-600">{message}</p>
        <p className="mt-2 text-sm text-gray-500">No charge was made. You can search again and complete your booking when ready.</p>
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
