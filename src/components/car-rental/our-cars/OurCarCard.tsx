"use client";

import Image from "next/image";
import { Briefcase, Cog, Snowflake, Users } from "lucide-react";
import type { Vehicle } from "@/types";
import {
  formatRentalStartingPrice,
  getOurCarImage,
  getRentalCarCategory,
  getRentalCarTitle,
  getRentalLuggageCount,
} from "@/lib/rentals/our-cars-display";
import { cn } from "@/lib/utils";

interface OurCarCardProps {
  vehicle: Vehicle;
  onContinue: (vehicle: Vehicle) => void;
  className?: string;
  priority?: boolean;
}

export default function OurCarCard({ vehicle, onContinue, className, priority = false }: OurCarCardProps) {
  const title = getRentalCarTitle(vehicle);
  const category = getRentalCarCategory(vehicle);
  const luggage = getRentalLuggageCount(vehicle);
  const imageSrc = getOurCarImage(vehicle);
  const transmissionLabel =
    vehicle.transmission === "Automatic" ? "Automatic Transmission" : "Manual Transmission";

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-white">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-contain p-4"
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col border-t border-gray-100 px-5 pb-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{category}</p>
        <h3 className="mt-1 min-h-[3rem] text-base font-bold leading-snug text-gray-900">{title}</h3>

        <div className="mt-3 flex items-end justify-end">
          <p className="text-right text-sm text-gray-600">
            Starting from{" "}
            <span className="text-lg font-bold text-gray-900">{formatRentalStartingPrice(vehicle.price)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onContinue(vehicle)}
          className="mt-4 w-full rounded-sm bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:opacity-90"
        >
          Continue
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 px-5 py-4 text-[11px] text-gray-500 sm:grid-cols-4">
        <span className="flex items-center gap-1.5">
          <Snowflake className="h-3.5 w-3.5 shrink-0" />
          A/C
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {vehicle.seats} passengers
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          {luggage} luggage
        </span>
        <span className="flex items-center gap-1.5">
          <Cog className="h-3.5 w-3.5 shrink-0" />
          {transmissionLabel}
        </span>
      </div>
    </article>
  );
}
