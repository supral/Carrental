import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVehicleRentalOptionsForBooking } from "@/lib/rentals/rental-options-service";
import { getEnabledVehicleOptions } from "@/lib/rentals/option-catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vehicle = await getVehicleRentalOptionsForBooking(id);
    const enabled = getEnabledVehicleOptions(vehicle.options);

    return NextResponse.json({
      success: true,
      data: {
        vehicleId: vehicle.vehicleId,
        pricePerDayAud: vehicle.pricePerDayAud,
        options: vehicle.options,
        enabledOptions: enabled,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load rental options";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
