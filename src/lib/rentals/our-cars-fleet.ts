import { cache } from "react";
import { getAvailableRentalFleet } from "@/lib/vehicles/public-vehicle-service";

export const getCachedAvailableRentalFleet = cache(getAvailableRentalFleet);
