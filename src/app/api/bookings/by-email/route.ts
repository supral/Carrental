import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerBookingsByEmail } from "@/lib/bookings/customer-bookings-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
    }

    const data = await getCustomerBookingsByEmail(parsed.data.email);

    return NextResponse.json({
      success: true,
      data: {
        email: parsed.data.email,
        saleBookings: data.saleBookings,
        rentalBookings: data.rentalBookings,
        totalCount: data.saleBookings.length + data.rentalBookings.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
