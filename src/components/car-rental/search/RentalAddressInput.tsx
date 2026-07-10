"use client";

import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_RENTAL_ADDRESS,
  RENTAL_LOCATION_OPTIONS,
  getRentalLocationSelectValue,
} from "@/lib/rentals/locations";
import { cn } from "@/lib/utils";

interface RentalAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMapClick?: () => void;
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
  const selectedValue = getRentalLocationSelectValue(value);

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
          onClick={() => {
            onChange(DEFAULT_RENTAL_ADDRESS);
            onMapClick?.();
          }}
          aria-label={`View map for ${label}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center border-r border-gray-200 text-primary transition-colors hover:bg-gray-50 hover:text-primary"
        >
          <MapPin className="h-4 w-4" />
        </button>
        <Select value={selectedValue} onValueChange={onChange}>
          <SelectTrigger
            aria-label={label}
            className="h-12 flex-1 rounded-none border-0 bg-transparent px-3.5 shadow-none focus:ring-0"
          >
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {RENTAL_LOCATION_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="mt-1.5 text-xs text-primary">{error}</p>}
    </div>
  );
}
