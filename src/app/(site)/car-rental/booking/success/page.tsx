import RentalBookingSuccessClient from "@/components/car-rental/RentalBookingSuccessClient";
import { Suspense } from "react";

export default function RentalBookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">Confirming your payment...</div>
      }
    >
      <RentalBookingSuccessClient />
    </Suspense>
  );
}
