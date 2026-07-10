"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Fuel, Gauge, MapPin, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { formatVehicleName } from "@/lib/vehicles/display";
import { getVehicleSidebarSpecs } from "@/lib/vehicles/vehicle-details";
import type { BookingPriceBreakdown } from "@/lib/rentals/option-catalog";
import type { RentalBookingContext } from "@/types/rental";
import type { Vehicle } from "@/types";
import { combineDateAndTime } from "@/lib/rentals/search-validation";

interface BookingSummaryProps {
  vehicle: Vehicle;
  bookingContext: RentalBookingContext;
  breakdown: BookingPriceBreakdown | null;
  loading?: boolean;
}

export default function BookingSummary({
  vehicle,
  bookingContext,
  breakdown,
  loading = false,
}: BookingSummaryProps) {
  const vehicleTitle = formatVehicleName(vehicle);
  const pickupAt = combineDateAndTime(bookingContext.pickupDate, bookingContext.pickupTime);
  const dropoffAt = combineDateAndTime(bookingContext.dropoffDate, bookingContext.dropoffTime);
  const specs = getVehicleSidebarSpecs(vehicle).slice(0, 4);

  return (
    <aside className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] lg:sticky lg:top-24">
      <div className="relative aspect-[16/10] bg-gray-100">
        <Image
          src={vehicle.image}
          alt={vehicleTitle}
          fill
          className="object-cover"
          unoptimized={vehicle.image.startsWith("/uploads/")}
        />
      </div>

      <div className="p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{vehicle.make}</p>
          <h2 className="text-xl font-bold text-gray-900">{vehicleTitle}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {vehicle.year} · {vehicle.bodyType}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 shrink-0" />
            {vehicle.transmission}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4 shrink-0" />
            {vehicle.fuelType}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0" />
            {vehicle.seats} Seats
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {vehicle.location}
          </span>
        </div>

        {specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {specs.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{spec.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-4 text-lg font-bold text-primary">
          {formatPrice(vehicle.price)}
          <span className="text-sm font-normal text-gray-500"> /day</span>
        </p>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="text-lg font-bold text-gray-900">Booking Summary</h3>

          <div className="mt-4 space-y-3 text-sm text-gray-700">
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

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">
                Vehicle Rental
                {breakdown ? ` (${breakdown.rentalDays} day${breakdown.rentalDays === 1 ? "" : "s"})` : ""}
              </span>
              <span className="font-medium text-gray-900">
                {breakdown ? formatPrice(breakdown.baseAmountCents / 100) : formatPrice(vehicle.price)}
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
        </div>
      </div>
    </aside>
  );
}
