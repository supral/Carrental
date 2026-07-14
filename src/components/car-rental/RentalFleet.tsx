"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchVehicles } from "@/lib/api";
import { Vehicle } from "@/types";
import { formatPrice } from "@/lib/utils";
import { formatVehicleName } from "@/lib/vehicles/display";
import { PageLoader } from "@/components/ui/loading";

export default function RentalFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles({ listingPurpose: "rental", limit: 50 })
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoader label="Loading rental fleet..." />;
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-lg font-medium text-gray-900">No rental vehicles available yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Add vehicles in admin with listing purpose set to <strong>For Rental</strong> and status <strong>Active</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {vehicles.map((vehicle) => {
        const title = formatVehicleName(vehicle);
        const href = `/car-rental/${vehicle.id}`;

        return (
          <Link
            key={vehicle.id}
            href={href}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] bg-gray-100">
              <Image
                src={vehicle.image}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized={vehicle.image.startsWith("/uploads/")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary">{title}</h3>
              <p className="mt-1 font-semibold text-primary">
                {formatPrice(vehicle.price)}
                <span className="text-sm font-normal text-gray-500"> /day</span>
              </p>
              <ul className="mt-4 space-y-1.5">
                {[vehicle.transmission, vehicle.fuelType, `${vehicle.seats} Seats`, vehicle.bodyType]
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
              </ul>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-primary/80">
                View details & book
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
