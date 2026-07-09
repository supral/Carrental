import { TemplateFieldInputType } from "@prisma/client";
import {
  createDetailSectionId,
  type VehicleDetailsDocument,
} from "@/lib/vehicles/vehicle-details";
import type { CustomFieldInput } from "@/lib/vehicles/vehicle-specs-service";

export const SALE_FUEL_TYPES = [
  "Petrol",
  "Petrol - unleaded",
  "Diesel",
  "Electric",
  "Hybrid",
  "LPG",
] as const;

export const SALE_TRANSMISSIONS = [
  "Automatic",
  "Automatic transmission",
  "Manual",
  "CVT",
] as const;

export const SALE_BODY_TYPES = [
  "Sedan",
  "SUV",
  "Ute",
  "Hatchback",
  "Wagon",
  "Van",
  "Coupe",
  "Convertible",
  "Other",
] as const;

export const SALE_CONDITIONS = ["Used", "New", "Demo"] as const;

export const SALE_DRIVE_TYPES = ["2WD", "4WD", "AWD", "FWD", "RWD"] as const;

export type SaleExtraFields = {
  variant?: string;
  series?: string;
  vin?: string;
  stockId?: string;
  interiorColor?: string;
  transmissionSpeeds?: string;
  engineCapacityLitres?: string;
  engineCylinders?: string;
  registered?: string;
  registrationNumber?: string;
  registrationExpiry?: string;
};

export function mapSaleFuelType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Petrol";
  if (normalized.includes("diesel")) return "Diesel";
  if (normalized.includes("electric")) return "Electric";
  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("lpg")) return "Petrol";
  if (normalized.includes("unleaded") || normalized.includes("petrol")) return "Petrol";
  return "Petrol";
}

export function mapSaleTransmission(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Automatic";
  if (normalized.includes("manual")) return "Manual";
  return "Automatic";
}

export function mapSaleDriveType(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("4x4") || normalized.includes("4wd")) return "4WD";
  if (normalized.includes("awd")) return "AWD";
  if (normalized.includes("fwd") || normalized.includes("front")) return "FWD";
  if (normalized.includes("rwd") || normalized.includes("rear")) return "RWD";
  if (normalized.includes("2wd")) return "2WD";
  return value.trim();
}

export function mapSaleCondition(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "new") return "New";
  if (normalized === "demo" || normalized.includes("dealer demo")) return "Demo";
  return "Used";
}

const BODY_TYPE_MAP: Record<string, string> = {
  sedan: "Sedan",
  hatchback: "Hatchback",
  suv: "SUV",
  wagon: "Wagon",
  estate: "Wagon",
  estatecar: "Wagon",
  ute: "Ute",
  pickup: "Ute",
  van: "Van",
  coupe: "Coupe",
  convertible: "Convertible",
  caravan: "Other",
};

export function mapSaleBodyType(...sources: string[]): string {
  for (const source of sources) {
    const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalized) continue;
    for (const [needle, bodyType] of Object.entries(BODY_TYPE_MAP)) {
      if (normalized.includes(needle)) return bodyType;
    }
    const direct = SALE_BODY_TYPES.find(
      (type) => type.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
    );
    if (direct) return direct;
  }
  return "Other";
}

export function parseOptionalInt(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const num = Number.parseInt(cleaned, 10);
  return Number.isNaN(num) ? null : num;
}

export function parseSaleDescription(text: string): {
  description: string;
  features: string[];
  location?: string;
} {
  const raw = text.trim();
  if (!raw) return { description: "", features: [] };

  const locationMatch =
    raw.match(/located in\s+([^\n.]+)/i) ??
    raw.match(/location[:\s]+([^\n]+)/i) ??
    raw.match(/(darwin[^,\n]*(?:,\s*nt)?)/i);

  const featuresSplit = raw.split(/\n\s*(?:key features|features(?:\s*&\s*equipment)?)\s*:?\s*\n/i);
  let overview = featuresSplit[0]?.trim() ?? raw;
  const featuresBlock = featuresSplit[1]?.trim() ?? "";

  // Remove structured spec lines from overview prose — they are parsed separately.
  overview = overview
    .split(/\r?\n/)
    .filter((line) => !looksLikeInventorySpecLine(line))
    .join("\n")
    .trim();

  const features = featuresBlock
    ? featuresBlock
        .split(/\n/)
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter((line) => line.length > 1 && !/^\$/.test(line))
    : [];

  const priceLine = overview.match(/\$\d[\d,]*/);
  const description = overview
    .replace(/\$\d[\d,]*\s*(?:drive away|ono)?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    description: description || raw,
    features,
    location: locationMatch?.[1]?.trim(),
  };
}

export type ParsedInventorySpecs = {
  make?: string;
  model?: string;
  variant?: string;
  series?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  driveType?: string;
  doors?: string;
  seats?: string;
  color?: string;
  interiorColor?: string;
  condition?: string;
  odometer?: string;
  engineCapacity?: string;
  engineCylinders?: string;
  transmissionSpeeds?: string;
};

const INVENTORY_SPEC_ALIASES: Record<string, keyof ParsedInventorySpecs> = {
  make: "make",
  manufacturer: "make",
  brand: "make",
  model: "model",
  variant: "variant",
  badge: "variant",
  grade: "variant",
  series: "series",
  bodytype: "bodyType",
  body: "bodyType",
  vehicletype: "bodyType",
  style: "bodyType",
  category: "bodyType",
  vehicleclass: "bodyType",
  class: "bodyType",
  transmission: "transmission",
  trans: "transmission",
  gearbox: "transmission",
  fueltype: "fuelType",
  fuel: "fuelType",
  drivetype: "driveType",
  drive: "driveType",
  drivetrain: "driveType",
  drivetraintype: "driveType",
  doors: "doors",
  door: "doors",
  seats: "seats",
  seat: "seats",
  seatcapacity: "seats",
  colour: "color",
  color: "color",
  exteriorcolour: "color",
  exteriorcolor: "color",
  exteriorcolouroptional: "color",
  interiorcolour: "interiorColor",
  interiorcolor: "interiorColor",
  interiorcolouroptional: "interiorColor",
  condition: "condition",
  vehiclecondition: "condition",
  odometer: "odometer",
  odometerreading: "odometer",
  kms: "odometer",
  kilometres: "odometer",
  mileage: "odometer",
  enginecapacity: "engineCapacity",
  enginecapacitylitres: "engineCapacity",
  enginelitres: "engineCapacity",
  capacity: "engineCapacity",
  enginecylinders: "engineCylinders",
  cylinders: "engineCylinders",
  numberofspeeds: "transmissionSpeeds",
  speeds: "transmissionSpeeds",
  gears: "transmissionSpeeds",
};

function normalizeInventorySpecLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeInventorySpecLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const kvMatch = trimmed.match(/^([^:|\-–—]{2,40})[:|\-–—]\s*(.+)$/i);
  if (kvMatch) {
    const key = normalizeInventorySpecLabel(kvMatch[1]);
    return key in INVENTORY_SPEC_ALIASES;
  }

  const spaceMatch = trimmed.match(/^([A-Za-z][A-Za-z\s]{1,30})\s{2,}(.+)$/);
  if (spaceMatch) {
    const key = normalizeInventorySpecLabel(spaceMatch[1]);
    return key in INVENTORY_SPEC_ALIASES;
  }

  return false;
}

function assignInventorySpec(
  specs: ParsedInventorySpecs,
  key: keyof ParsedInventorySpecs,
  value: string
) {
  const trimmed = value.trim();
  if (!trimmed || specs[key]) return;
  specs[key] = trimmed;
}

function inferInventorySpecsFromProse(text: string, specs: ParsedInventorySpecs) {
  if (!specs.bodyType) {
    specs.bodyType = mapSaleBodyType(text);
    if (specs.bodyType === "Other") delete specs.bodyType;
  }

  if (!specs.transmission) {
    if (/\bmanual\b/i.test(text)) specs.transmission = "Manual";
    else if (/\b(cvt|automatic|auto)\b/i.test(text)) specs.transmission = "Automatic";
  }

  if (!specs.fuelType) {
    if (/\bdiesel\b/i.test(text)) specs.fuelType = "Diesel";
    else if (/\belectric\b/i.test(text)) specs.fuelType = "Electric";
    else if (/\bhybrid\b/i.test(text)) specs.fuelType = "Hybrid";
    else if (/\b(petrol|unleaded|gasoline)\b/i.test(text)) specs.fuelType = "Petrol";
  }

  if (!specs.driveType) {
    if (/\b4x4\b|\b4wd\b/i.test(text)) specs.driveType = "4WD";
    else if (/\bawd\b/i.test(text)) specs.driveType = "AWD";
    else if (/\bfwd\b/i.test(text)) specs.driveType = "FWD";
    else if (/\brwd\b/i.test(text)) specs.driveType = "RWD";
    else if (/\b2wd\b/i.test(text)) specs.driveType = "2WD";
  }

  if (!specs.doors) {
    const doorsMatch = text.match(/\b(\d)\s*(?:door|doors)\b/i);
    if (doorsMatch) specs.doors = doorsMatch[1];
  }

  if (!specs.seats) {
    const seatsMatch = text.match(/\b(\d)\s*(?:seat|seats)\b/i);
    if (seatsMatch) specs.seats = seatsMatch[1];
  }
}

/** Parse structured vehicle specs embedded in dealer inventory descriptions. */
export function parseInventoryDescriptionSpecs(text: string): ParsedInventorySpecs {
  const specs: ParsedInventorySpecs = {};
  if (!text?.trim()) return specs;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const kvMatch = trimmed.match(/^([^:|\-–—]{2,40})[:|\-–—]\s*(.+)$/i);
    if (kvMatch) {
      const key = normalizeInventorySpecLabel(kvMatch[1]);
      const field = INVENTORY_SPEC_ALIASES[key];
      if (field) assignInventorySpec(specs, field, kvMatch[2]);
      continue;
    }

    const spaceMatch = trimmed.match(/^([A-Za-z][A-Za-z\s]{1,30})\s{2,}(.+)$/);
    if (spaceMatch) {
      const key = normalizeInventorySpecLabel(spaceMatch[1]);
      const field = INVENTORY_SPEC_ALIASES[key];
      if (field) assignInventorySpec(specs, field, spaceMatch[2]);
    }
  }

  inferInventorySpecsFromProse(text, specs);
  return specs;
}

export function inferModelFromTitle(
  title: string,
  make: string
): { model?: string; variant?: string } {
  const normalizedTitle = title.trim().toUpperCase();
  const normalizedMake = make.trim().toUpperCase();
  if (!normalizedTitle || !normalizedMake) return {};

  const withoutYear = normalizedTitle.replace(/^\d{4}\s+/, "").trim();
  if (!withoutYear.startsWith(normalizedMake)) return {};

  const remainder = withoutYear.slice(normalizedMake.length).trim();
  const parts = remainder.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { model: parts[0] };
  return { model: parts[0], variant: parts.slice(1).join(" ") };
}

export function buildSaleCustomFields(
  extra: SaleExtraFields,
  group = "Vehicle Details"
): CustomFieldInput[] {
  const entries: { name: string; value?: string }[] = [
    { name: "VIN", value: extra.vin },
    { name: "Stock ID", value: extra.stockId },
    { name: "Variant", value: extra.variant },
    { name: "Series", value: extra.series },
    { name: "Interior Colour", value: extra.interiorColor },
    { name: "Transmission Speeds", value: extra.transmissionSpeeds },
    { name: "Engine Capacity (L)", value: extra.engineCapacityLitres },
    { name: "Engine Cylinders", value: extra.engineCylinders },
    { name: "Registered", value: extra.registered },
    { name: "Registration Number", value: extra.registrationNumber },
    { name: "Registration Expiry", value: extra.registrationExpiry },
  ];

  return entries
    .filter((entry) => entry.value?.trim())
    .map((entry, sortOrder) => ({
      name: entry.name,
      value: entry.value!.trim(),
      inputType: TemplateFieldInputType.TEXT,
      sortOrder,
      group,
    }));
}

export function buildSaleDetailsDocument(
  description: string,
  features: string[] = []
): VehicleDetailsDocument {
  const sections: VehicleDetailsDocument["sections"] = [];

  if (description.trim()) {
    sections.push({
      id: createDetailSectionId(),
      title: "Overview",
      content: description.trim(),
      order: 0,
    });
  }

  if (features.length > 0) {
    sections.push({
      id: createDetailSectionId(),
      title: "Features & Equipment",
      content: features.map((feature) => `• ${feature}`).join("\n"),
      order: 1,
    });
  }

  return { sections };
}

export function mergeSaleCustomFields(
  saleFields: CustomFieldInput[],
  existing: CustomFieldInput[] = []
): CustomFieldInput[] {
  const saleNames = new Set(saleFields.map((field) => field.name.toLowerCase()));
  const preserved = existing.filter((field) => !saleNames.has(field.name.toLowerCase()));
  return [...saleFields, ...preserved].map((field, sortOrder) => ({
    ...field,
    sortOrder,
  }));
}
