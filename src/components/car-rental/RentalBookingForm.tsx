"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import RentalDateTimePicker from "@/components/car-rental/search/RentalDateTimePicker";
import { createRentalBookingRequest } from "@/lib/rentals/rental-api";
import { combineDateAndTime, normalizeTimeValue } from "@/lib/rentals/search-validation";
import { calculateRentalDays } from "@/lib/rentals/pricing";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import { Vehicle } from "@/types";
import type { RentalBookingContext } from "@/types/rental";
import { formatPrice } from "@/lib/utils";
import { formatVehicleName } from "@/lib/vehicles/display";

interface RentalBookingFormProps {
  vehicle: Vehicle;
  bookingContext?: RentalBookingContext;
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

export default function RentalBookingForm({ vehicle, bookingContext, className = "" }: RentalBookingFormProps) {
  const vehicleTitle = formatVehicleName(vehicle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripDetails, setTripDetails] = useState(() => tripDetailsFromContext(bookingContext));
  const tripReady = hasCompleteTrip(tripDetails);
  const fromSearch = Boolean(bookingContext);

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
    const days = calculateRentalDays(pickupAt, dropoffAt);
    return { days, total: vehicle.price * days };
  }, [tripReady, tripDetails, vehicle.price]);

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="vehicle" value={vehicleTitle} />

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">
            {fromSearch ? "Your trip (from search)" : "Rental dates & locations"}
          </h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="pickupAddress" className="mb-1 block text-sm font-medium text-gray-700">
                Pickup Address <span className="text-primary">*</span>
              </label>
              <input
                id="pickupAddress"
                name="pickupAddress"
                type="text"
                required
                value={tripDetails.pickupAddress}
                onChange={(e) => updateTripField("pickupAddress", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="dropoffAddress" className="mb-1 block text-sm font-medium text-gray-700">
                Drop-off Address <span className="text-primary">*</span>
              </label>
              <input
                id="dropoffAddress"
                name="dropoffAddress"
                type="text"
                required
                value={tripDetails.dropoffAddress}
                onChange={(e) => updateTripField("dropoffAddress", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <RentalDateTimePicker
              label="Pickup date & time *"
              dateValue={tripDetails.pickupDate}
              timeValue={tripDetails.pickupTime}
              minDate={today}
              onDateChange={(value) => updateTripField("pickupDate", value)}
              onTimeChange={(value) => updateTripField("pickupTime", value)}
            />
            <RentalDateTimePicker
              label="Drop-off date & time *"
              dateValue={tripDetails.dropoffDate}
              timeValue={tripDetails.dropoffTime}
              minDate={tripDetails.pickupDate || today}
              minTime={
                tripDetails.dropoffDate && tripDetails.dropoffDate === tripDetails.pickupDate
                  ? tripDetails.pickupTime
                  : undefined
              }
              onDateChange={(value) => updateTripField("dropoffDate", value)}
              onTimeChange={(value) => updateTripField("dropoffTime", value)}
            />
          </div>
        </section>

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
          {loading ? "Processing..." : "Confirm Booking"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Your booking will be confirmed immediately and a confirmation email will be sent to you.
        </p>
      </form>
    </div>
  );
}
