import RentalBookingSuccessClient from "@/components/car-rental/RentalBookingSuccessClient";
import { loadRentalBookingConfirmation } from "@/lib/rentals/booking-confirmation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface RentalBookingSuccessPageProps {
  searchParams: Promise<{ booking_id?: string; session_id?: string }>;
}

export default async function RentalBookingSuccessPage({
  searchParams,
}: RentalBookingSuccessPageProps) {
  const params = await searchParams;
  const bookingId = params.booking_id?.trim();
  const sessionId = params.session_id?.trim();

  let initialBooking = undefined;
  let initialError = undefined;

  if (bookingId && !sessionId) {
    const result = await loadRentalBookingConfirmation(bookingId);
    initialBooking = result.data;
    initialError = result.error;
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">
          Confirming your booking...
        </div>
      }
    >
      <RentalBookingSuccessClient
        initialBooking={initialBooking}
        initialError={initialError}
      />
    </Suspense>
  );
}
