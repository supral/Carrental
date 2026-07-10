import {
  RENTAL_OPTION_CATALOG_MAP,
  formatOptionPriceLabel,
  getEnabledVehicleOptions,
  type RentalOptionCategory,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";

function getOptionCategory(option: VehicleRentalOptionConfig): RentalOptionCategory {
  if (option.category) return option.category;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.category ?? "extra";
}

function getOptionLabel(option: VehicleRentalOptionConfig): string {
  if (option.label) return option.label;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.label ?? String(option.type);
}

function OptionRow({ option, label }: { option: VehicleRentalOptionConfig; label: string }) {
  const description =
    option.description ??
    RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP]?.defaultDescription ??
    "";
  const priceLabel =
    option.price != null && option.priceType
      ? formatOptionPriceLabel(option.price, option.priceType)
      : "";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{label}</p>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {priceLabel && (
        <span className="shrink-0 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
          +{priceLabel}
        </span>
      )}
    </div>
  );
}

interface RentalOptionsPreviewProps {
  options: VehicleRentalOptionConfig[];
  className?: string;
}

export default function RentalOptionsPreview({ options, className = "" }: RentalOptionsPreviewProps) {
  const enabledOptions = getEnabledVehicleOptions(options);
  const insuranceOptions = enabledOptions.filter((option) => getOptionCategory(option) === "insurance");
  const extraOptions = enabledOptions.filter((option) => getOptionCategory(option) !== "insurance");

  if (enabledOptions.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <h2 className="text-2xl font-bold text-gray-900">Available add-ons</h2>
      <p className="mt-1 text-sm text-gray-600">
        Protection and extras you can add when you complete your booking.
      </p>

      <div className="mt-6 space-y-8">
        {insuranceOptions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Protection</h3>
            <div className="mt-3 space-y-3">
              {insuranceOptions.map((option) => (
                <OptionRow key={String(option.type)} option={option} label={getOptionLabel(option)} />
              ))}
            </div>
          </div>
        )}

        {extraOptions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Extras</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {extraOptions.map((option) => (
                <OptionRow key={String(option.type)} option={option} label={getOptionLabel(option)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
