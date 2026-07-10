"use client";

import { useMemo, type CSSProperties } from "react";
import OurCarCard from "@/components/car-rental/our-cars/OurCarCard";
import type { Vehicle } from "@/types";

interface OurCarsCarouselProps {
  vehicles: Vehicle[];
  onContinue: (vehicle: Vehicle) => void;
}

function buildCarouselItems(vehicles: Vehicle[]): Vehicle[] {
  if (vehicles.length === 0) return [];

  if (vehicles.length <= 3) {
    return vehicles;
  }

  return [...vehicles, ...vehicles];
}

export default function OurCarsCarousel({ vehicles, onContinue }: OurCarsCarouselProps) {
  const items = useMemo(() => buildCarouselItems(vehicles), [vehicles]);
  const durationSeconds = Math.max(vehicles.length * 14, 28);
  const canAutoScroll = vehicles.length > 3;

  if (vehicles.length === 0) {
    return null;
  }

  if (!canAutoScroll) {
    return (
      <div
        className={
          vehicles.length === 1
            ? "mx-auto max-w-md"
            : vehicles.length === 2
              ? "grid grid-cols-1 gap-6 md:grid-cols-2"
              : "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {vehicles.map((vehicle, index) => (
          <OurCarCard
            key={vehicle.id}
            vehicle={vehicle}
            onContinue={onContinue}
            className="w-full"
            priority={index < 3}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent sm:w-16" />

      <div className="our-cars-viewport overflow-hidden">
        <div
          className="our-cars-track flex gap-6 py-1"
          style={{ "--our-cars-duration": `${durationSeconds}s` } as CSSProperties}
        >
          {items.map((vehicle, index) => (
            <OurCarCard
              key={`${vehicle.id}-${index}`}
              vehicle={vehicle}
              onContinue={onContinue}
              className="our-car-card shrink-0"
              priority={index < 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
