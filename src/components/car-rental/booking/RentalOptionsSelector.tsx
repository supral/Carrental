"use client";

import InsuranceCard from "@/components/car-rental/booking/InsuranceCard";
import ExtraCard from "@/components/car-rental/booking/ExtraCard";
import {
  getEnabledVehicleOptions,
  RENTAL_OPTION_CATALOG_MAP,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";
import {
  getOptionCategory,
  getOptionLabel,
  optionSupportsQuantity,
  type RentalOptionSelections,
} from "@/lib/rentals/rental-option-selection";

interface RentalOptionsSelectorProps {
  vehicleOptions: VehicleRentalOptionConfig[];
  selections: RentalOptionSelections;
  onSelectionsChange: (selections: RentalOptionSelections) => void;
  className?: string;
}

export default function RentalOptionsSelector({
  vehicleOptions,
  selections,
  onSelectionsChange,
  className = "",
}: RentalOptionsSelectorProps) {
  const enabledOptions = getEnabledVehicleOptions(vehicleOptions);
  const insuranceOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) === "insurance"
  );
  const extraOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) !== "insurance"
  );

  if (enabledOptions.length === 0) {
    return null;
  }

  const updateSelection = (type: string, patch: Partial<RentalOptionSelections[string]>) => {
    onSelectionsChange({
      ...selections,
      [type]: { ...selections[type], ...patch },
    });
  };

  return (
    <section className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Rental add-ons</h2>
        <p className="mt-1 text-sm text-gray-600">Choose protection and extras for your rental.</p>
      </div>

      {insuranceOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Protection</h3>
          <div className="space-y-3">
            {insuranceOptions.map((option) => {
              const optionKey = String(option.type);
              return (
                <InsuranceCard
                  key={optionKey}
                  option={option}
                  label={getOptionLabel(option)}
                  selected={selections[optionKey]?.selected ?? false}
                  onToggle={(selected) => updateSelection(optionKey, { selected })}
                />
              );
            })}
          </div>
        </div>
      )}

      {extraOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Extras</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {extraOptions.map((option) => {
              const catalog =
                RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
              const maxQuantity =
                option.maxQuantity ?? option.defaultMaxQuantity ?? catalog?.defaultMaxQuantity ?? 1;
              const optionKey = String(option.type);
              return (
                <ExtraCard
                  key={optionKey}
                  option={option}
                  label={getOptionLabel(option)}
                  supportsQuantity={optionSupportsQuantity(option)}
                  selected={selections[optionKey]?.selected ?? false}
                  quantity={selections[optionKey]?.quantity ?? 1}
                  maxQuantity={maxQuantity}
                  onToggle={(selected) => updateSelection(optionKey, { selected })}
                  onQuantityChange={(quantity) => updateSelection(optionKey, { quantity })}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
