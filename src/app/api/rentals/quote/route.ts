import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteRentalBooking } from "@/lib/rentals/rental-options-service";
import { parseSelectedRentalOptions } from "@/lib/rentals/option-catalog";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  vehicleId: z.string().min(1),
  pickupDateTime: z.string().min(1),
  dropoffDateTime: z.string().min(1),
  selectedOptions: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive().max(10),
      })
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid quote request" }, { status: 400 });
    }

    const pickupAt = new Date(parsed.data.pickupDateTime);
    const dropoffAt = new Date(parsed.data.dropoffDateTime);

    const quote = await quoteRentalBooking({
      vehicleId: parsed.data.vehicleId,
      pickupAt,
      dropoffAt,
      selectedOptions: parseSelectedRentalOptions(parsed.data.selectedOptions),
    });

    return NextResponse.json({
      success: true,
      data: quote.breakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quote failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
