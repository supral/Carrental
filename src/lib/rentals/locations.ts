/** Predefined pickup/drop-off locations — primary location matches homepage map */
import { dealershipLocation } from "@/lib/site-map";

/** Default pickup/drop-off text shown in rental search and booking forms */
export const DEFAULT_RENTAL_ADDRESS = "Darwin, NT";

export const RENTAL_LOCATIONS = [
  dealershipLocation,
  {
    id: "darwin-airport",
    label: "Darwin Airport",
    address: "1 Henry Wrigley Dr, Eaton NT 0820",
  },
  {
    id: "darwin-cbd",
    label: "Darwin CBD",
    address: "Smith Street, Darwin City NT 0800",
  },
] as const;

export type RentalLocationOption = {
  id: string;
  label: string;
  value: string;
};

/** Options shown in pickup/drop-off location dropdowns */
export const RENTAL_LOCATION_OPTIONS: RentalLocationOption[] = [
  {
    id: dealershipLocation.id,
    label: DEFAULT_RENTAL_ADDRESS,
    value: DEFAULT_RENTAL_ADDRESS,
  },
  {
    id: "darwin-airport",
    label: "Darwin Airport",
    value: "1 Henry Wrigley Dr, Eaton NT 0820",
  },
  {
    id: "darwin-cbd",
    label: "Darwin CBD",
    value: "Smith Street, Darwin City NT 0800",
  },
];

export function resolveRentalLocationValue(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return DEFAULT_RENTAL_ADDRESS;

  const match = RENTAL_LOCATION_OPTIONS.find(
    (option) => option.value === trimmed || option.label === trimmed
  );
  if (match) return match.value;

  if (trimmed === dealershipLocation.address) return DEFAULT_RENTAL_ADDRESS;

  return trimmed;
}

export function getRentalLocationLabel(value: string): string {
  const resolved = resolveRentalLocationValue(value);
  const option = RENTAL_LOCATION_OPTIONS.find((entry) => entry.value === resolved);
  return option?.label ?? value;
}

/** Value bound to location dropdowns — always one of the predefined options */
export function getRentalLocationSelectValue(address: string): string {
  const resolved = resolveRentalLocationValue(address);
  return RENTAL_LOCATION_OPTIONS.some((option) => option.value === resolved)
    ? resolved
    : DEFAULT_RENTAL_ADDRESS;
}

export { dealershipLocation };

export const RENTAL_TIME_OPTIONS = (() => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    for (const minute of ["00", "30"]) {
      slots.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
  }
  return slots;
})();

export function formatRentalTimeLabel(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${suffix}`;
}
