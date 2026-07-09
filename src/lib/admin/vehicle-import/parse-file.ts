import * as XLSX from "xlsx";

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9#]/g, "")
    .replace(/#$/, "");
}

export function parseSpreadsheet(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rawRows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = cellToString(value);
    }
    return normalized;
  });
}

export function getDetectedColumns(rows: Record<string, string>[]): string[] {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    for (const key of Object.keys(row)) {
      if (row[key]) keys.add(key);
    }
  }
  return [...keys].sort();
}

function pickValue(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) return value;
  }
  return "";
}

export function extractRowFields(row: Record<string, string>) {
  const imageUrls: string[] = [];
  const extra: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    if (!value) continue;

    const lowerKey = key.toLowerCase();
    if (/^https?:\/\//i.test(value)) {
      imageUrls.push(value);
      continue;
    }

    if (
      lowerKey.includes("image") ||
      lowerKey.includes("photo") ||
      lowerKey.includes("picture") ||
      (lowerKey.includes("url") && !lowerKey.includes("curb"))
    ) {
      const parts = value.split(/[\n,;|]/).map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (/^https?:\/\//i.test(part)) imageUrls.push(part);
      }
    }

    extra[key] = value;
  }

  return {
    stockNumber: pickValue(
      row,
      "stock#",
      "stock",
      "stockno",
      "stocknumber",
      "stockid",
      "stock id"
    ),
    vin: pickValue(row, "vin"),
    year: pickValue(row, "year", "constructionyear", "construction year"),
    vehicleClass: pickValue(row, "vehicleclass", "vehiclecl", "class"),
    category: pickValue(row, "category"),
    title: pickValue(row, "title", "listingtitle", "listing title"),
    make: pickValue(row, "make"),
    model: pickValue(row, "model"),
    variant: pickValue(row, "variant"),
    series: pickValue(row, "series"),
    condition: pickValue(row, "condition", "vehiclecondition"),
    mileage: pickValue(
      row,
      "mileage",
      "odometer",
      "odometerreading",
      "odometer reading",
      "kms",
      "kilometers"
    ),
    price: pickValue(row, "price", "saleprice", "driveawayprice", "drive away price"),
    isDriveAway: pickValue(row, "isdriveaway", "isdriveaw", "driveaway"),
    status: pickValue(row, "status", "listingstatus"),
    description: pickValue(row, "description", "desc", "comments", "listingdescription"),
    transmission: pickValue(row, "transmission"),
    transmissionSpeeds: pickValue(
      row,
      "numberofspeeds",
      "number of speeds",
      "speeds",
      "gears"
    ),
    fuelType: pickValue(row, "fueltype", "fuel type", "fuel"),
    driveType: pickValue(row, "drivetrain", "drivetype", "drive type"),
    engineCapacity: pickValue(
      row,
      "enginecapacity",
      "engine capacity",
      "enginecapacitylitres",
      "engine capacity litres",
      "enginelitres"
    ),
    engineCylinders: pickValue(
      row,
      "enginecylinders",
      "engine cylinders",
      "cylinders"
    ),
    bodyType: pickValue(row, "bodytype", "body type"),
    seats: pickValue(row, "seats"),
    doors: pickValue(row, "doors"),
    exteriorColor: pickValue(
      row,
      "exteriorcolour",
      "exterior color",
      "exteriorcolouroptional",
      "colour",
      "color"
    ),
    interiorColor: pickValue(
      row,
      "interiorcolour",
      "interior color",
      "interiorcolouroptional"
    ),
    registered: pickValue(row, "registered", "isregistered"),
    registrationNumber: pickValue(
      row,
      "registrationnumber",
      "registration number",
      "rego",
      "regnumber"
    ),
    registrationExpiry: pickValue(
      row,
      "registrationexpiry",
      "registration expiry",
      "regoexpiry",
      "reg expiry"
    ),
    location: pickValue(row, "location", "suburb", "city"),
    views: pickValue(row, "views"),
    adHealth: pickValue(row, "adhealth"),
    imageCount: pickValue(row, "imagecount", "imagecou", "images"),
    imageUrls: [...new Set(imageUrls)],
    raw: extra,
  };
}
