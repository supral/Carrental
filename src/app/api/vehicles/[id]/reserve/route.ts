import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListingPurpose } from "@prisma/client";
import { auth } from "@/lib/auth";
import {
  VehicleReservationConflictError,
  VehicleReservationInvalidError,
  reserveVehicle,
} from "@/lib/vehicles/reservation-service";
import { getReservationTokenFromHeaders } from "@/lib/vehicles/reservation-token";
import { RESERVATION_CONFLICT_MESSAGE } from "@/lib/vehicles/reservation-constants";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  purpose: z.enum([ListingPurpose.RENTAL, ListingPurpose.SALE]),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await context.params;
    const reservationToken = getReservationTokenFromHeaders(request.headers);

    if (!reservationToken) {
      return NextResponse.json(
        { message: "Missing reservation token" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid reservation request" }, { status: 400 });
    }

    const session = await auth();
    const reserved = await reserveVehicle({
      vehicleId,
      reservationToken,
      purpose: parsed.data.purpose,
      userId: session?.user?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      data: {
        vehicleId: reserved.id,
        inventoryStatus: reserved.inventoryStatus,
        reservationExpiresAt: reserved.reservationExpiresAt?.toISOString() ?? null,
        purpose: reserved.reservationPurpose,
      },
    });
  } catch (error) {
    if (error instanceof VehicleReservationConflictError) {
      return NextResponse.json(
        { message: RESERVATION_CONFLICT_MESSAGE },
        { status: 409 }
      );
    }

    if (error instanceof VehicleReservationInvalidError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Reservation failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
