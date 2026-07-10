import {
  RENTAL_OPTION_CATALOG_MAP,
  type RentalOptionCategory,
  type SelectedRentalOptionInput,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";

export type RentalOptionSelections = Record<string, { selected: boolean; quantity: number }>;

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
  const state: RentalOptionSelections = {};
  for (const option of options) {
    state[String(option.type)] = {
      selected: false,
      quantity: 1,
    };
  }
  return state;
}

export function rentalSelectionsToPayload(
  selections: RentalOptionSelections
): SelectedRentalOptionInput[] {
  return Object.entries(selections)
    .filter(([, value]) => value.selected)
    .map(([type, value]) => ({
      type,
      quantity: value.quantity,
    }));
}
