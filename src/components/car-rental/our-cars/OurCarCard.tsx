"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Check, Cog, Snowflake, Users } from "lucide-react";
import type { Vehicle } from "@/types";
import {
  formatRentalStartingPrice,
  getOurCarImage,
  getRentalCarCategory,
  getRentalCarTitle,
  getRentalCardFeatures,
} from "@/lib/rentals/our-cars-display";
import { cn } from "@/lib/utils";

interface OurCarCardProps {
  vehicle: Vehicle;
  onContinue: (vehicle: Vehicle) => void;
  className?: string;
  priority?: boolean;
}

function featureIcon(label: string): LucideIcon {
  const text = label.toLowerCase();
  if (/a\/?c|air\s*condition|climate/.test(text)) return Snowflake;
  if (/passenger|seat|people|person/.test(text)) return Users;
  if (/luggage|bag|suitcase|boot/.test(text)) return Briefcase;
  if (/automatic|manual|transmission|gear/.test(text)) return Cog;
  return Check;
}

export default function OurCarCard({ vehicle, onContinue, className, priority = false }: OurCarCardProps) {
  const title = getRentalCarTitle(vehicle);
  const category = getRentalCarCategory(vehicle);
  const imageSrc = getOurCarImage(vehicle);
  const features = getRentalCardFeatures(vehicle);

  return (
    <article
      className={cn(
        "flex h-full min-h-[34rem] flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[5/4] shrink-0 overflow-hidden rounded-t-xl bg-white">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-contain p-5"
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{category}</p>
        <h3 className="mt-2 min-h-[3.5rem] text-lg font-bold leading-snug text-gray-900">{title}</h3>

        <div className="mt-4 flex items-end justify-end">
          <p className="text-right text-sm text-gray-600">
            Starting from{" "}
            <span className="text-xl font-bold text-gray-900">{formatRentalStartingPrice(vehicle.price)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onContinue(vehicle)}
          className="mt-5 w-full rounded-sm bg-primary px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:opacity-90"
        >
          Continue
        </button>

        <div className="mt-5 grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-5 text-xs leading-snug text-gray-500">
          {features.map((feature) => {
            const Icon = featureIcon(feature);
            return (
              <span key={feature} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                {feature}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}
