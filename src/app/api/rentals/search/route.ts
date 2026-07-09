import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchAvailableRentalVehicles } from "@/lib/rentals/availability-service";

export const dynamic = "force-dynamic";

const searchBodySchema = z.object({
  pickupAddress: z.string().trim().min(1),
  pickupDateTime: z.string().min(1),
  dropoffAddress: z.string().trim().min(1),
  dropoffDateTime: z.string().min(1),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = searchBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid search parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pickupAt = new Date(parsed.data.pickupDateTime);
    const dropoffAt = new Date(parsed.data.dropoffDateTime);
    const now = new Date();

    if (pickupAt < now) {
      return NextResponse.json({ success: false, error: "Pickup cannot be in the past" }, { status: 400 });
    }

    if (dropoffAt <= pickupAt) {
      return NextResponse.json({ success: false, error: "Drop-off must be after pickup" }, { status: 400 });
    }

    const result = await searchAvailableRentalVehicles(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
