import { NextRequest, NextResponse } from "next/server";
import { cancelUnpaidRentalBooking } from "@/lib/rentals/stripe-checkout";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await cancelUnpaidRentalBooking(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel booking";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
