import type { Metadata } from "next";
import RentalPageClient from "@/components/car-rental/RentalPageClient";
import PageHero from "@/components/layout/PageHero";
import VideoPageShell from "@/components/layout/VideoPageShell";

export const metadata: Metadata = {
  title: "Car Rental",
  description:
    "Search and book rental cars in Darwin. Compare available vehicles by date, location, and price at Everest Car Rental.",
};

const rentalFeatures = [
  "Flexible daily, weekly & monthly rates",
  "Comprehensive insurance options",
  "Airport pickup available",
  "Unlimited km packages",
  "24/7 roadside assistance",
  "No hidden fees",
];

export default function CarRentalPage() {
  return (
    <VideoPageShell variant="rental">
      <PageHero
        padding="large"
        eyebrow="Everest Car Rental"
        title="Find & book a great deal today"
        description="Search by pickup and drop-off time to see only the cars available for your trip."
      />

      <section className="relative z-10 -mt-10 pb-16 lg:-mt-14 lg:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RentalPageClient />
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {rentalFeatures.map((feature) => (
              <div key={feature} className="rounded-2xl bg-white/90 p-4 text-center shadow-sm backdrop-blur-md">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </VideoPageShell>
  );
}
