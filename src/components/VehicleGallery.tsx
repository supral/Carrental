"use client";

import { useState } from "react";
import Image from "next/image";
import { Vehicle } from "@/types";
import { VehicleOfferBadge } from "@/components/vehicles/VehicleOfferPrice";
import { getVehicleOfferDisplay } from "@/lib/vehicles/vehicle-offers";

interface VehicleGalleryProps {
  vehicle: Vehicle;
}

export default function VehicleGallery({ vehicle }: VehicleGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = vehicle.images.length > 0 ? vehicle.images : [vehicle.image];
  const offer = getVehicleOfferDisplay(vehicle);

  return (
    <div>
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-4">
        {offer.isOnOffer && offer.offerType && (
          <VehicleOfferBadge label={offer.offerType} />
        )}
        <Image
          src={images[activeIndex]}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${activeIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          unoptimized={images[activeIndex]?.startsWith("/uploads/")}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={img}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                activeIndex === index ? "border-red-600" : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={img.startsWith("/uploads/")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
