import {
  RENTAL_OPTION_CATALOG_MAP,
  type RentalOptionCategory,
  type SelectedRentalOptionInput,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";

export type RentalOptionSelections = Record<string, { selected: boolean; quantity: number }>;

/** Synthetic protection choice — not a chargeable DB option. */
export const NO_PROTECTION_OPTION_TYPE = "noProtection";

export function getOptionCategory(option: VehicleRentalOptionConfig): RentalOptionCategory {
  if (option.category) return option.category;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.category ?? "extra";
}

export function getOptionLabel(option: VehicleRentalOptionConfig): string {
  if (option.label) return option.label;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.label ?? String(option.type);
}

export function optionSupportsQuantity(option: VehicleRentalOptionConfig): boolean {
  if (option.supportsQuantity != null) return option.supportsQuantity;
  const catalog = RENTAL_OPTION_CATALOG_MAP[option.type as keyof typeof RENTAL_OPTION_CATALOG_MAP];
  return catalog?.supportsQuantity ?? false;
}

export function buildInitialRentalOptionSelections(
  options: VehicleRentalOptionConfig[]
): RentalOptionSelections {
  const state: RentalOptionSelections = {
    [NO_PROTECTION_OPTION_TYPE]: { selected: true, quantity: 1 },
  };
  for (const option of options) {
    state[String(option.type)] = {
      selected: false,
      quantity: 1,
    };
  }

  const insurance = options.filter((option) => getOptionCategory(option) === "insurance");
  const byLabel = insurance.find((option) => {
    const label = getOptionLabel(option).toLowerCase();
    const type = String(option.type).toLowerCase();
    return (
      type.includes("noprotection") ||
      type.includes("no_protection") ||
      type.includes("without") ||
      label.includes("without protection") ||
      label.includes("no protection") ||
      label.includes("book without")
    );
  });
  const preferred = byLabel ?? insurance.find((option) => (option.price ?? 0) === 0);

  if (preferred) {
    const key = String(preferred.type);
    state[NO_PROTECTION_OPTION_TYPE] = { selected: false, quantity: 1 };
    for (const option of insurance) {
      state[String(option.type)] = {
        selected: String(option.type) === key,
        quantity: 1,
      };
    }
  }

  return state;
}

export function rentalSelectionsToPayload(
  selections: RentalOptionSelections
): SelectedRentalOptionInput[] {
  return Object.entries(selections)
    .filter(([type, value]) => value.selected && type !== NO_PROTECTION_OPTION_TYPE)
    .map(([type, value]) => ({
      type,
      quantity: value.quantity,
    }));
}

/** True when Standard Damage Cover (or other insurance) OR No Protection is selected. */
export function hasProtectionChoiceSelected(
  selections: RentalOptionSelections,
  insuranceOptions: VehicleRentalOptionConfig[]
): boolean {
  if (selections[NO_PROTECTION_OPTION_TYPE]?.selected) return true;
  return insuranceOptions.some((option) => selections[String(option.type)]?.selected);
}
