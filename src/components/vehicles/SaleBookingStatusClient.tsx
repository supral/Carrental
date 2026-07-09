"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import {
  SALE_BOOKING_STATUS_STEPS,
  formatSaleBookingStatus,
  getSaleBookingStepIndex,
} from "@/lib/sales/sale-booking-status";
import { SaleBookingStatus } from "@prisma/client";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";
import { cn } from "@/lib/utils";

interface BookingStatus {
  id: string;
  status: SaleBookingStatus;
  paymentStatus: string;
  customerName: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePrice: number;
  agreedPriceCents: number | null;
  meetingScheduledAt: string | null;
  meetingLocation: string | null;
  meetingNotes: string | null;
  dealerName: string;
  dealerPhone: string;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
}

export default function SaleBookingStatusClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const email = searchParams.get("email");

  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !email) {
      setError("Missing booking reference or email.");
      setLoading(false);
      return;
    }

    fetch(`/api/sales/bookings/${encodeURIComponent(bookingId)}/status?email=${encodeURIComponent(email)}`)
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
        Loading your request status...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Status not found</h1>
          <p className="mt-3 text-gray-600">{error}</p>
          <Link href="/my-bookings" className="mt-6 inline-block font-semibold text-red-600 hover:text-red-700">
            Search my bookings
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getSaleBookingStepIndex(booking.status);
  const isCancelled = booking.status === SaleBookingStatus.CANCELLED;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <p className="text-sm font-medium text-red-600">Purchase request</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{booking.vehicleName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reference: <span className="font-mono text-gray-700">{booking.id}</span>
        </p>

        {isCancelled ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
            This request has been <strong>cancelled</strong>. Contact us if you have questions.
          </div>
        ) : (
          <ol className="mt-8 space-y-0">
            {SALE_BOOKING_STATUS_STEPS.map((step, index) => {
              const isComplete = currentStep >= index;
              const isCurrent = currentStep === index;
              const isLast = index === SALE_BOOKING_STATUS_STEPS.length - 1;

              return (
                <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
                  {!isLast && (
                    <span
                      className={cn(
                        "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5",
                        isComplete && index < currentStep ? "bg-red-600" : "bg-gray-200"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                      isComplete
                        ? "border-red-600 bg-red-600 text-white"
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
                        isCurrent ? "text-red-600" : isComplete ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Current
                        </span>
                      )}
                    </p>
                    <p className={cn("mt-1 text-sm", isComplete ? "text-gray-600" : "text-gray-400")}>
                      {step.description}
                    </p>

                    {step.status === SaleBookingStatus.MEETING_SCHEDULED &&
                      booking.meetingScheduledAt &&
                      currentStep >= index && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                          <p>
                            <strong>When:</strong>{" "}
                            {format(new Date(booking.meetingScheduledAt), "EEEE, d MMMM yyyy 'at' h:mm a")}
                          </p>
                          {booking.meetingLocation && (
                            <p className="mt-1">
                              <strong>Where:</strong> {booking.meetingLocation}
                            </p>
                          )}
                          {booking.meetingNotes && (
                            <p className="mt-1">
                              <strong>Notes:</strong> {booking.meetingNotes}
                            </p>
                          )}
                        </div>
                      )}

                    {step.status === SaleBookingStatus.DEAL_FINALIZED &&
                      booking.agreedPriceCents != null &&
                      currentStep >= index && (
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          Agreed price: {formatPrice(booking.agreedPriceCents / 100)}
                        </p>
                      )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            <span className="font-semibold text-gray-900">Status:</span>{" "}
            {formatSaleBookingStatus(booking.status)}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Listed price:</span>{" "}
            {formatPrice(booking.vehiclePrice)}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Submitted:</span>{" "}
            {format(new Date(booking.createdAt), "dd MMM yyyy, h:mm a")}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-gray-900">Contact:</span> {booking.dealerName} —{" "}
            <ContactPhoneTrigger
              phone={booking.dealerPhone}
              className="text-red-600 hover:text-red-700"
            >
              {booking.dealerPhone}
            </ContactPhoneTrigger>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {email && (
            <Link
              href={`/my-bookings?email=${encodeURIComponent(email)}`}
              className="inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              All my bookings
            </Link>
          )}
          <Link
            href={`/vehicles/${booking.vehicleId}`}
            className="inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            View vehicle
          </Link>
          <Link href="/vehicles" className="inline-flex text-sm font-semibold text-red-600 hover:text-red-700 py-2.5">
            Browse more cars
          </Link>
        </div>
      </div>
    </div>
  );
}
