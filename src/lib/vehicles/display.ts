import type { Vehicle } from "@/types";

type VehicleNameParts = Pick<Vehicle, "year" | "make" | "model"> & {
  vehicleNumber?: string | null;
  title?: string | null;
  listingPurpose?: "sale" | "rental" | string | null;
};

function isRentalPlaceholderName(make: string, model: string): boolean {
  const m = make.trim().toLowerCase();
  const d = model.trim().toLowerCase();
  return (m === "rental" && d === "type") || m === "rental";
}

export function formatVehicleName(vehicle: VehicleNameParts): string {
  const title = vehicle.title?.trim();
  const make = vehicle.make?.trim() ?? "";
  const model = vehicle.model?.trim() ?? "";
  const purpose = String(vehicle.listingPurpose ?? "").toLowerCase();

  // Rental vehicle types store the customer-facing name in `title` (e.g. Prado).
  // Older rows used placeholder make/model "Rental" / "Type".
  if (
    title &&
    (purpose === "rental" || isRentalPlaceholderName(make, model))
  ) {
    return title;
  }

  if (title && (!make || !model)) {
    return title;
  }

  const base = `${vehicle.year} ${make} ${model}`.replace(/\s+/g, " ").trim();
  const number = vehicle.vehicleNumber?.trim();
  if (number) {
    return `${base} (${number.toUpperCase()})`;
  }
  return base;
}

export function formatVehicleNumberLabel(vehicleNumber?: string | null): string | null {
  const number = vehicleNumber?.trim();
  return number ? number.toUpperCase() : null;
}
