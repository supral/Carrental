import { Prisma, RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RESERVATION_TTL_MS } from "@/lib/vehicles/reservation-constants";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";

export const NO_VEHICLES_AVAILABLE_MESSAGE = "No vehicles available for the selected dates.";

export type DateRange = { pickupAt: Date; dropoffAt: Date };

export interface FleetAvailability {
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

/** Statuses that block a fleet unit for overlapping dates. */
export const BLOCKING_RENTAL_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.PENDING,
  RentalBookingStatus.RESERVED,
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.ACTIVE,
];

export function rentalDateOverlapFilter(
  pickupAt: Date,
  dropoffAt: Date
): Pick<Prisma.RentalBookingWhereInput, "pickupAt" | "dropoffAt"> {
  return {
    pickupAt: { lt: dropoffAt },
    dropoffAt: { gt: pickupAt },
  };
}

function pendingHoldCutoff(now = new Date()) {
  return new Date(now.getTime() - RESERVATION_TTL_MS);
}

/**
 * Bookings that consume fleet inventory for a date range.
 * Cancelled, completed, failed, and expired pending holds are excluded.
 */
export function blockingRentalBookingFilter(now = new Date()): Prisma.RentalBookingWhereInput {
  const holdCutoff = pendingHoldCutoff(now);

  return {
    status: { in: BLOCKING_RENTAL_STATUSES },
    NOT: {
      OR: [
        { status: RentalBookingStatus.PENDING, paymentStatus: RentalPaymentStatus.FAILED },
        {
          status: RentalBookingStatus.PENDING,
          paymentStatus: RentalPaymentStatus.UNPAID,
          createdAt: { lt: holdCutoff },
        },
      ],
    },
  };
}

export async function countActiveReservations(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<number> {
  const client = options?.client ?? prisma;

  return client.rentalBooking.count({
    where: {
      vehicleId,
      ...(options?.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      ...rentalDateOverlapFilter(range.pickupAt, range.dropoffAt),
      ...blockingRentalBookingFilter(options?.now),
    },
  });
}

function computeFleetAvailability(
  vehicle: { totalUnits: number | null; availableUnits: number | null },
  reservedForRange: number
): FleetAvailability {
  const totalUnits = Math.max(1, vehicle.totalUnits ?? 1);
  const storedAvailable = Math.max(0, vehicle.availableUnits ?? totalUnits);
  const rangeAvailable = Math.max(0, totalUnits - reservedForRange);
  const availableUnits = Math.min(storedAvailable, rangeAvailable);
  const reservedUnits = totalUnits - availableUnits;

  return { totalUnits, reservedUnits, availableUnits };
}

/** Batch fleet availability for search — 2 queries instead of 2 per vehicle. */
export async function getFleetAvailabilityBatch(
  vehicleIds: string[],
  range: DateRange,
  now = new Date()
): Promise<Map<string, FleetAvailability>> {
  const result = new Map<string, FleetAvailability>();
  if (vehicleIds.length === 0) {
    return result;
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, totalUnits: true, availableUnits: true },
  });

  const reservationCounts = await prisma.rentalBooking.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      ...rentalDateOverlapFilter(range.pickupAt, range.dropoffAt),
      ...blockingRentalBookingFilter(now),
    },
    _count: { _all: true },
  });

  const reservedByVehicleId = new Map(
    reservationCounts.map((row) => [row.vehicleId, row._count._all])
  );

  for (const vehicle of vehicles) {
    result.set(
      vehicle.id,
      computeFleetAvailability(vehicle, reservedByVehicleId.get(vehicle.id) ?? 0)
    );
  }

  return result;
}

export async function getFleetAvailability(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<FleetAvailability> {
  const client = options?.client ?? prisma;

  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { totalUnits: true, availableUnits: true },
  });

  const reservedForRange = await countActiveReservations(vehicleId, range, options);

  return computeFleetAvailability(
    vehicle ?? { totalUnits: 1, availableUnits: 1 },
    reservedForRange
  );
}

export async function assertFleetUnitsAvailable(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<FleetAvailability> {
  const availability = await getFleetAvailability(vehicleId, range, options);

  if (availability.availableUnits <= 0) {
    throw new RentalUnavailableError(NO_VEHICLES_AVAILABLE_MESSAGE);
  }

  return availability;
}

/** Peak concurrent blocking bookings across all active reservation windows. */
export async function getPeakReservedUnits(vehicleId: string, now = new Date()): Promise<number> {
  const bookings = await prisma.rentalBooking.findMany({
    where: {
      vehicleId,
      ...blockingRentalBookingFilter(now),
    },
    select: { pickupAt: true, dropoffAt: true },
  });

  if (bookings.length === 0) return 0;

  type Event = { time: number; delta: number };
  const events: Event[] = [];

  for (const booking of bookings) {
    events.push({ time: booking.pickupAt.getTime(), delta: 1 });
    events.push({ time: booking.dropoffAt.getTime(), delta: -1 });
  }

  events.sort((a, b) => a.time - b.time || a.delta - b.delta);

  let current = 0;
  let peak = 0;

  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }

  return peak;
}

/** Minimum totalUnits required so no active booking window exceeds fleet size. */
export async function getMinimumRequiredTotalUnits(vehicleId: string, now = new Date()): Promise<number> {
  const peak = await getPeakReservedUnits(vehicleId, now);
  return Math.max(1, peak);
}

/** Admin snapshot: current fleet size vs peak reserved units (not date-specific). */
export async function getFleetInventorySnapshot(
  vehicleId: string,
  now = new Date()
): Promise<FleetAvailability> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { totalUnits: true, availableUnits: true },
  });

  const totalUnits = Math.max(1, vehicle?.totalUnits ?? 1);
  const availableUnits = Math.max(0, vehicle?.availableUnits ?? totalUnits);
  const reservedUnits = totalUnits - availableUnits;

  return { totalUnits, reservedUnits, availableUnits };
}

/** Cancel unpaid pending bookings past the checkout hold window. */
export async function releaseExpiredRentalHolds(now = new Date()) {
  const holdCutoff = pendingHoldCutoff(now);

  const expired = await prisma.rentalBooking.findMany({
    where: {
      status: RentalBookingStatus.PENDING,
      paymentStatus: RentalPaymentStatus.UNPAID,
      createdAt: { lt: holdCutoff },
    },
    select: { id: true, status: true },
  });

  for (const booking of expired) {
    await prisma.$transaction(async (tx) => {
      const { handleRentalBookingStatusChange } = await import(
        "@/lib/rentals/rental-inventory-units"
      );
      await tx.rentalBooking.update({
        where: { id: booking.id },
        data: { status: RentalBookingStatus.CANCELLED },
      });
      await handleRentalBookingStatusChange(
        booking.id,
        booking.status,
        RentalBookingStatus.CANCELLED,
        tx
      );
    });
  }

  return expired.length;
}
