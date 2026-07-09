import type { Vehicle } from "@/types";

const FLEET_STOCK_IMAGES = {
  mgZs: "/images/fleet/mg-zs.png",
  pradoGx: "/images/fleet/toyota-prado-gx.png",
  pradoGxl: "/images/fleet/toyota-prado-gxl.png",
  haval: "/images/fleet/gwm-haval.png",
} as const;

function vehicleSearchText(vehicle: Vehicle): string {
  return `${vehicle.make} ${vehicle.model}`.toLowerCase();
}

export function isRentalVehicleAvailable(vehicle: Vehicle): boolean {
  return (vehicle.availableUnits ?? vehicle.totalUnits ?? 1) > 0;
}

export function getOurCarImage(vehicle: Vehicle): string {
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

  return FLEET_STOCK_IMAGES.mgZs;
}

export function getRentalCarCategory(vehicle: Vehicle): string {
  if (vehicle.vehicleTypeName?.trim()) {
    return vehicle.vehicleTypeName.trim().toUpperCase();
  }

  return vehicle.bodyType.toUpperCase();
}

export function getRentalCarTitle(vehicle: Vehicle): string {
  const text = vehicleSearchText(vehicle);

  if (text.includes("mg") && text.includes("zs")) {
    return "MG ZS or similar medium car";
  }

  if (text.includes("prado")) {
    return "Toyota Prado GX or similar SUV";
  }

  return `${vehicle.make} ${vehicle.model} or similar`;
}

export function getRentalLuggageCount(vehicle: Vehicle): number {
  const text = vehicleSearchText(vehicle);

  if (text.includes("mg") && text.includes("zs")) {
    return 2;
  }

  if (text.includes("prado")) {
    return 3;
  }

  if (vehicle.bodyType === "SUV" || vehicle.bodyType === "Ute" || vehicle.bodyType === "Van" || vehicle.bodyType === "Wagon") {
    return 3;
  }

  if (vehicle.seats >= 7) {
    return 4;
  }

  return 2;
}

export function formatRentalStartingPrice(price: number): string {
  return `$ ${price.toFixed(2)}`;
}
