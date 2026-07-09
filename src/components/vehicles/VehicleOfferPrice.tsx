import { formatPrice } from "@/lib/utils";
import type { VehicleOfferFields } from "@/lib/vehicles/vehicle-offers";

interface VehicleOfferPriceProps {
  offer: Pick<
    VehicleOfferFields,
    "isOnOffer" | "originalPrice" | "displayPrice" | "discountedPrice"
  >;
  variant?: "card" | "detail" | "compact";
  className?: string;
}

export default function VehicleOfferPrice({
  offer,
  variant = "card",
  className = "",
}: VehicleOfferPriceProps) {
  if (!offer.isOnOffer || offer.discountedPrice == null) {
    const sizeClass =
      variant === "detail"
        ? "text-3xl font-bold text-red-600"
        : variant === "compact"
          ? "text-xl font-bold text-gray-900"
          : "text-2xl font-bold text-gray-900";

    return <p className={`${sizeClass} ${className}`}>{formatPrice(offer.originalPrice)}</p>;
  }

  if (variant === "detail") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Original Price</p>
            <p className="mt-1 text-lg text-gray-400 line-through">{formatPrice(offer.originalPrice)}</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Current Price</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{formatPrice(offer.displayPrice)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className="block text-gray-400 line-through text-lg">
        {formatPrice(offer.originalPrice)}
      </span>
      <p className="text-red-600 text-3xl font-bold">{formatPrice(offer.displayPrice)}</p>
    </div>
  );
}

export function VehicleOfferBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`absolute top-3 left-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow ${className}`}
    >
      {label}
    </span>
  );
}

export function VehicleOfferSavingsPanel({
  offer,
}: {
  offer: Pick<VehicleOfferFields, "originalPrice" | "savingsAmount" | "savingsPercent" | "displayPrice">;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Discount</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{formatPrice(offer.savingsAmount)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">You Save</p>
        <p className="mt-1 text-lg font-semibold text-green-700">{offer.savingsPercent}%</p>
      </div>
      <div className="col-span-2 border-t border-gray-100 pt-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">Current Price</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{formatPrice(offer.displayPrice)}</p>
      </div>
    </div>
  );
}
