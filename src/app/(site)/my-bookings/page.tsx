import { Suspense } from "react";
import MyBookingsClient from "@/components/bookings/MyBookingsClient";

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600">Loading...</div>
      }
    >
      <MyBookingsClient />
    </Suspense>
  );
}
