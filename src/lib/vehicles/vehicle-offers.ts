export const VEHICLE_OFFER_TYPES = [
  "Season Offer",
  "Season Sale",
  "Festival Offer",
  "Dashain Offer",
  "Tihar Offer",
  "New Year Sale",
  "Limited Time",
  "Clearance Sale",
  "Flash Sale",
] as const;

export type VehicleOfferType = (typeof VEHICLE_OFFER_TYPES)[number];

export type OfferDiscountType = "AMOUNT" | "PERCENT";

export interface SeasonOfferInput {
  isOnOffer: boolean;
  offerType?: string | null;
  offerDiscountType?: OfferDiscountType | null;
  offerAmount?: number | null;
  offerPercent?: number | null;
  offerStartDate?: string | Date | null;
  offerEndDate?: string | Date | null;
}

export interface VehicleOfferFields {
  isOnOffer: boolean;
  offerType: string | null;
  offerAmount: number | null;
  offerStartDate: string | null;
  offerEndDate: string | null;
  discountedPrice: number | null;
  displayPrice: number;
  originalPrice: number;
  savingsAmount: number;
  savingsPercent: number;
}

type DecimalLike = number | string | { toNumber(): number };

export interface SeasonOfferTemplateInput {
  name: string;
  offerType: string;
  offerDiscountType?: OfferDiscountType | null;
  offerAmount?: number | null;
  offerPercent?: number | null;
  offerStartDate?: string | Date | null;
  offerEndDate?: string | Date | null;
  isEnabled?: boolean;
}

export type SeasonOfferTemplateLike = {
  name: string;
  offerType: string;
  offerDiscountType: string | null;
  offerAmount: DecimalLike | null;
  offerPercent: DecimalLike | null;
  offerStartDate: Date | null;
  offerEndDate: Date | null;
  isEnabled: boolean;
};

type DbOfferVehicle = {
  price: number;
  seasonOffer?: SeasonOfferTemplateLike | null;
  isOnOffer: boolean;
  offerType: string | null;
  offerDiscountType?: string | null;
  offerAmount: DecimalLike | null;
  offerPercent?: DecimalLike | null;
  discountedPrice: DecimalLike | null;
  offerStartDate: Date | null;
  offerEndDate: Date | null;
};

function toNumber(value: DecimalLike | null | undefined): number | null {
  if (value == null) return null;
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? value.toNumber()
      : Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inactiveOffer(originalPrice: number): VehicleOfferFields {
  return {
    isOnOffer: false,
    offerType: null,
    offerAmount: null,
    offerStartDate: null,
    offerEndDate: null,
    discountedPrice: null,
    displayPrice: originalPrice,
    originalPrice,
    savingsAmount: 0,
    savingsPercent: 0,
  };
}

function templateToOfferInput(template: SeasonOfferTemplateLike): SeasonOfferInput {
  return {
    isOnOffer: true,
    offerType: template.offerType,
    offerDiscountType: template.offerDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    offerAmount: toNumber(template.offerAmount),
    offerPercent: toNumber(template.offerPercent),
    offerStartDate: template.offerStartDate,
    offerEndDate: template.offerEndDate,
  };
}

function resolveOfferFromTemplate(
  price: number,
  template: SeasonOfferTemplateLike,
  now = new Date()
): VehicleOfferFields {
  if (!template.isEnabled) return inactiveOffer(price);

  let offerAmount: number;
  try {
    offerAmount = computeOfferDiscountAmount(price, templateToOfferInput(template));
  } catch {
    return inactiveOffer(price);
  }

  const discountedPrice = price - offerAmount;
  const active =
    offerAmount > 0 &&
    discountedPrice >= 0 &&
    discountedPrice < price &&
    (!template.offerStartDate || template.offerStartDate <= now) &&
    (!template.offerEndDate || template.offerEndDate >= now);

  const savingsPercent = price > 0 ? Math.round((offerAmount / price) * 100) : 0;

  return {
    isOnOffer: active,
    offerType: active ? template.offerType : null,
    offerAmount: active ? offerAmount : null,
    offerStartDate: template.offerStartDate?.toISOString() ?? null,
    offerEndDate: template.offerEndDate?.toISOString() ?? null,
    discountedPrice: active ? discountedPrice : null,
    displayPrice: active ? discountedPrice : price,
    originalPrice: price,
    savingsAmount: active ? offerAmount : 0,
    savingsPercent: active ? savingsPercent : 0,
  };
}

export function isOfferCurrentlyActive(vehicle: DbOfferVehicle, now = new Date()): boolean {
  return resolveVehicleOffer(vehicle, now).isOnOffer;
}

export function resolveVehicleOffer(vehicle: DbOfferVehicle, now = new Date()): VehicleOfferFields {
  if (vehicle.seasonOffer) {
    return resolveOfferFromTemplate(vehicle.price, vehicle.seasonOffer, now);
  }

  const originalPrice = vehicle.price;
  const amount = toNumber(vehicle.offerAmount);
  const discounted = toNumber(vehicle.discountedPrice);
  const legacyActive =
    vehicle.isOnOffer &&
    amount != null &&
    amount > 0 &&
    discounted != null &&
    discounted >= 0 &&
    discounted < originalPrice &&
    (!vehicle.offerStartDate || vehicle.offerStartDate <= now) &&
    (!vehicle.offerEndDate || vehicle.offerEndDate >= now);

  if (!legacyActive) return inactiveOffer(originalPrice);

  const savingsPercent =
    originalPrice > 0 ? Math.round((amount! / originalPrice) * 100) : 0;

  return {
    isOnOffer: true,
    offerType: vehicle.offerType,
    offerAmount: amount,
    offerStartDate: vehicle.offerStartDate?.toISOString() ?? null,
    offerEndDate: vehicle.offerEndDate?.toISOString() ?? null,
    discountedPrice: discounted,
    displayPrice: discounted!,
    originalPrice,
    savingsAmount: amount!,
    savingsPercent,
  };
}

export function computeOfferDiscountAmount(price: number, input: SeasonOfferInput): number {
  const discountType = input.offerDiscountType || "AMOUNT";

  if (discountType === "PERCENT") {
    const percent = Number(input.offerPercent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error("Discount percentage must be between 1 and 100.");
    }
    if (price <= 0) {
      throw new Error("Vehicle price must be greater than zero to apply a percentage discount.");
    }
    return Math.round((price * percent) / 100);
  }

  const offerAmount = Number(input.offerAmount);
  if (!Number.isFinite(offerAmount) || offerAmount <= 0) {
    throw new Error("Discount amount must be greater than zero.");
  }
  if (offerAmount > price) {
    throw new Error("Discount amount cannot exceed the original price.");
  }
  return offerAmount;
}

export function validateSeasonOfferTemplate(input: SeasonOfferTemplateInput): SeasonOfferTemplateInput {
  if (!input.name?.trim()) {
    throw new Error("Offer name is required.");
  }
  if (!input.offerType?.trim()) {
    throw new Error("Offer type is required.");
  }

  const discountType = input.offerDiscountType || "AMOUNT";
  if (discountType === "PERCENT") {
    const percent = Number(input.offerPercent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error("Discount percentage must be between 1 and 100.");
    }
  } else {
    const amount = Number(input.offerAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Discount amount must be greater than zero.");
    }
  }

  const start = parseDate(input.offerStartDate);
  const end = parseDate(input.offerEndDate);
  if (start && end && end < start) {
    throw new Error("Offer end date must be on or after the start date.");
  }

  return {
    name: input.name.trim(),
    offerType: input.offerType.trim(),
    offerDiscountType: discountType,
    offerAmount: discountType === "AMOUNT" ? Number(input.offerAmount) : null,
    offerPercent: discountType === "PERCENT" ? Number(input.offerPercent) : null,
    offerStartDate: start,
    offerEndDate: end,
    isEnabled: input.isEnabled !== false,
  };
}

export function validateSeasonOffer(price: number, input: SeasonOfferInput): SeasonOfferInput {
  if (!input.isOnOffer) {
    return { isOnOffer: false };
  }

  if (!input.offerType?.trim()) {
    throw new Error("Offer type is required when season offer is enabled.");
  }

  const discountType = input.offerDiscountType || "AMOUNT";
  const offerAmount = computeOfferDiscountAmount(price, input);
  const start = parseDate(input.offerStartDate);
  const end = parseDate(input.offerEndDate);

  if (start && end && end < start) {
    throw new Error("Offer end date must be on or after the start date.");
  }

  return {
    isOnOffer: true,
    offerType: input.offerType.trim(),
    offerDiscountType: discountType,
    offerAmount,
    offerPercent: discountType === "PERCENT" ? Number(input.offerPercent) : null,
    offerStartDate: start,
    offerEndDate: end,
  };
}

export function getEffectivePrice(vehicle: DbOfferVehicle, now = new Date()): number {
  return resolveVehicleOffer(vehicle, now).displayPrice;
}

export function getVehicleOfferDisplay(vehicle: {
  price: number;
  offer?: VehicleOfferFields;
}): VehicleOfferFields {
  if (vehicle.offer) return vehicle.offer;
  return resolveVehicleOffer({
    price: vehicle.price,
    isOnOffer: false,
    offerType: null,
    offerAmount: null,
    discountedPrice: null,
    offerStartDate: null,
    offerEndDate: null,
  });
}

export type VehicleOfferAdminStatus = "disabled" | "live" | "scheduled" | "expired";

export interface VehicleOfferAdminView {
  configured: boolean;
  status: VehicleOfferAdminStatus;
  offerType: string | null;
  offerDiscountType: OfferDiscountType | null;
  offerPercent: number | null;
  originalPrice: number;
  savingsAmount: number;
  displayPrice: number;
  savingsPercent: number;
  offerStartDate: string | null;
  offerEndDate: string | null;
  /** Whether the offer is live on the public website right now. */
  isLive: boolean;
}

export function getVehicleOfferAdminView(
  vehicle: DbOfferVehicle,
  now = new Date()
): VehicleOfferAdminView {
  const amount = toNumber(vehicle.offerAmount);
  const discounted = toNumber(vehicle.discountedPrice);
  const configured = Boolean(
    vehicle.isOnOffer && vehicle.offerType && amount != null && amount > 0 && discounted != null
  );

  let status: VehicleOfferAdminStatus = "disabled";
  if (configured) {
    if (vehicle.offerEndDate && vehicle.offerEndDate < now) {
      status = "expired";
    } else if (vehicle.offerStartDate && vehicle.offerStartDate > now) {
      status = "scheduled";
    } else {
      status = "live";
    }
  }

  const live = isOfferCurrentlyActive(vehicle, now);
  const originalPrice = vehicle.price;
  const savingsAmount = amount ?? 0;
  const displayPrice = discounted ?? originalPrice;
  const savingsPercent =
    configured && originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;
  const discountType =
    vehicle.offerDiscountType === "PERCENT" ? "PERCENT" : configured ? "AMOUNT" : null;

  return {
    configured,
    status,
    offerType: vehicle.offerType,
    offerDiscountType: discountType,
    offerPercent: toNumber(vehicle.offerPercent),
    originalPrice,
    savingsAmount,
    displayPrice,
    savingsPercent,
    offerStartDate: vehicle.offerStartDate?.toISOString() ?? null,
    offerEndDate: vehicle.offerEndDate?.toISOString() ?? null,
    isLive: live,
  };
}

export type OfferDiscountSummary = {
  vehiclesOnOffer: number;
  totalSavings: number;
  totalListPrice: number;
  totalOfferPrice: number;
  averageSavingsPerVehicle: number;
};

export function summarizeVehicleOfferDiscounts(
  vehicles: DbOfferVehicle[],
  now = new Date()
): OfferDiscountSummary {
  let vehiclesOnOffer = 0;
  let totalSavings = 0;
  let totalListPrice = 0;
  let totalOfferPrice = 0;

  for (const vehicle of vehicles) {
    const offer = resolveVehicleOffer(vehicle, now);
    if (!offer.isOnOffer) continue;

    vehiclesOnOffer += 1;
    totalSavings += offer.savingsAmount;
    totalListPrice += offer.originalPrice;
    totalOfferPrice += offer.displayPrice;
  }

  return {
    vehiclesOnOffer,
    totalSavings,
    totalListPrice,
    totalOfferPrice,
    averageSavingsPerVehicle:
      vehiclesOnOffer > 0 ? Math.round(totalSavings / vehiclesOnOffer) : 0,
  };
}
