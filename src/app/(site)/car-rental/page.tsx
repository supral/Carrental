import type { Metadata } from "next";
import RentalPageClient from "@/components/car-rental/RentalPageClient";
import RentalFeatureHighlights from "@/components/car-rental/RentalFeatureHighlights";
import PageHero from "@/components/layout/PageHero";
import { getCachedAvailableRentalFleet } from "@/lib/rentals/our-cars-fleet";

export const metadata: Metadata = {
  title: "Car Rental",
  description:
    "Search and book rental cars in Winnellie, Darwin. Compare available vehicles by date, location, and price at Everest Car Rental.",
};

export const revalidate = 60;

export default async function CarRentalPage() {
  const fleetVehicles = await getCachedAvailableRentalFleet();

  return (
    <>
      <RentalPageClient
        fleetVehicles={fleetVehicles}
        hero={
          <PageHero
            padding="large"
            eyebrow="Everest Car Rental"
            title="Find & book a great deal today"
            description="Search by pickup and drop-off time to see only the cars available for your trip."
          />
        }
      />

      <RentalFeatureHighlights />
    </>
  );
}
