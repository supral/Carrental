import type { Vehicle } from "@/types";

type VehicleNameParts = Pick<Vehicle, "year" | "make" | "model"> & {
  vehicleNumber?: string | null;
};

export function formatVehicleName(vehicle: VehicleNameParts): string {
  const base = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
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
