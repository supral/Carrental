"use client";

import { ExternalLink } from "lucide-react";
import SiteMapEmbed from "@/components/shared/SiteMapEmbed";
import { dealershipLocation, getSiteMapDirectionsUrl } from "@/lib/site-map";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import { cn } from "@/lib/utils";

interface RentalDealershipMapProps {
  pickupAddress: string;
  dropoffAddress: string;
  onSelectPickup: () => void;
  onSelectDropoff: () => void;
}

export default function RentalDealershipMap({
  pickupAddress,
  dropoffAddress,
  onSelectPickup,
  onSelectDropoff,
}: RentalDealershipMapProps) {
  const pickupSelected = pickupAddress.trim() === DEFAULT_RENTAL_ADDRESS;
  const dropoffSelected = dropoffAddress.trim() === DEFAULT_RENTAL_ADDRESS;

  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">Our location</p>
        <p className="mt-1 text-sm text-gray-600">{dealershipLocation.address}</p>
        <p className="mt-1 text-xs text-gray-500">Same map as on our homepage — use it for pickup and/or drop-off.</p>
      </div>

      <SiteMapEmbed heightClassName="h-52 sm:h-60" />

      <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectPickup}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
              pickupSelected
                ? "bg-primary text-white shadow-sm"
                : "border border-gray-300 bg-white text-gray-700 hover:border-primary/40 hover:text-primary"
            )}
          >
            Use for Pickup
          </button>
          <button
            type="button"
            onClick={onSelectDropoff}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
              dropoffSelected
                ? "bg-primary text-white shadow-sm"
                : "border border-gray-300 bg-white text-gray-700 hover:border-primary/40 hover:text-primary"
            )}
          >
            Use for Drop-off
          </button>
        </div>
        <a
          href={getSiteMapDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
