"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatOptionPriceLabel } from "@/lib/rentals/option-catalog";
import type { VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";

interface ExtraCardProps {
  option: VehicleRentalOptionConfig;
  label: string;
  supportsQuantity: boolean;
  selected: boolean;
  quantity: number;
  maxQuantity: number;
  onToggle: (selected: boolean) => void;
  onQuantityChange: (quantity: number) => void;
}

export default function ExtraCard({
  option,
  label,
  supportsQuantity,
  selected,
  quantity,
  maxQuantity,
  onToggle,
  onQuantityChange,
}: ExtraCardProps) {
  const description = option.description ?? "";
  const priceLabel =
    option.price != null && option.priceType
      ? formatOptionPriceLabel(option.price, option.priceType)
      : "";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all",
        selected ? "border-primary bg-accent/40 shadow-sm" : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-sm text-gray-600">Need {label}?</p>
          {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
          {priceLabel && (
            <p className="mt-3 text-sm font-semibold text-primary">+{priceLabel}</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={selected}
          onClick={() => onToggle(!selected)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
            selected ? "bg-primary" : "bg-gray-300"
          )}
        >
          <span
            className={cn(
              "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
              selected ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {selected && supportsQuantity && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className="text-sm font-medium text-gray-700">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
