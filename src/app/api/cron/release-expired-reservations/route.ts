import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredVehicleReservations } from "@/lib/vehicles/reservation-service";
import { releaseExpiredRentalHolds } from "@/lib/rentals/fleet-inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Scheduled cleanup — run every minute via external cron or platform scheduler.
 * Example: curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/release-expired-reservations
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const releasedVehicles = await releaseExpiredVehicleReservations();
  const releasedRentalHolds = await releaseExpiredRentalHolds();

  return NextResponse.json({
    success: true,
    releasedVehicles,
    releasedRentalHolds,
    ranAt: new Date().toISOString(),
  });
}
