/** Predefined pickup/drop-off locations — primary location matches homepage map */
import { dealershipLocation } from "@/lib/site-map";

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
