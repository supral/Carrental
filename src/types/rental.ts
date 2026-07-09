import type { Vehicle } from "@/types";

export interface RentalSearchFormValues {
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  dropoffAddress: string;
  dropoffDate: string;
  dropoffTime: string;
}

export interface RentalSearchRequest {
  pickupAddress: string;
  pickupDateTime: string;
  dropoffAddress: string;
  dropoffDateTime: string;
}

export interface RentalSearchMeta {
  pickupAddress: string;
  dropoffAddress: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  totalAvailable: number;
}

export interface RentalVehicleResult extends Vehicle {
  rating: number;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface RentalSearchResponse {
  success: boolean;
  data: RentalVehicleResult[];
  meta: RentalSearchMeta;
}

export type RentalResultSort = "price-asc" | "price-desc" | "newest" | "rating";

export interface RentalResultFilters {
  minPrice?: number;
  maxPrice?: number;
  make?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  seats?: number;
  sort?: RentalResultSort;
  page?: number;
  limit?: number;
}

export interface RentalBookingContext {
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
}

export interface RentalBookingSelection {
  type: string;
  quantity: number;
}

export interface RentalBookingQuoteLine {
  type: string;
  category: "insurance" | "extra";
  label: string;
  description: string;
  quantity: number;
  unitPriceAud: number;
  priceType: "per_rental" | "per_day";
  lineTotalCents: number;
}

export interface RentalBookingQuote {
  rentalDays: number;
  baseAmountCents: number;
  optionLines: RentalBookingQuoteLine[];
  extrasAmountCents: number;
  subtotalCents: number;
  taxRate: number;
  taxAmountCents: number;
  totalAmountCents: number;
}
