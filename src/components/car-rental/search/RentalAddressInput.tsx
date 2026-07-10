"use client";

import { MapPin } from "lucide-react";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import { cn } from "@/lib/utils";

interface RentalAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMapClick: () => void;
  error?: string;
  required?: boolean;
}

export default function RentalAddressInput({
  label,
  value,
  onChange,
  onMapClick,
  error,
  required,
}: RentalAddressInputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <div
        className={cn(
          "flex items-center overflow-hidden rounded-xl border bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-destructive" : "border-gray-300"
        )}
      >
        <button
          type="button"
          onClick={onMapClick}
          aria-label={`Open map for ${label}`}
          className="flex h-[46px] w-12 shrink-0 items-center justify-center border-r border-gray-200 text-primary transition-colors hover:bg-gray-50 hover:text-primary"
        >
          <MapPin className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={DEFAULT_RENTAL_ADDRESS}
          required={required}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-4 text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-primary">{error}</p>}
    </div>
  );
}
