"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import {
  RENTAL_BOOKING_STATUS_STEPS,
  getRentalBookingDisplayStatus,
  getRentalCurrentStepIndex,
  getRentalDisplayStatusBadgeClass,
} from "@/lib/rentals/rental-booking-status";
import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface RentalStatus {
  id: string;
  status: RentalBookingStatus;
  paymentStatus: RentalPaymentStatus;
  customerName: string;
  vehicleId: string;
  vehicleName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
  dropoffAt: string;
  rentalDays: number;
  totalAmountCents: number;
  createdAt: string;
  paidAt: string | null;
}

export default function RentalBookingStatusClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const email = searchParams.get("email");

  const [booking, setBooking] = useState<RentalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !email) {
      setError("Missing booking reference or email.");
      setLoading(false);
      return;
    }

    fetch(`/api/rentals/bookings/${encodeURIComponent(bookingId)}/status?email=${encodeURIComponent(email)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load status");
        setBooking(json.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load status");
      })
      .finally(() => setLoading(false));
  }, [bookingId, email]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">
        Loading your rental status...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-primary/20 bg-accent p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Status not found</h1>
          <p className="mt-3 text-gray-600">{error}</p>
          <Link href="/my-bookings" className="mt-6 inline-block font-semibold text-primary hover:text-primary/80">
            Search my bookings
          </Link>
        </div>
      </div>
    );
  }

  const trip = { pickupAt: booking.pickupAt, dropoffAt: booking.dropoffAt };
  const currentStep = getRentalCurrentStepIndex(
    booking.status,
    booking.paymentStatus,
    trip
  );
  const isCancelled = booking.status === RentalBookingStatus.CANCELLED;
  const displayStatus = getRentalBookingDisplayStatus({
    status: booking.status,
    ...trip,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <p className="text-sm font-medium text-primary">Car rental</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{booking.vehicleName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reference: <span className="font-mono text-gray-700">{booking.id}</span>
        </p>

        {isCancelled ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
            This rental booking has been <strong>cancelled</strong>.
          </div>
        ) : (
          <ol className="mt-8 space-y-0">
            {RENTAL_BOOKING_STATUS_STEPS.map((step, index) => {
              const isComplete = step.isComplete(
                booking.status,
                booking.paymentStatus,
                trip
              );
              const isCurrent = currentStep === index;
              const isLast = index === RENTAL_BOOKING_STATUS_STEPS.length - 1;

              return (
                <li key={step.label} className="relative flex gap-4 pb-8 last:pb-0">
                  {!isLast && (
                    <span
                      className={cn(
                        "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5",
                        isComplete && index < currentStep ? "bg-primary" : "bg-gray-200"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                      isComplete
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    )}
                  >
                    {isComplete ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p
                      className={cn(
                        "font-semibold",
                        isCurrent ? "text-primary" : isComplete ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                          Current
                        </span>
                      )}
                    </p>
                    <p className={cn("mt-1 text-sm", isComplete ? "text-gray-600" : "text-gray-400")}>
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            <span className="font-semibold text-gray-900">Status:</span>{" "}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                getRentalDisplayStatusBadgeClass(displayStatus)
              )}
            >
              {displayStatus}
            </span>
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Pickup:</span>{" "}
            {format(new Date(booking.pickupAt), "dd MMM yyyy, HH:mm")} — {booking.pickupAddress}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Drop-off:</span>{" "}
            {format(new Date(booking.dropoffAt), "dd MMM yyyy, HH:mm")} — {booking.dropoffAddress}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Total:</span>{" "}
            {formatPrice(booking.totalAmountCents / 100)}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/my-bookings?email=${encodeURIComponent(email!)}`}
            className="inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            All my bookings
          </Link>
          <Link href="/car-rental" className="inline-flex text-sm font-semibold text-primary hover:text-primary/80 py-2.5">
            Browse rentals
          </Link>
        </div>
      </div>
    </div>
  );
}
