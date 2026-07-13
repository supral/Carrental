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

export type ReservationInterval = {
  pickupAt: Date;
  dropoffAt: Date;
};

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

/**
 * Peak number of bookings that are simultaneously active.
 * This is the source of truth for whether another unit can be booked.
 */
export function getPeakConcurrentReservations(bookings: ReservationInterval[]): number {
  if (bookings.length === 0) return 0;

  type Event = { time: number; delta: number };
  const events: Event[] = [];

  for (const booking of bookings) {
    events.push({ time: booking.pickupAt.getTime(), delta: 1 });
    events.push({ time: booking.dropoffAt.getTime(), delta: -1 });
  }

  // Process releases before starts at the same timestamp so back-to-back rentals don't stack.
  events.sort((a, b) => a.time - b.time || a.delta - b.delta);

  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }

  return peak;
}

/**
 * Date-range availability from total fleet size vs peak concurrent overlapping bookings.
 * Does not use Vehicle.availableUnits (that counter is inventory-hold state, not date-specific).
 */
export function computeDateRangeAvailability(
  totalUnits: number | null | undefined,
  peakReservedUnits: number
): FleetAvailability {
  const total = Math.max(1, totalUnits ?? 1);
  const reservedUnits = Math.max(0, Math.min(total, peakReservedUnits));
  return {
    totalUnits: total,
    reservedUnits,
    availableUnits: Math.max(0, total - reservedUnits),
  };
}

export function isFullyBooked(availability: FleetAvailability): boolean {
  return availability.availableUnits <= 0;
}

async function listOverlappingBlockingBookings(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<ReservationInterval[]> {
  const client = options?.client ?? prisma;

  return client.rentalBooking.findMany({
    where: {
      vehicleId,
      ...(options?.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      ...rentalDateOverlapFilter(range.pickupAt, range.dropoffAt),
      ...blockingRentalBookingFilter(options?.now),
    },
    select: { pickupAt: true, dropoffAt: true },
  });
}

/** @deprecated Prefer getPeakReservedUnitsForRange — kept as alias for peak concurrent reserved units. */
export async function countActiveReservations(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<number> {
  return getPeakReservedUnitsForRange(vehicleId, range, options);
}

export async function getPeakReservedUnitsForRange(
  vehicleId: string,
  range: DateRange,
  options?: {
    excludeBookingId?: string;
    client?: Prisma.TransactionClient;
    now?: Date;
  }
): Promise<number> {
  const bookings = await listOverlappingBlockingBookings(vehicleId, range, options);
  return getPeakConcurrentReservations(bookings);
}

/** Batch fleet availability for search — peak concurrent per vehicle over the range. */
export async function getFleetAvailabilityBatch(
  vehicleIds: string[],
  range: DateRange,
  now = new Date()
): Promise<Map<string, FleetAvailability>> {
  const result = new Map<string, FleetAvailability>();
  if (vehicleIds.length === 0) {
    return result;
  }

  const [vehicles, bookings, fleetCounts] = await Promise.all([
    prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, totalUnits: true },
    }),
    prisma.rentalBooking.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        ...rentalDateOverlapFilter(range.pickupAt, range.dropoffAt),
        ...blockingRentalBookingFilter(now),
      },
      select: { vehicleId: true, pickupAt: true, dropoffAt: true },
    }),
    prisma.fleetVehicle.groupBy({
      by: ["vehicleId"],
      where: {
        vehicleId: { in: vehicleIds },
        status: { in: ["AVAILABLE", "RENTED", "RESERVED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const bookingsByVehicle = new Map<string, ReservationInterval[]>();
  for (const booking of bookings) {
    const list = bookingsByVehicle.get(booking.vehicleId) ?? [];
    list.push({ pickupAt: booking.pickupAt, dropoffAt: booking.dropoffAt });
    bookingsByVehicle.set(booking.vehicleId, list);
  }

  const fleetCountByVehicle = new Map(
    fleetCounts.map((row) => [row.vehicleId, row._count._all] as const)
  );

  for (const vehicle of vehicles) {
    const peak = getPeakConcurrentReservations(bookingsByVehicle.get(vehicle.id) ?? []);
    const fleetTotal = fleetCountByVehicle.get(vehicle.id) ?? 0;
    const total = fleetTotal > 0 ? fleetTotal : Math.max(1, vehicle.totalUnits ?? 1);
    result.set(vehicle.id, computeDateRangeAvailability(total, peak));
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

  const [vehicle, peakReserved, fleetCount] = await Promise.all([
    client.vehicle.findUnique({
      where: { id: vehicleId },
      select: { totalUnits: true },
    }),
    getPeakReservedUnitsForRange(vehicleId, range, options),
    client.fleetVehicle.count({
      where: {
        vehicleId,
        status: { in: ["AVAILABLE", "RENTED", "RESERVED"] },
      },
    }),
  ]);

  const totalFromFleet = fleetCount > 0 ? fleetCount : Math.max(1, vehicle?.totalUnits ?? 1);
  return computeDateRangeAvailability(totalFromFleet, peakReserved);
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

  if (isFullyBooked(availability)) {
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

  return getPeakConcurrentReservations(bookings);
}

/** Minimum totalUnits required so no active booking window exceeds fleet size. */
export async function getMinimumRequiredTotalUnits(vehicleId: string, now = new Date()): Promise<number> {
  const peak = await getPeakReservedUnits(vehicleId, now);
  return Math.max(1, peak);
}

/** Admin snapshot: fleet size vs peak concurrent occupancy (date-aware). */
export async function getFleetInventorySnapshot(
  vehicleId: string,
  now = new Date()
): Promise<FleetAvailability> {
  const [vehicle, peakReserved] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { totalUnits: true },
    }),
    getPeakReservedUnits(vehicleId, now),
  ]);

  return computeDateRangeAvailability(vehicle?.totalUnits, peakReserved);
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
