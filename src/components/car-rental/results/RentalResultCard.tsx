"use client";

import Image from "next/image";
import Link from "next/link";
import { Fuel, Gauge, MapPin, Star, Users } from "lucide-react";
import type { RentalBookingContext, RentalVehicleResult } from "@/types/rental";
import { formatPrice } from "@/lib/utils";
import { formatVehicleName } from "@/lib/vehicles/display";
import { buildRentalDetailUrl } from "@/lib/rentals/filter-utils";
import { formatRentalAvailabilityWindow } from "@/lib/rentals/availability-window";

interface RentalResultCardProps {
  vehicle: RentalVehicleResult;
  searchContext: RentalBookingContext;
}

export default function RentalResultCard({ vehicle, searchContext }: RentalResultCardProps) {
  const detailsUrl = buildRentalDetailUrl(vehicle.id, searchContext, "details");
  const rentUrl = buildRentalDetailUrl(vehicle.id, searchContext, "rent");
  const availabilityWindow = formatRentalAvailabilityWindow(vehicle.rentalAvailableFrom);

  return (
    <article className="group overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[16/10] bg-gray-100">
        <Image
          src={vehicle.image}
          alt={formatVehicleName(vehicle)}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={vehicle.image.startsWith("/uploads/")}
        />
        {vehicle.availableUnits <= 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold text-white shadow">
            Fully Booked
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{vehicle.make}</p>
            <h3 className="text-lg font-bold text-gray-900">{vehicle.model}</h3>
            <p className="text-sm text-gray-600">{vehicle.year} · {vehicle.bodyType}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {vehicle.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> {vehicle.transmission}</span>
          <span className="flex items-center gap-1.5"><Fuel className="h-4 w-4" /> {vehicle.fuelType}</span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {vehicle.seats} Seats</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {vehicle.location}</span>
        </div>

        {availabilityWindow && (
          <p className="mt-3 text-xs text-gray-500">Listed for rent: {availabilityWindow}</p>
        )}

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-2xl font-bold text-primary">{formatPrice(vehicle.price)}</p>
            <p className="text-xs text-gray-500">per day</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={detailsUrl}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400"
            >
              View Details
            </Link>
            <Link
              href={rentUrl}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                vehicle.availableUnits > 0
                  ? "bg-primary hover:opacity-90"
                  : "pointer-events-none bg-gray-400"
              }`}
            >
              {vehicle.availableUnits > 0 ? "Rent Now" : "Fully Booked"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
