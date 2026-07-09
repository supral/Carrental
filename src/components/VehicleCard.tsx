import Link from "next/link";
import Image from "next/image";
import { Vehicle } from "@/types";
import VehicleOfferPrice, { VehicleOfferBadge } from "@/components/vehicles/VehicleOfferPrice";
import { getVehicleOfferDisplay } from "@/lib/vehicles/vehicle-offers";
import { formatPrice, formatMileage } from "@/lib/utils";
import { formatVehicleName, formatVehicleNumberLabel } from "@/lib/vehicles/display";

interface VehicleCardProps {
  vehicle: Vehicle;
  onCompare?: (id: string) => void;
  isComparing?: boolean;
  showCompare?: boolean;
}

export default function VehicleCard({
  vehicle,
  onCompare,
  isComparing = false,
  showCompare = true,
}: VehicleCardProps) {
  const detailHref =
    vehicle.listingPurpose === "rental" ? `/car-rental/${vehicle.id}` : `/vehicles/${vehicle.id}`;
  const isRental = vehicle.listingPurpose === "rental";
  const offer = getVehicleOfferDisplay(vehicle);

  return (
    <article className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <Link href={detailHref} className="block relative aspect-[4/3] overflow-hidden">
        <Image
          src={vehicle.image}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {!isRental && offer.isOnOffer && offer.offerType && (
          <VehicleOfferBadge label={offer.offerType} className="top-3 left-3" />
        )}
        <div className={`absolute ${!isRental && offer.isOnOffer ? "top-12" : "top-3"} left-3`}>
          <span className="bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {vehicle.year}
          </span>
        </div>
      </Link>

      <div className="p-5">
        <Link href={detailHref}>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors">
            {formatVehicleName(vehicle)}
          </h3>
          {formatVehicleNumberLabel(vehicle.vehicleNumber) && (
            <p className="text-xs font-medium text-gray-500">
              Vehicle No: {formatVehicleNumberLabel(vehicle.vehicleNumber)}
            </p>
          )}
        </Link>

        {isRental ? (
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatPrice(vehicle.price)}
            <span className="text-base font-normal text-gray-500"> /day</span>
          </p>
        ) : (
          <div className="mt-1">
            <VehicleOfferPrice offer={offer} variant="compact" />
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {formatMileage(vehicle.mileage)}
          </span>
          <span>{vehicle.fuelType}</span>
          <span>{vehicle.transmission}</span>
          <span>{vehicle.bodyType}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={detailHref}
            className="flex-1 text-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            View Details
          </Link>
          {showCompare && onCompare && (
            <button
              type="button"
              onClick={() => onCompare(vehicle.id)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors ${
                isComparing
                  ? "bg-red-600 text-white border-red-600"
                  : "border-gray-300 text-gray-700 hover:border-red-600 hover:text-red-600"
              }`}
            >
              {isComparing ? "Added" : "Compare"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
