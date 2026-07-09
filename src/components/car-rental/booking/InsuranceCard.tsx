"use client";

import { cn } from "@/lib/utils";
import { formatOptionPriceLabel } from "@/lib/rentals/option-catalog";
import type { VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";

interface InsuranceCardProps {
  option: VehicleRentalOptionConfig;
  label: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

export default function InsuranceCard({ option, label, selected, onToggle }: InsuranceCardProps) {
  const description = option.description ?? "";
  const priceLabel =
    option.price != null && option.priceType
      ? formatOptionPriceLabel(option.price, option.priceType)
      : "";

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-4 rounded-2xl border p-5 transition-all",
        selected
          ? "border-primary bg-accent/60 shadow-sm ring-2 ring-primary/15"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold text-gray-900">{label}</p>
          {priceLabel && (
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              +{priceLabel}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
      </div>
    </label>
  );
}
