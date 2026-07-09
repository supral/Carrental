export type RentalOptionPriceType = "PER_RENTAL" | "PER_DAY";

export const RentalOptionPriceType = {
  PER_RENTAL: "PER_RENTAL",
  PER_DAY: "PER_DAY",
} as const satisfies Record<string, RentalOptionPriceType>;

export type RentalOptionType =
  | "standardDamageCover"
  | "theftProtection"
  | "babySeat"
  | "boosterSeat"
  | "childSeat"
  | "gpsNavigation"
  | "additionalDriver"
  | "unlimitedMileage"
  | "roadsideAssistance"
  | "wifiDevice"
  | "snowChains"
  | "roofRack";

export type RentalOptionCategory = "insurance" | "extra";

export interface RentalOptionCatalogEntry {
  type: RentalOptionType;
  category: RentalOptionCategory;
  label: string;
  defaultDescription: string;
  supportsQuantity: boolean;
  defaultMaxQuantity?: number;
}

export interface VehicleRentalOptionConfig {
  type: RentalOptionType | string;
  enabled: boolean;
  price?: number;
  priceType?: "per_rental" | "per_day";
  maxQuantity?: number;
  description?: string;
  /** Dynamic DB-backed option metadata */
  label?: string;
  category?: RentalOptionCategory;
  supportsQuantity?: boolean;
  defaultMaxQuantity?: number;
  defaultDescription?: string;
}

export interface SelectedRentalOptionInput {
  type: RentalOptionType | string;
  quantity: number;
}

export function parseSelectedRentalOptions(
  options: Array<{ type: string; quantity: number }>
): SelectedRentalOptionInput[] {
  return options.map((option) => ({
    type: option.type as RentalOptionType,
    quantity: option.quantity,
  }));
}

export interface PricedRentalOptionLine {
  type: RentalOptionType;
  category: RentalOptionCategory;
  label: string;
  description: string;
  quantity: number;
  unitPriceAud: number;
  priceType: "per_rental" | "per_day";
  lineTotalCents: number;
}

export function parsePricedRentalOptionLines(value: unknown): PricedRentalOptionLine[] {
  if (!Array.isArray(value)) return [];
  return value as PricedRentalOptionLine[];
}

export interface BookingPriceBreakdown {
  rentalDays: number;
  baseAmountCents: number;
  optionLines: PricedRentalOptionLine[];
  extrasAmountCents: number;
  subtotalCents: number;
  taxRate: number;
  taxAmountCents: number;
  totalAmountCents: number;
}

export const RENTAL_OPTION_CATALOG: RentalOptionCatalogEntry[] = [
  {
    type: "standardDamageCover",
    category: "insurance",
    label: "Standard Damage Cover",
    defaultDescription: "Protects against accidental vehicle damage.",
    supportsQuantity: false,
  },
  {
    type: "theftProtection",
    category: "insurance",
    label: "Theft Protection",
    defaultDescription: "Protects against vehicle theft.",
    supportsQuantity: false,
  },
  {
    type: "babySeat",
    category: "extra",
    label: "Baby Seat",
    defaultDescription: "Rear-facing baby seat for infants.",
    supportsQuantity: true,
    defaultMaxQuantity: 2,
  },
  {
    type: "boosterSeat",
    category: "extra",
    label: "Booster Seat",
    defaultDescription: "Booster seat for older children.",
    supportsQuantity: true,
    defaultMaxQuantity: 2,
  },
  {
    type: "childSeat",
    category: "extra",
    label: "Child Seat",
    defaultDescription: "Forward-facing child seat.",
    supportsQuantity: true,
    defaultMaxQuantity: 2,
  },
  {
    type: "gpsNavigation",
    category: "extra",
    label: "GPS Navigation",
    defaultDescription: "Portable GPS navigation device.",
    supportsQuantity: false,
  },
  {
    type: "additionalDriver",
    category: "extra",
    label: "Additional Driver",
    defaultDescription: "Add another authorised driver to the rental.",
    supportsQuantity: false,
  },
  {
    type: "unlimitedMileage",
    category: "extra",
    label: "Unlimited Mileage",
    defaultDescription: "Drive without daily kilometre limits.",
    supportsQuantity: false,
  },
  {
    type: "roadsideAssistance",
    category: "extra",
    label: "Roadside Assistance",
    defaultDescription: "24/7 roadside support during your rental.",
    supportsQuantity: false,
  },
  {
    type: "wifiDevice",
    category: "extra",
    label: "WiFi Device",
    defaultDescription: "Mobile WiFi hotspot for your trip.",
    supportsQuantity: false,
  },
  {
    type: "snowChains",
    category: "extra",
    label: "Snow Chains",
    defaultDescription: "Snow chains for winter driving conditions.",
    supportsQuantity: true,
    defaultMaxQuantity: 2,
  },
  {
    type: "roofRack",
    category: "extra",
    label: "Roof Rack",
    defaultDescription: "Roof rack for extra luggage capacity.",
    supportsQuantity: false,
  },
];

export const RENTAL_OPTION_CATALOG_MAP = Object.fromEntries(
  RENTAL_OPTION_CATALOG.map((entry) => [entry.type, entry])
) as Record<RentalOptionType, RentalOptionCatalogEntry>;

export function getDefaultVehicleRentalOptions(): VehicleRentalOptionConfig[] {
  return RENTAL_OPTION_CATALOG.map((entry) => ({
    type: entry.type,
    enabled: false,
    price: undefined,
    priceType: "per_day",
    maxQuantity: entry.defaultMaxQuantity,
    description: entry.defaultDescription,
  }));
}

export function parseVehicleRentalOptions(value: unknown): VehicleRentalOptionConfig[] {
  const defaults = getDefaultVehicleRentalOptions();
  if (!Array.isArray(value)) return defaults;

  const byType = new Map<string, VehicleRentalOptionConfig>();
  defaults.forEach((option) => byType.set(String(option.type), option));

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const type = String(raw.type);
    const catalog = RENTAL_OPTION_CATALOG_MAP[type as RentalOptionType];
    if (!catalog && !raw.label) continue;

    byType.set(type, {
      type,
      enabled: Boolean(raw.enabled),
      price: typeof raw.price === "number" ? raw.price : Number(raw.price) || undefined,
      priceType: raw.priceType === "per_rental" ? "per_rental" : "per_day",
      maxQuantity:
        typeof raw.maxQuantity === "number"
          ? raw.maxQuantity
          : raw.maxQuantity != null
            ? Number(raw.maxQuantity)
            : catalog?.defaultMaxQuantity,
      description:
        typeof raw.description === "string"
          ? raw.description
          : catalog?.defaultDescription,
    });
  }

  return [...byType.values()];
}

export function getEnabledVehicleOptions(options: VehicleRentalOptionConfig[]) {
  return options.filter((option) => option.enabled && option.price != null && option.price >= 0);
}

export function toPrismaPriceType(priceType: "per_rental" | "per_day"): RentalOptionPriceType {
  return priceType === "per_rental" ? RentalOptionPriceType.PER_RENTAL : RentalOptionPriceType.PER_DAY;
}

export function fromPrismaPriceType(priceType: RentalOptionPriceType): "per_rental" | "per_day" {
  return priceType === RentalOptionPriceType.PER_RENTAL ? "per_rental" : "per_day";
}

export function formatOptionPriceLabel(priceAud: number, priceType: "per_rental" | "per_day"): string {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceAud);

  return priceType === "per_day" ? `${formatted} per day` : `${formatted} per rental`;
}
