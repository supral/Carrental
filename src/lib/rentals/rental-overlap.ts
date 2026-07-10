import { Prisma, RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { siteConfig } from "@/data/services";
import { formatVehicleName } from "@/lib/vehicles/display";
import { format } from "date-fns";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";
import { RENTAL_TRANSACTION_OPTIONS } from "@/lib/rentals/transaction-options";
import {
  assertFleetUnitsAvailable,
  blockingRentalBookingFilter,
  countActiveReservations,
  getFleetAvailability,
  rentalDateOverlapFilter,
} from "@/lib/rentals/fleet-inventory";
import { handleRentalBookingStatusChange } from "@/lib/rentals/rental-inventory-units";

export { RentalUnavailableError } from "@/lib/rentals/rental-errors";

type DateRange = { pickupAt: Date; dropoffAt: Date };

export function rentalOverlapFilter(
  vehicleId: string,
  { pickupAt, dropoffAt }: DateRange,
  excludeBookingId?: string
): Prisma.RentalBookingWhereInput {
  return {
    vehicleId,
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    ...rentalDateOverlapFilter(pickupAt, dropoffAt),
    ...blockingRentalBookingFilter(),
  };
}

/** @deprecated Use fleet inventory — returns vehicle IDs with zero available units for the range. */
export async function getPaidBookedVehicleIds(pickupAt: Date, dropoffAt: Date): Promise<string[]> {
  const rentals = await prisma.vehicle.findMany({
    where: { listingPurpose: "RENTAL", status: "ACTIVE" },
    select: { id: true, totalUnits: true },
  });

  const unavailable: string[] = [];

  for (const vehicle of rentals) {
    const { availableUnits } = await getFleetAvailability(vehicle.id, { pickupAt, dropoffAt });
    if (availableUnits <= 0) {
      unavailable.push(vehicle.id);
    }
  }

  return unavailable;
}

export async function hasPaidOverlappingRental(
  vehicleId: string,
  range: DateRange,
  excludeBookingId?: string,
  client: Prisma.TransactionClient = prisma
) {
  const { availableUnits } = await getFleetAvailability(vehicleId, range, {
    excludeBookingId,
    client,
  });

  return availableUnits <= 0;
}

async function notifyRentalBookingCancelled(
  booking: {
    customerEmail: string;
    customerName: string | null;
    pickupAt: Date;
    dropoffAt: Date;
    vehicle: { title: string | null; make: string; model: string; year: number; vehicleNumber: string | null };
  },
  reason: string
) {
  const vehicleName = formatVehicleName(booking.vehicle);
  await sendEmail({
    to: booking.customerEmail,
    subject: `Rental unavailable — ${vehicleName}`,
    text: [
      `Hi ${booking.customerName ?? "there"},`,
      ``,
      reason,
      ``,
      `Vehicle: ${vehicleName}`,
      `Dates: ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")} to ${format(booking.dropoffAt, "dd MMM yyyy, h:mm a")}`,
      ``,
      `Please search for another vehicle or choose different dates.`,
      siteConfig.name,
    ].join("\n"),
  });
}

/**
 * Atomically confirm payment for one rental booking. If fleet capacity is full for
 * overlapping dates, this booking is cancelled and an error is thrown.
 */
export async function claimRentalBookingPayment(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.rentalBooking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const previousStatus = booking.status;

    if (booking.status === RentalBookingStatus.CANCELLED) {
      throw new RentalUnavailableError("This booking has been cancelled.");
    }

    if (booking.paymentStatus === RentalPaymentStatus.PAID) {
      return { confirmed: booking, cancelledLosers: [] };
    }

    const range = { pickupAt: booking.pickupAt, dropoffAt: booking.dropoffAt };

    await tx.$executeRaw`
      SELECT id FROM "Vehicle"
      WHERE id = ${booking.vehicleId}
      FOR UPDATE
    `;

    await tx.$executeRaw`
      SELECT id FROM "RentalBooking"
      WHERE "vehicleId" = ${booking.vehicleId}
        AND status NOT IN ('CANCELLED', 'COMPLETED')
        AND "pickupAt" < ${booking.dropoffAt}
        AND "dropoffAt" > ${booking.pickupAt}
      FOR UPDATE
    `;

    try {
      await assertFleetUnitsAvailable(booking.vehicleId, range, {
        excludeBookingId: booking.id,
        client: tx,
      });
    } catch {
      await tx.rentalBooking.update({
        where: { id: booking.id },
        data: { status: RentalBookingStatus.CANCELLED },
      });

      throw new RentalUnavailableError();
    }

    const confirmed = await tx.rentalBooking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: RentalPaymentStatus.PAID,
        status: RentalBookingStatus.CONFIRMED,
        paidAt: new Date(),
      },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
          },
        },
      },
    });

    await handleRentalBookingStatusChange(
      booking.id,
      previousStatus,
      RentalBookingStatus.CONFIRMED,
      tx
    );

    const losers = await tx.rentalBooking.findMany({
      where: {
        ...rentalOverlapFilter(booking.vehicleId, range, booking.id),
        paymentStatus: { not: RentalPaymentStatus.PAID },
      },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (losers.length > 0) {
      for (const loser of losers) {
        const loserPrevious = loser.status;
        await tx.rentalBooking.update({
          where: { id: loser.id },
          data: { status: RentalBookingStatus.CANCELLED },
        });
        await handleRentalBookingStatusChange(
          loser.id,
          loserPrevious,
          RentalBookingStatus.CANCELLED,
          tx
        );
      }
    }

    return { confirmed, cancelledLosers: losers };
  }, RENTAL_TRANSACTION_OPTIONS);
}

export async function sendRentalLoserNotifications(
  losers: Array<{
    customerEmail: string;
    customerName: string | null;
    pickupAt: Date;
    dropoffAt: Date;
    vehicle: { title: string | null; make: string; model: string; year: number; vehicleNumber: string | null };
  }>
) {
  await Promise.all(
    losers.map((booking) =>
      notifyRentalBookingCancelled(
        booking,
        "Another customer completed payment for this vehicle during your selected rental period, so your booking could not be completed."
      )
    )
  );
}

export { countActiveReservations, getFleetAvailability };
