"use client";

import { useEffect } from "react";
import RentalBookingForm from "@/components/car-rental/RentalBookingForm";
import type { RentalBookingContext } from "@/types/rental";
import type { Vehicle } from "@/types";

function parseBookingContext(params: Record<string, string | string[] | undefined>): RentalBookingContext | null {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const pickupAddress = get("pickupAddress");
  const dropoffAddress = get("dropoffAddress");
  const pickupDate = get("pickupDate");
  const pickupTime = get("pickupTime");
  const dropoffDate = get("dropoffDate");
  const dropoffTime = get("dropoffTime");

  if (!pickupAddress || !dropoffAddress || !pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
    return null;
  }

  return {
    pickupAddress,
    dropoffAddress,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
  };
}

export default function RentalDetailBooking({
  vehicle,
  searchParams,
}: {
  vehicle: Vehicle;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const bookingContext = parseBookingContext(searchParams);
  const shouldScrollToBook = searchParams.rent === "1";

  useEffect(() => {
    if (shouldScrollToBook) {
      const timer = setTimeout(() => {
        document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToBook]);

  return <RentalBookingForm vehicle={vehicle} bookingContext={bookingContext ?? undefined} />;
}
