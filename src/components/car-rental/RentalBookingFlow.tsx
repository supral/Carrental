"use client";

import { useMemo, useRef, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { uploadLicencePhoto } from "@/lib/api";
import { createRentalBookingRequest } from "@/lib/rentals/rental-api";
import { combineDateAndTime, normalizeTimeValue } from "@/lib/rentals/search-validation";
import { calculateBookingPrice } from "@/lib/rentals/price-calculator";
import {
  getEnabledVehicleOptions,
  RENTAL_OPTION_CATALOG_MAP,
  type RentalOptionCategory,
  type SelectedRentalOptionInput,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";
import { formatVehicleName } from "@/lib/vehicles/display";
import { formatPrice } from "@/lib/utils";
import type { RentalBookingContext } from "@/types/rental";
import type { Vehicle } from "@/types";
import InsuranceCard from "@/components/car-rental/booking/InsuranceCard";
import ExtraCard from "@/components/car-rental/booking/ExtraCard";
import BookingSummary from "@/components/car-rental/booking/BookingSummary";
import FleetAvailabilityPanel from "@/components/car-rental/FleetAvailabilityPanel";
import type { FleetAvailability } from "@/lib/rentals/fleet-inventory";

type SelectionState = Record<string, { selected: boolean; quantity: number }>;

function getOptionCategory(option: VehicleRentalOptionConfig): RentalOptionCategory {
  if (option.category) return option.category;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.category ?? "extra";
}

function getOptionLabel(option: VehicleRentalOptionConfig): string {
  if (option.label) return option.label;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.label ?? String(option.type);
}

function optionSupportsQuantity(option: VehicleRentalOptionConfig): boolean {
  if (option.supportsQuantity != null) return option.supportsQuantity;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.supportsQuantity ?? false;
}

function buildInitialSelections(options: VehicleRentalOptionConfig[]): SelectionState {
  const state: SelectionState = {};
  for (const option of options) {
    state[String(option.type)] = {
      selected: false,
      quantity: 1,
    };
  }
  return state;
}

function selectionsToPayload(selections: SelectionState): SelectedRentalOptionInput[] {
  return Object.entries(selections)
    .filter(([, value]) => value.selected)
    .map(([type, value]) => ({
      type,
      quantity: value.quantity,
    }));
}

interface RentalBookingFlowProps {
  vehicle: Vehicle;
  bookingContext: RentalBookingContext;
  vehicleOptions: VehicleRentalOptionConfig[];
  fleetAvailability: FleetAvailability;
}

export default function RentalBookingFlow({
  vehicle,
  bookingContext,
  vehicleOptions,
  fleetAvailability,
}: RentalBookingFlowProps) {
  const vehicleTitle = formatVehicleName(vehicle);
  const enabledOptions = useMemo(() => getEnabledVehicleOptions(vehicleOptions), [vehicleOptions]);
  const insuranceOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) === "insurance"
  );
  const extraOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) !== "insurance"
  );

  const [selections, setSelections] = useState<SelectionState>(() => buildInitialSelections(enabledOptions));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licencePreview, setLicencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickupAt = combineDateAndTime(bookingContext.pickupDate, bookingContext.pickupTime);
  const dropoffAt = combineDateAndTime(bookingContext.dropoffDate, bookingContext.dropoffTime);

  const breakdown = useMemo(() => {
    return calculateBookingPrice({
      pricePerDayAud: vehicle.price,
      pickupAt,
      dropoffAt,
      vehicleOptions,
      selectedOptions: selectionsToPayload(selections),
    });
  }, [vehicle.price, pickupAt, dropoffAt, vehicleOptions, selections]);

  const updateSelection = (type: string, patch: Partial<SelectionState[string]>) => {
    setSelections((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...patch },
    }));
  };

  const handleLicenceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLicenceFile(null);
      setLicencePreview(null);
      return;
    }
    setLicenceFile(file);
    setLicencePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") data[key] = value;
    });

    try {
      const licencePhotoUrl = licenceFile ? await uploadLicencePhoto(licenceFile) : undefined;
      const drivingLicenceNumber = data.drivingLicenceNumber?.trim()
        ? data.drivingLicenceNumber.trim().toUpperCase()
        : undefined;

      const response = await createRentalBookingRequest({
        vehicleId: vehicle.id,
        pickupAddress: bookingContext.pickupAddress,
        dropoffAddress: bookingContext.dropoffAddress,
        pickupDateTime: pickupAt.toISOString(),
        dropoffDateTime: dropoffAt.toISOString(),
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        customerAddress: data.address,
        customerZip: data.zip,
        customerDob: data.dob,
        customerCountry: data.country,
        drivingLicenceNumber,
        licencePhotoUrl,
        notes: data.message,
        selectedOptions: selectionsToPayload(selections),
      });

      const redirectUrl = response.data.checkoutUrl ?? response.data.successUrl;
      if (!redirectUrl) {
        throw new Error("Booking could not be completed");
      }

      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete booking");
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-8">
        <div>
          <Link href={`/car-rental/${vehicle.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
            ← Back to vehicle details
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Complete Your Rental</h1>
          <p className="mt-2 text-gray-600">
            Choose protection and extras for <strong>{vehicleTitle}</strong>, then complete your booking.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Your trip</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900">Pickup</p>
              <p>{bookingContext.pickupAddress}</p>
              <p className="text-gray-500">
                {format(pickupAt, "dd MMM yyyy, HH:mm")}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Drop-off</p>
              <p>{bookingContext.dropoffAddress}</p>
              <p className="text-gray-500">
                {format(dropoffAt, "dd MMM yyyy, HH:mm")}
              </p>
            </div>
          </div>
        </div>

        <FleetAvailabilityPanel
          totalUnits={fleetAvailability.totalUnits}
          reservedUnits={fleetAvailability.reservedUnits}
          availableUnits={fleetAvailability.availableUnits}
        />

        {(insuranceOptions.length > 0 || extraOptions.length > 0) && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Rental Options</h2>
              <p className="mt-1 text-sm text-gray-600">Customise your rental with protection and extras.</p>
            </div>

            {insuranceOptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Protection Options</h3>
                <div className="space-y-3">
                  {insuranceOptions.map((option) => (
                    <InsuranceCard
                      key={String(option.type)}
                      option={option}
                      label={getOptionLabel(option)}
                      selected={selections[String(option.type)]?.selected ?? false}
                      onToggle={(selected) => updateSelection(String(option.type), { selected })}
                    />
                  ))}
                </div>
              </div>
            )}

            {extraOptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Extras</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {extraOptions.map((option) => {
                    const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
                    const maxQuantity = option.maxQuantity ?? option.defaultMaxQuantity ?? catalog?.defaultMaxQuantity ?? 1;
                    const optionKey = String(option.type);
                    return (
                      <ExtraCard
                        key={optionKey}
                        option={option}
                        label={getOptionLabel(option)}
                        supportsQuantity={optionSupportsQuantity(option)}
                        selected={selections[optionKey]?.selected ?? false}
                        quantity={selections[optionKey]?.quantity ?? 1}
                        maxQuantity={maxQuantity}
                        onToggle={(selected) => updateSelection(optionKey, { selected })}
                        onQuantityChange={(quantity) => updateSelection(optionKey, { quantity })}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Driver Details</h2>
            <p className="mt-1 text-sm text-gray-600">Enter your details to confirm your booking.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Full Name <span className="text-primary">*</span>
              </label>
              <input id="name" name="name" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="text-primary">*</span>
              </label>
              <input id="email" name="email" type="email" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                Phone <span className="text-primary">*</span>
              </label>
              <input id="phone" name="phone" type="tel" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                Address <span className="text-primary">*</span>
              </label>
              <input
                id="address"
                name="address"
                required
                placeholder="Street address"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="zip" className="mb-1 block text-sm font-medium text-gray-700">
                ZIP / Postcode <span className="text-primary">*</span>
              </label>
              <input
                id="zip"
                name="zip"
                required
                placeholder="e.g. 0800"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="dob" className="mb-1 block text-sm font-medium text-gray-700">
                Date of Birth <span className="text-primary">*</span>
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="country" className="mb-1 block text-sm font-medium text-gray-700">
                Country <span className="text-primary">*</span>
              </label>
              <input
                id="country"
                name="country"
                required
                defaultValue="Australia"
                placeholder="Country"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Driving Licence <span className="font-normal normal-case text-gray-500">(optional)</span>
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="drivingLicenceNumber" className="mb-1 block text-sm font-medium text-gray-700">
                  Licence Number
                </label>
                <input
                  id="drivingLicenceNumber"
                  name="drivingLicenceNumber"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label htmlFor="licencePhoto" className="mb-1 block text-sm font-medium text-gray-700">
                  Licence Photo
                </label>
                <input
                  ref={fileInputRef}
                  id="licencePhoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleLicenceChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
                {licencePreview && (
                  <img src={licencePreview} alt="Licence preview" className="mt-3 h-28 rounded-lg border object-cover" />
                )}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea id="message" name="message" rows={3} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          {error && (
            <div className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || fleetAvailability.availableUnits <= 0}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {fleetAvailability.availableUnits <= 0
              ? "Unavailable for Selected Dates"
              : loading
                ? "Processing..."
                : `Confirm Booking · ${formatPrice(breakdown.totalAmountCents / 100)}`}
          </button>
        </form>
      </div>

      <BookingSummary
        vehicleTitle={vehicleTitle}
        pricePerDay={vehicle.price}
        bookingContext={bookingContext}
        breakdown={breakdown}
      />
    </div>
  );
}
