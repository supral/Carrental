import { calculateRentalDays } from "@/lib/rentals/pricing";
import {
  getEnabledVehicleOptions,
  RENTAL_OPTION_CATALOG_MAP,
  type BookingPriceBreakdown,
  type PricedRentalOptionLine,
  type RentalOptionType,
  type SelectedRentalOptionInput,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";

export function getRentalTaxRate(): number {
  const configured = Number(
    process.env.RENTAL_TAX_RATE ??
      process.env.NEXT_PUBLIC_RENTAL_TAX_RATE ??
      "0.05"
  );
  return Number.isFinite(configured) && configured >= 0 ? configured : 0.05;
}

export function calculateOptionLineTotalCents(
  priceAud: number,
  priceType: "per_rental" | "per_day",
  quantity: number,
  rentalDays: number
): number {
  const unitCents = Math.round(priceAud * 100);
  const multiplier = priceType === "per_day" ? rentalDays : 1;
  return unitCents * Math.max(1, quantity) * multiplier;
}

export function calculateBookingPrice(input: {
  pricePerDayAud: number;
  pickupAt: Date;
  dropoffAt: Date;
  vehicleOptions: VehicleRentalOptionConfig[];
  selectedOptions: SelectedRentalOptionInput[];
}): BookingPriceBreakdown {
  const rentalDays = calculateRentalDays(input.pickupAt, input.dropoffAt);
  const baseAmountCents = Math.round(input.pricePerDayAud * 100) * rentalDays;
  const enabledOptions = getEnabledVehicleOptions(input.vehicleOptions);
  const enabledByType = new Map(enabledOptions.map((option) => [option.type, option]));

  const optionLines: PricedRentalOptionLine[] = [];

  for (const selection of input.selectedOptions) {
    const config = enabledByType.get(selection.type as RentalOptionType);
    const catalog = RENTAL_OPTION_CATALOG_MAP[selection.type as RentalOptionType];
    if (!config || config.price == null) continue;

    const supportsQuantity = config.supportsQuantity ?? catalog?.supportsQuantity ?? false;
    const maxQuantity = config.maxQuantity ?? config.defaultMaxQuantity ?? catalog?.defaultMaxQuantity ?? 1;
    const quantity = supportsQuantity
      ? Math.min(Math.max(1, selection.quantity || 1), maxQuantity)
      : 1;

    const priceType = config.priceType ?? "per_day";
    const lineTotalCents = calculateOptionLineTotalCents(
      config.price,
      priceType,
      quantity,
      rentalDays
    );

    optionLines.push({
      type: selection.type as RentalOptionType,
      category: config.category ?? catalog?.category ?? "extra",
      label: config.label ?? catalog?.label ?? String(selection.type),
      description: config.description ?? config.defaultDescription ?? catalog?.defaultDescription ?? "",
      quantity,
      unitPriceAud: config.price,
      priceType,
      lineTotalCents,
    });
  }

  const extrasAmountCents = optionLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const subtotalCents = baseAmountCents + extrasAmountCents;
  const taxRate = getRentalTaxRate();
  const taxAmountCents = Math.round(subtotalCents * taxRate);
  const totalAmountCents = subtotalCents + taxAmountCents;

  return {
    rentalDays,
    baseAmountCents,
    optionLines,
    extrasAmountCents,
    subtotalCents,
    taxRate,
    taxAmountCents,
    totalAmountCents,
  };
}

export function validateSelectedOptions(
  vehicleOptions: VehicleRentalOptionConfig[],
  selectedOptions: SelectedRentalOptionInput[]
): SelectedRentalOptionInput[] {
  const enabledOptions = getEnabledVehicleOptions(vehicleOptions);
  const enabledTypes = new Set(enabledOptions.map((option) => option.type));

  return selectedOptions
    .filter((selection) => enabledTypes.has(selection.type))
    .map((selection) => {
      const catalog = RENTAL_OPTION_CATALOG_MAP[selection.type as RentalOptionType];
      const config = enabledOptions.find((option) => option.type === selection.type);
      if (!config) return null;

      const supportsQuantity = config.supportsQuantity ?? catalog?.supportsQuantity ?? false;
      const maxQuantity = config.maxQuantity ?? config.defaultMaxQuantity ?? catalog?.defaultMaxQuantity ?? 1;
      return {
        type: selection.type,
        quantity: supportsQuantity
          ? Math.min(Math.max(1, selection.quantity || 1), maxQuantity)
          : 1,
      };
    })
    .filter((selection): selection is SelectedRentalOptionInput => selection !== null);
}
