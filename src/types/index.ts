export type VehicleCategory = "cars";
export type VehicleCondition = "New" | "Used" | "Demo";
export type DriveType = "FWD" | "RWD" | "AWD" | "4WD";

export type { VehicleDetailSection, VehicleDetailsDocument } from "@/lib/vehicles/vehicle-details";
export type { VehicleSpecGroup } from "@/lib/vehicles/vehicle-specs-service";
export type { VehicleOfferFields } from "@/lib/vehicles/vehicle-offers";
import type { VehicleDetailsDocument } from "@/lib/vehicles/vehicle-details";
import type { VehicleSpecGroup } from "@/lib/vehicles/vehicle-specs-service";
import type { VehicleOfferFields } from "@/lib/vehicles/vehicle-offers";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  transmission: "Automatic" | "Manual";
  bodyType: "Sedan" | "SUV" | "Ute" | "Hatchback" | "Wagon" | "Coupe" | "Van" | "Convertible";
  category: VehicleCategory;
  listingPurpose?: "sale" | "rental";
  condition: VehicleCondition;
  color: string;
  doors: number;
  seats: number;
  driveType: DriveType;
  location: string;
  dealer: {
    name: string;
    phone: string;
  };
  image: string;
  images: string[];
  description: string;
  features: string[];
  details?: VehicleDetailsDocument;
  featured?: boolean;
  vehicleNumber?: string;
  rentalAvailableFrom?: string;
  rentalAvailableTo?: string;
  totalUnits?: number;
  availableUnits?: number;
  specGroups?: VehicleSpecGroup[];
  vehicleTypeId?: string;
  vehicleTypeName?: string;
  offer?: VehicleOfferFields;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
}

export interface WhyChooseItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export type FormType =
  | "vehicle-enquiry"
  | "contact"
  | "auto-parts"
  | "car-rental"
  | "service-booking";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "date" | "number";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface VehicleSearchParams {
  category?: VehicleCategory;
  listingPurpose?: "sale" | "rental";
  search?: string;
  make?: string;
  model?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  minKm?: string;
  maxKm?: string;
  year?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  condition?: string;
  color?: string;
  driveType?: string;
  doors?: string;
  seats?: string;
  features?: string;
  location?: string;
  dealerId?: string;
  offersOnly?: string | boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "km-asc" | "discount-desc";
  page?: string | number;
  limit?: string | number;
}

export interface VehicleFilters extends VehicleSearchParams {}

export interface VehiclesResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  makes: string[];
  models: Record<string, string[]>;
  fuelTypes: string[];
  transmissions: string[];
  bodyTypes: string[];
  conditions: string[];
  colors: string[];
  driveTypes: string[];
  doors: number[];
  seats: number[];
  features: string[];
  locations: string[];
  years: number[];
  priceRange: { min: number; max: number };
  kmRange: { min: number; max: number };
}

export interface SavedSearch {
  id: string;
  name: string;
  params: VehicleSearchParams;
  createdAt: string;
}
