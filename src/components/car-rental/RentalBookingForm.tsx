"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import RentalPickupDropoffDateTimes from "@/components/car-rental/search/RentalPickupDropoffDateTimes";
import RentalAddressInput from "@/components/car-rental/search/RentalAddressInput";
import RentalOptionsSelector from "@/components/car-rental/booking/RentalOptionsSelector";
import { createRentalBookingRequest } from "@/lib/rentals/rental-api";
import { combineDateAndTime, normalizeTimeValue } from "@/lib/rentals/search-validation";
import { calculateBookingPrice } from "@/lib/rentals/price-calculator";
import {
  buildInitialRentalOptionSelections,
  getOptionCategory,
  hasProtectionChoiceSelected,
  rentalSelectionsToPayload,
} from "@/lib/rentals/rental-option-selection";
import { getEnabledVehicleOptions, type VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import { formatPrice } from "@/lib/utils";
import { formatVehicleName } from "@/lib/vehicles/display";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";
import { Vehicle } from "@/types";
import type { RentalBookingContext } from "@/types/rental";

interface RentalBookingFormProps {
  vehicle: Vehicle;
  bookingContext?: RentalBookingContext;
  vehicleOptions?: VehicleRentalOptionConfig[];
  className?: string;
}

function tripDetailsFromContext(context?: RentalBookingContext) {
  return {
    pickupAddress: context?.pickupAddress ?? DEFAULT_RENTAL_ADDRESS,
    dropoffAddress: context?.dropoffAddress ?? DEFAULT_RENTAL_ADDRESS,
    pickupDate: context?.pickupDate ?? "",
    pickupTime: context?.pickupTime ? normalizeTimeValue(context.pickupTime) : "09:00",
    dropoffDate: context?.dropoffDate ?? "",
    dropoffTime: context?.dropoffTime ? normalizeTimeValue(context.dropoffTime) : "09:00",
  };
}

function hasCompleteTrip(tripDetails: ReturnType<typeof tripDetailsFromContext>) {
  return Boolean(
    tripDetails.pickupAddress.trim() &&
      tripDetails.dropoffAddress.trim() &&
      tripDetails.pickupDate &&
      tripDetails.pickupTime &&
      tripDetails.dropoffDate &&
      tripDetails.dropoffTime
  );
}

export default function RentalBookingForm({
  vehicle,
  bookingContext,
  vehicleOptions = [],
  className = "",
}: RentalBookingFormProps) {
  const vehicleTitle = formatVehicleName(vehicle);
  const enabledOptions = useMemo(() => getEnabledVehicleOptions(vehicleOptions), [vehicleOptions]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripDetails, setTripDetails] = useState(() => tripDetailsFromContext(bookingContext));
  const [selections, setSelections] = useState(() => buildInitialRentalOptionSelections(enabledOptions));
  const tripReady = hasCompleteTrip(tripDetails);
  const fromSearch = Boolean(bookingContext);

  useEffect(() => {
    setSelections(buildInitialRentalOptionSelections(enabledOptions));
  }, [enabledOptions]);

  useEffect(() => {
    if (bookingContext) {
      setTripDetails(tripDetailsFromContext(bookingContext));
    }
  }, [
    bookingContext?.pickupAddress,
    bookingContext?.dropoffAddress,
    bookingContext?.pickupDate,
    bookingContext?.pickupTime,
    bookingContext?.dropoffDate,
    bookingContext?.dropoffTime,
  ]);

  const rentalQuote = useMemo(() => {
    if (!tripReady) return null;
    const pickupAt = combineDateAndTime(tripDetails.pickupDate, tripDetails.pickupTime);
    const dropoffAt = combineDateAndTime(tripDetails.dropoffDate, tripDetails.dropoffTime);
    if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) return null;
    if (dropoffAt <= pickupAt) return null;

    const breakdown = calculateBookingPrice({
      pricePerDayAud: vehicle.price,
      pickupAt,
      dropoffAt,
      vehicleOptions,
      selectedOptions: rentalSelectionsToPayload(selections),
    });

    return {
      days: breakdown.rentalDays,
      total: breakdown.totalAmountCents / 100,
    };
  }, [tripReady, tripDetails, vehicle.price, vehicleOptions, selections]);

  const updateTripField = (field: keyof typeof tripDetails, value: string) => {
    setTripDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      if (typeof value === "string") {
        data[key] = value;
      }
    });

    try {
      if (!tripReady) {
        throw new Error("Please complete pickup and drop-off details.");
      }

      const insuranceOptions = getEnabledVehicleOptions(vehicleOptions).filter(
        (option) => getOptionCategory(option) === "insurance"
      );
      if (!hasProtectionChoiceSelected(selections, insuranceOptions)) {
        throw new Error("Please select Standard Damage Cover or No Protection.");
      }

      const pickupAt = combineDateAndTime(tripDetails.pickupDate, tripDetails.pickupTime);
      const dropoffAt = combineDateAndTime(tripDetails.dropoffDate, tripDetails.dropoffTime);

      if (dropoffAt <= pickupAt) {
        throw new Error("Drop-off must be after pickup.");
      }

      const response = await createRentalBookingRequest({
        vehicleId: vehicle.id,
        pickupAddress: tripDetails.pickupAddress.trim(),
        dropoffAddress: tripDetails.dropoffAddress.trim(),
        pickupDateTime: pickupAt.toISOString(),
        dropoffDateTime: dropoffAt.toISOString(),
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        customerAddress: data.address,
        customerZip: data.zip,
        customerDob: data.dob,
        customerCountry: data.country,
        notes: data.message,
        selectedOptions: rentalSelectionsToPayload(selections),
      });

      const redirectUrl = response.data.checkoutUrl ?? response.data.successUrl;
      if (!redirectUrl) {
        throw new Error("Booking could not be completed");
      }

      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={className} id="book">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Book This Rental</h3>
        <p className="mt-2 text-gray-600">
          Choose your dates and complete your booking for {vehicleTitle}. A confirmation email will be sent once submitted.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-primary/15 bg-accent px-4 py-4">
        <p className="text-sm font-medium text-gray-700">Selected vehicle</p>
        <p className="text-lg font-bold text-gray-900">{vehicleTitle}</p>
        <p className="mt-1 font-semibold text-primary">
          {formatPrice(vehicle.price)}
          <span className="text-sm font-normal text-gray-500"> /day</span>
        </p>
        {rentalQuote && (
          <p className="mt-2 text-sm text-gray-700">
            Estimated total: <span className="font-bold text-gray-900">{formatPrice(rentalQuote.total)}</span>
            <span className="text-gray-500"> ({rentalQuote.days} day{rentalQuote.days === 1 ? "" : "s"})</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-4">
          <LoadingOverlay show={loading} label="Processing your booking..." />
        <input type="hidden" name="vehicle" value={vehicleTitle} />

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">
            {fromSearch ? "Your trip (from search)" : "Rental dates & locations"}
          </h4>
          <div className="space-y-4">
            <RentalAddressInput
              label="Pickup Address"
              value={tripDetails.pickupAddress}
              onChange={(value) => updateTripField("pickupAddress", value)}
              required
            />
            <RentalAddressInput
              label="Drop-off Address"
              value={tripDetails.dropoffAddress}
              onChange={(value) => updateTripField("dropoffAddress", value)}
              required
            />
            <RentalPickupDropoffDateTimes
              pickupDate={tripDetails.pickupDate}
              pickupTime={tripDetails.pickupTime}
              dropoffDate={tripDetails.dropoffDate}
              dropoffTime={tripDetails.dropoffTime}
              minDate={today}
              onPickupDateChange={(value) => updateTripField("pickupDate", value)}
              onPickupTimeChange={(value) => updateTripField("pickupTime", value)}
              onDropoffDateChange={(value) => updateTripField("dropoffDate", value)}
              onDropoffTimeChange={(value) => updateTripField("dropoffTime", value)}
            />
          </div>
        </section>

        <RentalOptionsSelector
          vehicleOptions={vehicleOptions}
          selections={selections}
          onSelectionsChange={setSelections}
        />

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Full Name <span className="text-primary">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="John Smith"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email <span className="text-primary">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="john@email.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
              Phone <span className="text-primary">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="04XX XXX XXX"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
            Address <span className="text-primary">*</span>
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            placeholder="Street address"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="zip" className="mb-1 block text-sm font-medium text-gray-700">
              ZIP / Postcode <span className="text-primary">*</span>
            </label>
            <input
              id="zip"
              name="zip"
              type="text"
              required
              placeholder="e.g. 0800"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              max={today}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-gray-700">
            Country <span className="text-primary">*</span>
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            defaultValue="Australia"
            placeholder="Country"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
            Additional Notes
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder="Pickup location, insurance preferences, child seats, etc."
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !tripReady}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <LoadingLabel label="Processing booking..." />
          ) : rentalQuote ? (
            `Confirm Booking · ${formatPrice(rentalQuote.total)}`
          ) : (
            "Confirm Booking"
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          Your booking will be confirmed immediately and a confirmation email will be sent to you.
        </p>
      </form>
    </div>
  );
}
