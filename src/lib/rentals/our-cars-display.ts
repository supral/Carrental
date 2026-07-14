import type { Vehicle } from "@/types";
import { FLEET_STOCK_IMAGE_URLS } from "@/lib/rentals/fleet-stock-images";

const FLEET_STOCK_IMAGES = {
  mgZs: FLEET_STOCK_IMAGE_URLS["mg-zs"],
  pradoGx: FLEET_STOCK_IMAGE_URLS["toyota-prado-gx"],
  pradoGxl: FLEET_STOCK_IMAGE_URLS["toyota-prado-gxl"],
  haval: FLEET_STOCK_IMAGE_URLS["gwm-haval"],
} as const;

function vehicleSearchText(vehicle: Vehicle): string {
  return `${vehicle.title ?? ""} ${vehicle.make} ${vehicle.model}`.toLowerCase();
}

function isPlaceholderImage(url: string): boolean {
  return (
    url.includes("everest-logo") ||
    url.endsWith("/images/fleet/mg-zs.png") ||
    Object.values(FLEET_STOCK_IMAGES).some((stock) => url === stock)
  );
}

export function isRentalVehicleAvailable(vehicle: Vehicle): boolean {
  return (vehicle.availableUnits ?? vehicle.totalUnits ?? 1) > 0;
}

export function getOurCarImage(vehicle: Vehicle): string {
  const uploaded = vehicle.images?.[0] || vehicle.image;
  if (uploaded && !isPlaceholderImage(uploaded)) {
    return uploaded;
  }

  const text = vehicleSearchText(vehicle);

  if (text.includes("mg") && text.includes("zs")) {
    return FLEET_STOCK_IMAGES.mgZs;
  }

  if (text.includes("prado") && text.includes("gxl")) {
    return FLEET_STOCK_IMAGES.pradoGxl;
  }

  if (text.includes("prado") || text.includes("land cruiser")) {
    return FLEET_STOCK_IMAGES.pradoGx;
  }

  if (text.includes("haval") || text.includes("gwm") || text.includes("hilux") || text.includes("hili")) {
    return FLEET_STOCK_IMAGES.haval;
  }

  if (vehicle.bodyType === "SUV" || vehicle.bodyType === "Ute") {
    return FLEET_STOCK_IMAGES.pradoGx;
  }

  if (vehicle.bodyType === "Sedan" || vehicle.bodyType === "Hatchback") {
    return FLEET_STOCK_IMAGES.mgZs;
  }

  if (vehicle.bodyType === "Wagon" || vehicle.bodyType === "Van") {
    return FLEET_STOCK_IMAGES.haval;
  }

  return uploaded || FLEET_STOCK_IMAGES.mgZs;
}

export function getRentalCarCategory(vehicle: Vehicle): string {
  if (vehicle.vehicleTypeName?.trim()) {
    return vehicle.vehicleTypeName.trim().toUpperCase();
  }

  return vehicle.bodyType.toUpperCase();
}

export function getRentalCarTitle(vehicle: Vehicle): string {
  const title = vehicle.title?.trim();
  if (title) {
    return title;
  }

  const text = vehicleSearchText(vehicle);

  if (text.includes("mg") && text.includes("zs")) {
    return "MG ZS or similar medium car";
  }

  if (text.includes("prado")) {
    return "Toyota Prado GX or similar SUV";
  }

  return `${vehicle.make} ${vehicle.model}`.trim();
}

export function getRentalLuggageCount(vehicle: Vehicle): number {
  const fromFeatures = vehicle.features?.find((feature) =>
    /luggage|bag|suitcase/i.test(feature)
  );
  if (fromFeatures) {
    const match = fromFeatures.match(/(\d+)/);
    if (match) return Number(match[1]);
  }

  const text = vehicleSearchText(vehicle);

  if (text.includes("mg") && text.includes("zs")) {
    return 2;
  }

  if (text.includes("prado")) {
    return 3;
  }

  if (
    vehicle.bodyType === "SUV" ||
    vehicle.bodyType === "Ute" ||
    vehicle.bodyType === "Van" ||
    vehicle.bodyType === "Wagon"
  ) {
    return 3;
  }

  if (vehicle.seats >= 7) {
    return 4;
  }

  return 2;
}

/** Features shown on the public rental card (managed on Vehicle Types). */
export function getRentalCardFeatures(vehicle: Vehicle): string[] {
  const configured = (vehicle.features ?? []).map((feature) => feature.trim()).filter(Boolean);
  if (configured.length > 0) {
    return configured.slice(0, 4);
  }

  const transmissionLabel = vehicle.transmission === "Automatic" ? "Automatic" : "Manual";
  return [
    "A/C",
    `${vehicle.seats} passengers`,
    `${getRentalLuggageCount(vehicle)} luggage`,
    transmissionLabel,
  ];
}

export function formatRentalStartingPrice(price: number): string {
  return `$ ${price.toFixed(2)}`;
}
