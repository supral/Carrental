import { VehicleCategory, VehicleStatus } from "@prisma/client";
import type { VehicleDetailsDocument } from "@/lib/vehicles/vehicle-details";
import type { SaleExtraFields } from "@/lib/vehicles/sale-vehicle-fields";

export const IMPORT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80";

export type MappedImportVehicle = {
  rowNumber: number;
  vehicleNumber: string;
  stockId?: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  condition: string;
  bodyType: string;
  category: VehicleCategory;
  status: VehicleStatus;
  location: string;
  fuelType: string;
  transmission: string;
  driveType: string | null;
  color: string | null;
  doors: number | null;
  seats: number | null;
  description: string;
  features: string[];
  details: VehicleDetailsDocument;
  imageUrls: string[];
  saleExtra: SaleExtraFields;
  customFields: { name: string; value: string; group: string }[];
};

export type RowMappingResult =
  | { ok: true; data: MappedImportVehicle }
  | { ok: false; rowNumber: number; vehicleNumber?: string; errors: string[] };

export type ImportSkippedRow = {
  rowNumber: number;
  vehicleNumber?: string;
  errors: string[];
};

export type ImportPreviewResult = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  soldSkippedCount: number;
  preview: MappedImportVehicle[];
  sampleErrors: ImportSkippedRow[];
  sampleSoldSkipped: ImportSkippedRow[];
  detectedColumns: string[];
};

export type ImportRunResult = {
  created: number;
  updated: number;
  skipped: number;
  soldSkipped: number;
  errors: { rowNumber: number; vehicleNumber?: string; message: string }[];
};
