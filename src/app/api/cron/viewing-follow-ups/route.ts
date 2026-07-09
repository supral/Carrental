import { NextRequest, NextResponse } from "next/server";
import { processCompletedViewingFollowUps } from "@/lib/sales/viewing-follow-up";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Notify admins when scheduled viewings have ended and need follow-up.
 * Example: curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/viewing-follow-ups
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

  const result = await processCompletedViewingFollowUps();

  return NextResponse.json({
    success: true,
    ...result,
    ranAt: new Date().toISOString(),
  });
}
