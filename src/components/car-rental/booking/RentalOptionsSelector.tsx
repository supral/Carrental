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
  hasProtectionChoiceSelected,
  NO_PROTECTION_OPTION_TYPE,
  optionSupportsQuantity,
  type RentalOptionSelections,
} from "@/lib/rentals/rental-option-selection";
import { cn } from "@/lib/utils";

const NO_PROTECTION_OPTION: VehicleRentalOptionConfig = {
  type: NO_PROTECTION_OPTION_TYPE,
  enabled: true,
  category: "insurance",
  label: "No Protection",
  description: "Drive without optional damage cover. Standard excess applies.",
  price: 0,
  priceType: "per_day",
};

interface RentalOptionsSelectorProps {
  vehicleOptions: VehicleRentalOptionConfig[];
  selections: RentalOptionSelections;
  onSelectionsChange: (selections: RentalOptionSelections) => void;
  className?: string;
  /** When true, protection choice is required (Standard cover or No Protection). */
  requireProtectionChoice?: boolean;
  protectionError?: string;
}

export default function RentalOptionsSelector({
  vehicleOptions,
  selections,
  onSelectionsChange,
  className = "",
  requireProtectionChoice = true,
  protectionError,
}: RentalOptionsSelectorProps) {
  const enabledOptions = getEnabledVehicleOptions(vehicleOptions);
  const insuranceOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) === "insurance"
  );
  const extraOptions = enabledOptions.filter(
    (option) => getOptionCategory(option) !== "insurance"
  );

  const protectionOptions =
    insuranceOptions.length > 0 ? insuranceOptions : [];

  const showProtection =
    requireProtectionChoice || protectionOptions.length > 0 || extraOptions.length > 0;

  if (!showProtection && enabledOptions.length === 0) {
    return null;
  }

  const updateSelection = (type: string, patch: Partial<RentalOptionSelections[string]>) => {
    onSelectionsChange({
      ...selections,
      [type]: { ...selections[type], ...patch },
    });
  };

  const selectProtectionOption = (selectedType: string) => {
    const next: RentalOptionSelections = { ...selections };
    for (const option of protectionOptions) {
      const key = String(option.type);
      next[key] = {
        ...next[key],
        selected: key === selectedType,
        quantity: next[key]?.quantity ?? 1,
      };
    }
    next[NO_PROTECTION_OPTION_TYPE] = {
      selected: selectedType === NO_PROTECTION_OPTION_TYPE,
      quantity: 1,
    };
    onSelectionsChange(next);
  };

  const protectionChosen = hasProtectionChoiceSelected(selections, protectionOptions);

  return (
    <section className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Rental add-ons</h2>
        <p className="mt-1 text-sm text-gray-600">Choose protection and extras for your rental.</p>
      </div>

      {(requireProtectionChoice || protectionOptions.length > 0) && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Protection <span className="text-primary">*</span>
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Select Standard Damage Cover or No Protection.
            </p>
          </div>
          <div
            className={cn(
              "space-y-3",
              !protectionChosen && protectionError && "rounded-xl ring-2 ring-destructive/40 p-1"
            )}
            role="radiogroup"
            aria-label="Protection options"
            aria-required={requireProtectionChoice}
          >
            {protectionOptions.map((option) => {
              const optionKey = String(option.type);
              return (
                <InsuranceCard
                  key={optionKey}
                  option={option}
                  label={getOptionLabel(option)}
                  name="rental-protection"
                  selected={selections[optionKey]?.selected ?? false}
                  onSelect={() => selectProtectionOption(optionKey)}
                />
              );
            })}
            <InsuranceCard
              option={NO_PROTECTION_OPTION}
              label="No Protection"
              name="rental-protection"
              selected={selections[NO_PROTECTION_OPTION_TYPE]?.selected ?? false}
              onSelect={() => selectProtectionOption(NO_PROTECTION_OPTION_TYPE)}
            />
          </div>
          {requireProtectionChoice && !protectionChosen && (
            <p className="text-sm text-red-600">
              {protectionError || "Please select Standard Damage Cover or No Protection."}
            </p>
          )}
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
