"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListingPurpose } from "@prisma/client";
import {
  releaseVehicleCheckout,
  reserveVehicleForCheckout,
  reservationAuthHeaders,
} from "@/lib/vehicles/reservation-api";
import { formatVehicleName, formatVehicleNumberLabel } from "@/lib/vehicles/display";
import { getVehicleOfferDisplay } from "@/lib/vehicles/vehicle-offers";
import VehicleOfferPrice from "@/components/vehicles/VehicleOfferPrice";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";
import type { Vehicle } from "@/types";

interface SaleBookingFormProps {
  vehicle: Vehicle;
}

export default function SaleBookingForm({ vehicle }: SaleBookingFormProps) {
  const router = useRouter();
  const vehicleTitle = formatVehicleName(vehicle);
  const vehicleNumber = formatVehicleNumberLabel(vehicle.vehicleNumber);
  const vehicleImage = vehicle.images?.length ? vehicle.images[0] : vehicle.image;
  const offer = getVehicleOfferDisplay(vehicle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; email: string } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      vehicleId: vehicle.id,
      customerName: String(formData.get("name") || "").trim(),
      customerEmail: String(formData.get("email") || "").trim(),
      customerPhone: String(formData.get("phone") || "").trim(),
      customerAddress: String(formData.get("address") || "").trim() || undefined,
      preferredContactTime:
        String(formData.get("preferredContactTime") || "").trim() || "Any time",
      customerMessage: String(formData.get("message") || "").trim() || undefined,
    };

    try {
      await reserveVehicleForCheckout(vehicle.id, ListingPurpose.SALE);

      const res = await fetch("/api/sales/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...reservationAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit booking");
      const bookingId = json.data?.id as string;
      const email = payload.customerEmail;
      await releaseVehicleCheckout(vehicle.id);
      setSubmitted({ id: bookingId, email });
      router.push(
        `/vehicles/booking/status?id=${encodeURIComponent(bookingId)}&email=${encodeURIComponent(email)}`
      );
    } catch (err) {
      await releaseVehicleCheckout(vehicle.id);
      setError(err instanceof Error ? err.message : "Failed to submit booking");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-gray-600">Redirecting to your request status...</p>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/vehicles/${vehicle.id}`} className="text-sm font-medium text-red-600 hover:text-red-700">
        ← Back to vehicle details
      </Link>

      <div className="relative mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <LoadingOverlay show={loading} label="Submitting your request..." />
        <h1 className="text-3xl font-bold text-gray-900">Book This Car</h1>
        <p className="mt-2 text-gray-600">
          Submit your details and our team will contact you to arrange a viewing and complete your purchase.
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center">
          {vehicleImage && (
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:h-28 sm:w-44">
              <Image
                src={vehicleImage}
                alt={vehicleTitle}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 176px"
                unoptimized={vehicleImage.startsWith("/uploads/")}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700">Selected vehicle</p>
            <p className="text-lg font-bold text-gray-900">{vehicleTitle}</p>
            {vehicleNumber && (
              <p className="mt-1 text-sm text-gray-600">
                Vehicle No: <span className="font-mono">{vehicleNumber}</span>
              </p>
            )}
            <div className="mt-2">
              <VehicleOfferPrice offer={offer} variant="compact" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              id="address"
              name="address"
              placeholder="Street, suburb, postcode"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div>
            <label htmlFor="preferredContactTime" className="mb-1 block text-sm font-medium text-gray-700">
              Preferred contact time
            </label>
            <select
              id="preferredContactTime"
              name="preferredContactTime"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">Any time</option>
              <option value="Morning (8am–12pm)">Morning (8am–12pm)</option>
              <option value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</option>
              <option value="Evening (5pm–7pm)">Evening (5pm–7pm)</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              placeholder="Any questions, finance needs, or preferred viewing times..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <LoadingLabel label="Submitting..." /> : "Proceed to Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
