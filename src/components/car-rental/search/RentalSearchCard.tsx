"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import RentalMapPicker from "@/components/car-rental/search/RentalMapPicker";
import RentalAddressInput from "@/components/car-rental/search/RentalAddressInput";
import RentalDateTimePicker from "@/components/car-rental/search/RentalDateTimePicker";
import { dealershipLocation } from "@/lib/site-map";
import type { RentalSearchFormValues } from "@/types/rental";

interface RentalSearchCardProps {
  values: RentalSearchFormValues;
  errors: Partial<Record<keyof RentalSearchFormValues, string>>;
  loading?: boolean;
  onChange: (field: keyof RentalSearchFormValues, value: string) => void;
  onSubmit: () => void;
}

export default function RentalSearchCard({
  values,
  errors,
  loading = false,
  onChange,
  onSubmit,
}: RentalSearchCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const [mapOpenFor, setMapOpenFor] = useState<"pickup" | "dropoff" | null>(null);

  return (
    <div className="overflow-hidden rounded-[20px] border border-gray-200/80 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5 sm:px-8">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Find &amp; book a great deal today</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter pickup and drop-off addresses, or tap the map icon to choose our Darwin location.
        </p>
      </div>

      <RentalMapPicker
        open={mapOpenFor !== null}
        onOpenChange={(open) => {
          if (!open) setMapOpenFor(null);
        }}
        fieldLabel={mapOpenFor === "pickup" ? "pickup address" : "drop-off address"}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-8 px-6 py-8 sm:px-8"
      >
        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">Pickup</h3>
          <div className="space-y-4">
            <RentalAddressInput
              label="Pickup Address"
              value={values.pickupAddress}
              onChange={(v) => onChange("pickupAddress", v)}
              onMapClick={() => {
                onChange("pickupAddress", dealershipLocation.address);
                setMapOpenFor("pickup");
              }}
              error={errors.pickupAddress}
              required
            />
            <RentalDateTimePicker
              label="Pickup date & time *"
              dateValue={values.pickupDate}
              timeValue={values.pickupTime}
              dateError={errors.pickupDate}
              timeError={errors.pickupTime}
              minDate={today}
              onDateChange={(v) => onChange("pickupDate", v)}
              onTimeChange={(v) => onChange("pickupTime", v)}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">Drop-off</h3>
          <div className="space-y-4">
            <RentalAddressInput
              label="Drop-off Address"
              value={values.dropoffAddress}
              onChange={(v) => onChange("dropoffAddress", v)}
              onMapClick={() => {
                onChange("dropoffAddress", dealershipLocation.address);
                setMapOpenFor("dropoff");
              }}
              error={errors.dropoffAddress}
              required
            />
            <RentalDateTimePicker
              label="Drop-off date & time *"
              dateValue={values.dropoffDate}
              timeValue={values.dropoffTime}
              dateError={errors.dropoffDate}
              timeError={errors.dropoffTime}
              minDate={values.pickupDate || today}
              minTime={
                values.dropoffDate && values.dropoffDate === values.pickupDate
                  ? values.pickupTime
                  : undefined
              }
              onDateChange={(v) => onChange("dropoffDate", v)}
              onTimeChange={(v) => onChange("dropoffTime", v)}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-5 w-5" />
          {loading ? "Searching available cars..." : "Search Available Cars"}
        </button>
      </form>
    </div>
  );
}
