"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, ChevronLeft, ChevronRight, GitCompareArrows, Building2 } from "lucide-react";
import { Vehicle } from "@/types";
import VehicleOfferPrice, {
  VehicleOfferBadge,
} from "@/components/vehicles/VehicleOfferPrice";
import { getVehicleOfferDisplay } from "@/lib/vehicles/vehicle-offers";
import { formatMileage, cn } from "@/lib/utils";
import { formatVehicleName, formatVehicleNumberLabel } from "@/lib/vehicles/display";
import { useFavoritesStore } from "@/stores/favorites";
import { useCompareStore } from "@/stores/compare";

interface MarketplaceVehicleCardProps {
  vehicle: Vehicle;
  index?: number;
}

export default function MarketplaceVehicleCard({ vehicle, index = 0 }: MarketplaceVehicleCardProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = vehicle.images?.length ? vehicle.images : [vehicle.image];
  const { toggle: toggleFavorite, isFavorite } = useFavoritesStore();
  const { toggle: toggleCompare, isComparing } = useCompareStore();
  const favorited = isFavorite(vehicle.id);
  const comparing = isComparing(vehicle.id);
  const offer = getVehicleOfferDisplay(vehicle);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndex((i) => (i + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndex((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      <Link href={`/vehicles/${vehicle.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          <Image
            src={images[imageIndex]}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleFavorite(vehicle.id); }}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-colors",
                favorited ? "bg-red-500 text-white" : "bg-white/90 text-gray-700 hover:bg-white"
              )}
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleCompare(vehicle.id); }}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-colors",
                comparing ? "bg-primary text-white" : "bg-white/90 text-gray-700 hover:bg-white"
              )}
              aria-label="Compare vehicle"
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
          </div>

          {offer.isOnOffer && offer.offerType && (
            <VehicleOfferBadge label={offer.offerType} />
          )}

          <span className={`absolute ${offer.isOnOffer ? "top-12" : "top-3"} left-3 bg-gray-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
            {vehicle.condition}
          </span>
        </div>

        <div className="p-5">
          <VehicleOfferPrice offer={offer} variant="card" className="mb-1" />
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
            {formatVehicleName(vehicle)}
          </h3>
          {formatVehicleNumberLabel(vehicle.vehicleNumber) && (
            <p className="text-xs font-medium text-muted-foreground">
              Vehicle No: {formatVehicleNumberLabel(vehicle.vehicleNumber)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{formatMileage(vehicle.mileage)}</span>
            <span>{vehicle.transmission}</span>
            <span>{vehicle.fuelType}</span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{vehicle.location}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">{vehicle.dealer.name}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
