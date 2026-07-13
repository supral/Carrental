"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { createRentalBookingRequest, fetchRentalVehicleAvailability } from "@/lib/rentals/rental-api";
import { combineDateAndTime, normalizeTimeValue } from "@/lib/rentals/search-validation";
import { calculateBookingPrice } from "@/lib/rentals/price-calculator";
import {
  buildInitialRentalOptionSelections,
  rentalSelectionsToPayload,
} from "@/lib/rentals/rental-option-selection";
import RentalOptionsSelector from "@/components/car-rental/booking/RentalOptionsSelector";
import BookingSummary from "@/components/car-rental/booking/BookingSummary";
import RentalDateTimePicker from "@/components/car-rental/search/RentalDateTimePicker";
import { getEnabledVehicleOptions, type VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";
import { formatVehicleName } from "@/lib/vehicles/display";
import { formatPrice } from "@/lib/utils";
import type { RentalBookingContext } from "@/types/rental";
import type { Vehicle } from "@/types";
import type { FleetAvailability } from "@/lib/rentals/fleet-inventory";

function tripFromContext(context: RentalBookingContext): RentalBookingContext {
  return {
    ...context,
    pickupTime: normalizeTimeValue(context.pickupTime),
    dropoffTime: normalizeTimeValue(context.dropoffTime),
  };
}

function validateTripDates(trip: RentalBookingContext): string | null {
  if (!trip.pickupDate || !trip.pickupTime || !trip.dropoffDate || !trip.dropoffTime) {
    return "Please complete pickup and drop-off dates and times.";
  }

  const pickupAt = combineDateAndTime(trip.pickupDate, trip.pickupTime);
  const dropoffAt = combineDateAndTime(trip.dropoffDate, trip.dropoffTime);

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) {
    return "Invalid pickup or drop-off date/time.";
  }

  if (dropoffAt <= pickupAt) {
    return "Drop-off must be after pickup.";
  }

  if (pickupAt < new Date()) {
    return "Pickup cannot be in the past.";
  }

  return null;
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
  const today = new Date().toISOString().split("T")[0];

  const enabledOptions = useMemo(() => getEnabledVehicleOptions(vehicleOptions), [vehicleOptions]);

  const [trip, setTrip] = useState<RentalBookingContext>(() => tripFromContext(bookingContext));
  const [availability, setAvailability] = useState<FleetAvailability>(fleetAvailability);
  const [tripError, setTripError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selections, setSelections] = useState(() => buildInitialRentalOptionSelections(enabledOptions));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickupAt = combineDateAndTime(trip.pickupDate, trip.pickupTime);
  const dropoffAt = combineDateAndTime(trip.dropoffDate, trip.dropoffTime);

  const breakdown = useMemo(() => {
    const tripValidation = validateTripDates(trip);
    if (tripValidation) return null;

    return calculateBookingPrice({
      pricePerDayAud: vehicle.price,
      pickupAt,
      dropoffAt,
      vehicleOptions,
      selectedOptions: rentalSelectionsToPayload(selections),
    });
  }, [vehicle.price, pickupAt, dropoffAt, vehicleOptions, selections, trip]);

  useEffect(() => {
    const validationError = validateTripDates(trip);
    if (validationError) {
      setTripError(validationError);
      setCheckingAvailability(false);
      return;
    }

    setTripError(null);
    setCheckingAvailability(true);

    const timer = window.setTimeout(() => {
      void fetchRentalVehicleAvailability(
        vehicle.id,
        pickupAt.toISOString(),
        dropoffAt.toISOString()
      )
        .then((next) => {
          setAvailability(next);
          if (next.availableUnits <= 0) {
            setTripError("This vehicle is not available for the selected dates. Please choose different dates.");
          }
        })
        .catch((err) => {
          setTripError(err instanceof Error ? err.message : "Could not check availability");
        })
        .finally(() => {
          setCheckingAvailability(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [vehicle.id, trip.pickupDate, trip.pickupTime, trip.dropoffDate, trip.dropoffTime]);

  const updateTripField = (field: keyof RentalBookingContext, value: string) => {
    setTrip((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const isUnavailable = availability.availableUnits <= 0;
  const canSubmit = !loading && !checkingAvailability && !tripError && !isUnavailable && breakdown != null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateTripDates(trip);
    if (validationError || isUnavailable) {
      setTripError(validationError ?? "This vehicle is not available for the selected dates.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") data[key] = value;
    });

    try {
      const response = await createRentalBookingRequest({
        vehicleId: vehicle.id,
        pickupAddress: trip.pickupAddress,
        dropoffAddress: trip.dropoffAddress,
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
      setError(err instanceof Error ? err.message : "Failed to complete booking");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href={`/car-rental/${vehicle.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
          ← Back to vehicle details
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Complete Your Rental</h1>
        <p className="mt-2 text-gray-600">
          Choose protection and extras for <strong>{vehicleTitle}</strong>, then complete your booking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <div className="space-y-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Your trip</p>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-900">Pickup</p>
              <p className="mb-3 text-sm text-gray-600">{trip.pickupAddress}</p>
              <RentalDateTimePicker
                inline
                label="Pickup date & time"
                dateValue={trip.pickupDate}
                timeValue={trip.pickupTime}
                minDate={today}
                onDateChange={(value) => updateTripField("pickupDate", value)}
                onTimeChange={(value) => updateTripField("pickupTime", value)}
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-900">Drop-off</p>
              <p className="mb-3 text-sm text-gray-600">{trip.dropoffAddress}</p>
              <RentalDateTimePicker
                inline
                label="Drop-off date & time"
                dateValue={trip.dropoffDate}
                timeValue={trip.dropoffTime}
                minDate={trip.pickupDate || today}
                minTime={
                  trip.dropoffDate && trip.dropoffDate === trip.pickupDate ? trip.pickupTime : undefined
                }
                onDateChange={(value) => updateTripField("dropoffDate", value)}
                onTimeChange={(value) => updateTripField("dropoffTime", value)}
              />
            </div>
          </div>

          {checkingAvailability && (
            <p className="mt-4 text-sm text-gray-500">Checking availability for your new dates...</p>
          )}

          {tripError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {tripError}
            </div>
          )}

          {!tripError && !checkingAvailability && availability.availableUnits > 0 && (
            <p className="mt-4 text-sm text-green-700">Available for these dates.</p>
          )}
        </div>

        <RentalOptionsSelector
          vehicleOptions={vehicleOptions}
          selections={selections}
          onSelectionsChange={setSelections}
        />

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
                max={today}
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
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isUnavailable
              ? "Unavailable for Selected Dates"
              : loading
                ? "Processing..."
                : checkingAvailability
                  ? "Checking availability..."
                  : breakdown
                    ? `Confirm Booking · ${formatPrice(breakdown.totalAmountCents / 100)}`
                    : "Confirm Booking"}
          </button>
        </form>
      </div>

      <BookingSummary
        vehicle={vehicle}
        bookingContext={trip}
        breakdown={breakdown}
        loading={checkingAvailability}
      />
      </div>
    </div>
  );
}
