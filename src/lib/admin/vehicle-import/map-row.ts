import { VehicleCategory, VehicleStatus } from "@prisma/client";
import { extractRowFields } from "./parse-file";
import {
  buildSaleCustomFields,
  buildSaleDetailsDocument,
  inferModelFromTitle,
  mapSaleBodyType,
  mapSaleCondition,
  mapSaleDriveType,
  mapSaleFuelType,
  mapSaleTransmission,
  parseInventoryDescriptionSpecs,
  parseOptionalInt,
  parseSaleDescription,
} from "@/lib/vehicles/sale-vehicle-fields";
import {
  IMPORT_PLACEHOLDER_IMAGE,
  type MappedImportVehicle,
  type RowMappingResult,
} from "./types";

function parseIntField(value: string, field: string, errors: string[]): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const num = Number.parseInt(cleaned, 10);
  if (Number.isNaN(num)) {
    errors.push(`Invalid ${field}: "${value}"`);
    return null;
  }
  return num;
}

function mapCategory(category: string, vehicleClass: string): VehicleCategory {
  const source = `${category} ${vehicleClass}`.toLowerCase();
  if (source.includes("caravan")) return VehicleCategory.CARAVANS;
  if (source.includes("motorbike") || source.includes("motorcycle")) return VehicleCategory.MOTORBIKES;
  return VehicleCategory.CARS;
}

export function mapImportStatus(
  value: string,
  fallback: VehicleStatus = VehicleStatus.ACTIVE
): VehicleStatus {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "active" || normalized === "live" || normalized === "published") {
    return VehicleStatus.ACTIVE;
  }
  if (normalized === "sold") return VehicleStatus.SOLD;
  if (normalized === "draft") return VehicleStatus.DRAFT;
  if (normalized === "pending" || normalized === "review") return VehicleStatus.PENDING;
  if (normalized === "rejected" || normalized === "inactive" || normalized === "deleted") {
    return VehicleStatus.REJECTED;
  }
  return fallback;
}

function mapRegistered(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["yes", "true", "y", "1", "registered"].includes(normalized)) return "Yes";
  if (["no", "false", "n", "0", "unregistered"].includes(normalized)) return "No";
  return value.trim();
}

function pickImportValue(columnValue: string, descriptionValue?: string): string {
  return columnValue.trim() || descriptionValue?.trim() || "";
}

export function mapImportRow(
  row: Record<string, string>,
  rowNumber: number,
  options: { defaultStatus?: VehicleStatus; defaultLocation?: string } = {}
): RowMappingResult {
  const errors: string[] = [];
  const fields = extractRowFields(row);

  const parsedDescription = parseSaleDescription(fields.description);
  const descSpecs = parseInventoryDescriptionSpecs(fields.description);

  const vin = fields.vin.trim().toUpperCase();
  const stockId = fields.stockNumber.trim().toUpperCase();
  const registrationNumber = fields.registrationNumber.trim().toUpperCase();

  // VIN is the primary vehicle number; fall back to stock ID or registration.
  const vehicleNumber = vin || stockId || registrationNumber;
  if (!vehicleNumber) errors.push("VIN or Stock ID is required");

  const make = pickImportValue(fields.make, descSpecs.make);
  if (!make) errors.push("Make is required");

  const provisionalTitle = fields.title.trim()
    ? fields.title.toUpperCase()
    : [fields.year, make, fields.model, fields.variant].filter(Boolean).join(" ").trim().toUpperCase();
  const titleInferred = inferModelFromTitle(provisionalTitle, make);

  const model = pickImportValue(fields.model, descSpecs.model || titleInferred.model);
  if (!model) errors.push("Model is required");

  const variant = pickImportValue(fields.variant, descSpecs.variant || titleInferred.variant);

  const year = parseIntField(fields.year, "year", errors);
  if (year !== null && (year < 1980 || year > new Date().getFullYear() + 1)) {
    errors.push(`Year out of range: ${year}`);
  } else if (year === null) {
    errors.push("Construction year is required");
  }

  const price = parseIntField(fields.price, "price", errors);
  if (price === null) errors.push("Price is required");
  else if (price < 0) errors.push("Price must be zero or positive");

  const columnMileage = fields.mileage.trim()
    ? parseIntField(fields.mileage, "odometer", errors)
    : null;
  const resolvedMileage = columnMileage ?? parseOptionalInt(descSpecs.odometer) ?? 0;

  const title = fields.title.trim()
    ? fields.title.toUpperCase()
    : [year, make, model, variant].filter(Boolean).join(" ").trim().toUpperCase();
  if (title.length < 3) errors.push("Listing title must be at least 3 characters");

  if (errors.length > 0) {
    return { ok: false, rowNumber, vehicleNumber: vehicleNumber || undefined, errors };
  }

  const location =
    fields.location.trim() ||
    parsedDescription.location ||
    options.defaultLocation ||
    "Darwin, NT";

  const bodyType = mapSaleBodyType(
    fields.bodyType,
    descSpecs.bodyType ?? "",
    fields.category,
    fields.vehicleClass,
    fields.description
  );

  const saleExtra = {
    variant: variant || undefined,
    series: pickImportValue(fields.series, descSpecs.series) || undefined,
    stockId: stockId && stockId !== vehicleNumber ? stockId : undefined,
    interiorColor: pickImportValue(fields.interiorColor, descSpecs.interiorColor) || undefined,
    transmissionSpeeds:
      pickImportValue(fields.transmissionSpeeds, descSpecs.transmissionSpeeds) || undefined,
    engineCapacityLitres:
      pickImportValue(fields.engineCapacity, descSpecs.engineCapacity) || undefined,
    engineCylinders:
      pickImportValue(fields.engineCylinders, descSpecs.engineCylinders) || undefined,
    registered: mapRegistered(fields.registered),
    registrationNumber: registrationNumber || undefined,
    registrationExpiry: fields.registrationExpiry || undefined,
  };

  const saleCustomFields = buildSaleCustomFields(saleExtra, "Vehicle Details");
  const analyticsFields = [
    fields.views ? { name: "Listing Views", value: fields.views } : null,
    fields.adHealth ? { name: "Ad Health", value: fields.adHealth } : null,
    fields.imageCount ? { name: "Image Count", value: fields.imageCount } : null,
    fields.isDriveAway ? { name: "Drive Away", value: fields.isDriveAway } : null,
  ].filter((field): field is { name: string; value: string } => field !== null);

  const customFields = [
    ...saleCustomFields.map((field) => ({
      name: field.name,
      value: field.value,
      group: field.group,
    })),
    ...analyticsFields.map((field) => ({
      ...field,
      group: "Import Data",
    })),
  ];

  const descriptionText = parsedDescription.description || fields.description;
  const features = parsedDescription.features;
  const details = buildSaleDetailsDocument(descriptionText, features);

  const imageUrls =
    fields.imageUrls.length > 0 ? fields.imageUrls : [IMPORT_PLACEHOLDER_IMAGE];

  const data: MappedImportVehicle = {
    rowNumber,
    vehicleNumber,
    stockId: stockId || undefined,
    title,
    make,
    model,
    year: year!,
    price: price!,
    mileage: resolvedMileage,
    condition: mapSaleCondition(pickImportValue(fields.condition, descSpecs.condition) || "USED"),
    bodyType,
    category: mapCategory(fields.category, fields.vehicleClass),
    status: mapImportStatus(fields.status, options.defaultStatus ?? VehicleStatus.ACTIVE),
    location,
    fuelType: mapSaleFuelType(pickImportValue(fields.fuelType, descSpecs.fuelType)),
    transmission: mapSaleTransmission(
      pickImportValue(fields.transmission, descSpecs.transmission)
    ),
    driveType: mapSaleDriveType(pickImportValue(fields.driveType, descSpecs.driveType)),
    color: pickImportValue(fields.exteriorColor, descSpecs.color) || null,
    doors: parseOptionalInt(fields.doors) ?? parseOptionalInt(descSpecs.doors),
    seats: parseOptionalInt(fields.seats) ?? parseOptionalInt(descSpecs.seats),
    description: descriptionText,
    features,
    details,
    imageUrls,
    saleExtra,
    customFields,
  };

  return { ok: true, data };
}
