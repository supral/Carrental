import { Vehicle } from "@/types";
import vehiclesData from "./vehicles.json";

export const vehicles: Vehicle[] = vehiclesData as Vehicle[];

export function getVehicleById(id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

export function getFeaturedVehicles(listingPurpose?: "sale" | "rental"): Vehicle[] {
  return vehicles.filter(
    (v) => v.featured && (!listingPurpose || v.listingPurpose === listingPurpose || (!v.listingPurpose && listingPurpose === "sale"))
  );
}

export function getVehiclesByIds(ids: string[]): Vehicle[] {
  return ids.map((id) => getVehicleById(id)).filter((v): v is Vehicle => !!v);
}
