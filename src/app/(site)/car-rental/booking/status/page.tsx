import { Suspense } from "react";
import RentalBookingStatusClient from "@/components/car-rental/RentalBookingStatusClient";

export default function RentalBookingStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">Loading your rental status...</div>
      }
    >
      <RentalBookingStatusClient />
    </Suspense>
  );
}
