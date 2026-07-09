"use client";

import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import type { BookingPriceBreakdown } from "@/lib/rentals/option-catalog";
import type { RentalBookingContext } from "@/types/rental";
import { combineDateAndTime } from "@/lib/rentals/search-validation";

interface BookingSummaryProps {
  vehicleTitle: string;
  pricePerDay: number;
  bookingContext: RentalBookingContext;
  breakdown: BookingPriceBreakdown | null;
  loading?: boolean;
}

export default function BookingSummary({
  vehicleTitle,
  pricePerDay,
  bookingContext,
  breakdown,
  loading = false,
}: BookingSummaryProps) {
  const pickupAt = combineDateAndTime(bookingContext.pickupDate, bookingContext.pickupTime);
  const dropoffAt = combineDateAndTime(bookingContext.dropoffDate, bookingContext.dropoffTime);

  return (
    <aside className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] lg:sticky lg:top-24">
      <h2 className="text-xl font-bold text-gray-900">Booking Summary</h2>
      <p className="mt-1 text-sm text-gray-600">{vehicleTitle}</p>

      <div className="mt-5 space-y-3 border-b border-gray-100 pb-5 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">Pickup</p>
          <p className="mt-1">{bookingContext.pickupAddress}</p>
          <p className="text-gray-500">{format(pickupAt, "dd MMM yyyy, HH:mm")}</p>
        </div>
        <div>
          <p className="font-medium text-gray-900">Drop-off</p>
          <p className="mt-1">{bookingContext.dropoffAddress}</p>
          <p className="text-gray-500">{format(dropoffAt, "dd MMM yyyy, HH:mm")}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">
            Vehicle Rental
            {breakdown ? ` (${breakdown.rentalDays} day${breakdown.rentalDays === 1 ? "" : "s"})` : ""}
          </span>
          <span className="font-medium text-gray-900">
            {breakdown ? formatPrice(breakdown.baseAmountCents / 100) : formatPrice(pricePerDay)}
          </span>
        </div>

        {breakdown?.optionLines.map((line) => (
          <div key={line.type} className="flex items-start justify-between gap-4">
            <span className="text-gray-600">
              {line.label}
              {line.quantity > 1 ? ` ×${line.quantity}` : ""}
            </span>
            <span className="font-medium text-gray-900">+{formatPrice(line.lineTotalCents / 100)}</span>
          </div>
        ))}

        {loading && <p className="text-xs text-gray-500">Updating price...</p>}

        {breakdown && (
          <>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatPrice(breakdown.subtotalCents / 100)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">{formatPrice(breakdown.taxAmountCents / 100)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 text-base">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-primary">{formatPrice(breakdown.totalAmountCents / 100)}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
