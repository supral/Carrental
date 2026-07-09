"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import VehicleCard from "@/components/VehicleCard";
import SectionHeading from "@/components/SectionHeading";
import { fetchFeaturedVehicles } from "@/lib/api";
import { getFeaturedVehicles } from "@/data/vehicles";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";

type FeaturedTab = "sale" | "rental";

const TAB_CONFIG: Record<
  FeaturedTab,
  { label: string; subtitle: string; viewAllHref: string; viewAllLabel: string }
> = {
  sale: {
    label: "Buy / Sell",
    subtitle: "Hand-picked quality vehicles ready to buy",
    viewAllHref: "/vehicles",
    viewAllLabel: "View All Vehicles for Sale",
  },
  rental: {
    label: "Car Rental",
    subtitle: "Featured rental vehicles available now",
    viewAllHref: "/car-rental",
    viewAllLabel: "View All Rental Vehicles",
  },
};

export default function FeaturedVehicles() {
  const [activeTab, setActiveTab] = useState<FeaturedTab>("sale");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFeaturedVehicles(activeTab)
      .then(setVehicles)
      .catch(() => setVehicles(getFeaturedVehicles(activeTab)))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const tabConfig = TAB_CONFIG[activeTab];

  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Featured Vehicles"
          subtitle={tabConfig.subtitle}
        />

        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {(Object.keys(TAB_CONFIG) as FeaturedTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {TAB_CONFIG[tab].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-600">
            No featured {activeTab === "rental" ? "rental" : "sale"} vehicles right now.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} showCompare={false} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href={tabConfig.viewAllHref}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            {tabConfig.viewAllLabel}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
