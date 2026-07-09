import { Suspense } from "react";
import RentalBookingCancelClient from "@/components/car-rental/RentalBookingCancelClient";

export default function RentalBookingCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">Loading...</div>
      }
    >
      <RentalBookingCancelClient />
    </Suspense>
  );
}
