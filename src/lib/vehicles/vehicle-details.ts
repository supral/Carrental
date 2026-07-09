import { siteConfig } from "@/data/services";

export interface VehicleSpecSource {
  year: number;
  mileage: number;
  transmission: string;
  fuelType: string;
  bodyType: string;
  seats?: number;
  doors?: number;
  driveType?: string;
  condition?: string;
  color?: string;
  location?: string;
  listingPurpose?: "sale" | "rental";
}

export interface VehicleDetailSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface VehicleDetailsDocument {
  sections: VehicleDetailSection[];
}

type SpecKey =
  | "year"
  | "mileage"
  | "transmission"
  | "fuelType"
  | "bodyType"
  | "seats"
  | "doors"
  | "driveType"
  | "condition"
  | "color"
  | "location";

const SPEC_LABELS: Record<SpecKey, string> = {
  year: "Year",
  mileage: "Odometer",
  transmission: "Transmission",
  fuelType: "Fuel Type",
  bodyType: "Body Type",
  seats: "Seats",
  doors: "Doors",
  driveType: "Drive Type",
  condition: "Condition",
  color: "Colour",
  location: "Location",
};

/** Minimal sidebar specs shown per body type. */
const BODY_TYPE_SIDEBAR_KEYS: Record<string, SpecKey[]> = {
  Sedan: ["year", "transmission", "fuelType", "seats", "doors", "mileage", "condition"],
  SUV: ["year", "driveType", "fuelType", "seats", "transmission", "mileage", "condition"],
  Ute: ["year", "driveType", "fuelType", "transmission", "mileage", "condition"],
  Hatchback: ["year", "transmission", "fuelType", "seats", "mileage", "condition"],
  Wagon: ["year", "transmission", "fuelType", "seats", "doors", "mileage"],
  Van: ["year", "seats", "doors", "fuelType", "transmission", "mileage"],
  Coupe: ["year", "transmission", "fuelType", "mileage", "condition"],
  Convertible: ["year", "transmission", "fuelType", "seats", "mileage"],
};

const RENTAL_SIDEBAR_KEYS: SpecKey[] = [
  "year",
  "bodyType",
  "transmission",
  "fuelType",
  "seats",
  "doors",
  "location",
];

function formatSpecValue(vehicle: VehicleSpecSource, key: SpecKey): string | null {
  switch (key) {
    case "year":
      return String(vehicle.year);
    case "mileage":
      return vehicle.listingPurpose === "rental"
        ? null
        : `${vehicle.mileage.toLocaleString()} km`;
    case "seats":
      return vehicle.seats ? `${vehicle.seats}` : null;
    case "doors":
      return vehicle.doors ? `${vehicle.doors}` : null;
    case "transmission":
      return vehicle.transmission || null;
    case "fuelType":
      return vehicle.fuelType || null;
    case "bodyType":
      return vehicle.bodyType || null;
    case "driveType":
      return vehicle.driveType || null;
    case "condition":
      return vehicle.condition || null;
    case "color":
      return vehicle.color || null;
    case "location":
      return vehicle.location || null;
    default:
      return null;
  }
}

export function getVehicleSidebarSpecs(
  vehicle: VehicleSpecSource
): { label: string; value: string }[] {
  const keys =
    vehicle.listingPurpose === "rental"
      ? RENTAL_SIDEBAR_KEYS
      : BODY_TYPE_SIDEBAR_KEYS[vehicle.bodyType] ??
        BODY_TYPE_SIDEBAR_KEYS.Sedan ??
        ["year", "transmission", "fuelType", "mileage", "condition"];

  return keys
    .map((key) => {
      const value = formatSpecValue(vehicle, key);
      if (!value) return null;
      return { label: SPEC_LABELS[key], value };
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}

export function createDetailSectionId(): string {
  return `detail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseVehicleDetails(value: unknown): VehicleDetailsDocument {
  if (!value || typeof value !== "object") {
    return { sections: [] };
  }

  const raw = value as { sections?: unknown };
  if (!Array.isArray(raw.sections)) {
    return { sections: [] };
  }

  const sections = raw.sections
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const section = item as Record<string, unknown>;
      const title = typeof section.title === "string" ? section.title.trim() : "";
      const content = typeof section.content === "string" ? section.content.trim() : "";
      if (!title) return null;

      return {
        id:
          typeof section.id === "string" && section.id.trim()
            ? section.id.trim()
            : createDetailSectionId(),
        title,
        content,
        order: typeof section.order === "number" ? section.order : index,
      } satisfies VehicleDetailSection;
    })
    .filter((section): section is VehicleDetailSection => section !== null)
    .sort((a, b) => a.order - b.order);

  return { sections };
}

export function getDefaultDetailSections(
  bodyType: string,
  listingPurpose: "sale" | "rental" = "sale"
): VehicleDetailSection[] {
  if (listingPurpose === "rental") {
    return [
      {
        id: createDetailSectionId(),
        title: "Vehicle Overview",
        content: `This ${bodyType} is available for hire from ${siteConfig.name}.`,
        order: 0,
      },
      {
        id: createDetailSectionId(),
        title: "What's Included",
        content: "Standard insurance options, roadside assistance, and flexible pickup times are available at checkout.",
        order: 1,
      },
      {
        id: createDetailSectionId(),
        title: "Rental Requirements",
        content: "Valid driver's licence, minimum age requirements, and a security deposit may apply.",
        order: 2,
      },
    ];
  }

  return [
    {
      id: createDetailSectionId(),
      title: "Overview",
      content: `Quality ${bodyType} available from ${siteConfig.name}.`,
      order: 0,
    },
    {
      id: createDetailSectionId(),
      title: "Condition & History",
      content: "Add service history, condition notes, and any inspection details here.",
      order: 1,
    },
    {
      id: createDetailSectionId(),
      title: "Features & Equipment",
      content: "List key features such as air conditioning, safety tech, and interior equipment.",
      order: 2,
    },
  ];
}

export function detailsToLegacyFields(details: VehicleDetailsDocument): {
  description: string;
  features: string[];
} {
  if (details.sections.length === 0) {
    return { description: "", features: [] };
  }

  const description = details.sections
    .map((section) => `${section.title}\n${section.content}`.trim())
    .join("\n\n");

  const featuresSection = details.sections.find((section) =>
    /feature|equipment|included/i.test(section.title)
  );

  const features = featuresSection
    ? featuresSection.content
        .split(/[\n,•]/)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return { description, features };
}

export function legacyToVehicleDetails(
  description: string | null | undefined,
  features: string[] | null | undefined,
  bodyType: string,
  listingPurpose: "sale" | "rental" = "sale"
): VehicleDetailsDocument {
  const hasLegacy =
    (description && description.trim().length > 0) || (features && features.length > 0);

  if (!hasLegacy) {
    return { sections: [] };
  }

  const sections: VehicleDetailSection[] = [];

  if (description?.trim()) {
    sections.push({
      id: createDetailSectionId(),
      title: "Overview",
      content: description.trim(),
      order: 0,
    });
  }

  if (features && features.length > 0) {
    sections.push({
      id: createDetailSectionId(),
      title: listingPurpose === "rental" ? "What's Included" : "Features & Equipment",
      content: features.map((feature) => `• ${feature}`).join("\n"),
      order: 1,
    });
  }

  if (sections.length === 0) {
    return { sections: getDefaultDetailSections(bodyType, listingPurpose) };
  }

  return { sections };
}

export function mergeVehicleDetails(
  stored: unknown,
  description: string | null | undefined,
  features: string[] | null | undefined,
  bodyType: string,
  listingPurpose: "sale" | "rental" = "sale"
): VehicleDetailsDocument {
  const parsed = parseVehicleDetails(stored);
  if (parsed.sections.length > 0) {
    return parsed;
  }
  return legacyToVehicleDetails(description, features, bodyType, listingPurpose);
}
