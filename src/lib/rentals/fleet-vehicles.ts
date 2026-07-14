import { FleetVehicleStatus, Prisma, RentalBookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertFleetUnitsAvailable,
  blockingRentalBookingFilter,
  rentalDateOverlapFilter,
  type DateRange,
} from "@/lib/rentals/fleet-inventory";

const BOOKABLE_FLEET_STATUSES: FleetVehicleStatus[] = [
  FleetVehicleStatus.AVAILABLE,
  FleetVehicleStatus.RENTED,
  FleetVehicleStatus.RESERVED,
];

const BLOCKING_ASSIGNMENT_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.PENDING,
  RentalBookingStatus.RESERVED,
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
  RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
  RentalBookingStatus.READY_FOR_PICKUP,
  RentalBookingStatus.ACTIVE,
];

export function buildDefaultFleetNumber(make: string, model: string, sequence: number): string {
  const makePart = make.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "CAR";
  const modelPart = model.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "X";
  return `${makePart}${modelPart}-${String(sequence).padStart(3, "0")}`;
}

/** Count bookable physical units for a vehicle type (excludes maintenance / inactive). */
export async function countBookableFleetUnits(
  vehicleId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  return client.fleetVehicle.count({
    where: {
      vehicleId,
      status: { in: BOOKABLE_FLEET_STATUSES },
    },
  });
}

/** Sync Vehicle.totalUnits / availableUnits from physical fleet rows + peak occupancy. */
export async function syncVehicleFleetCountsFromUnits(
  vehicleId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const { syncVehicleAvailableUnits } = await import("@/lib/rentals/rental-inventory-units");
  const totalUnits = Math.max(1, await countBookableFleetUnits(vehicleId, client));
  await client.vehicle.update({
    where: { id: vehicleId },
    data: { totalUnits },
  });
  await syncVehicleAvailableUnits(vehicleId, client);
}

export async function ensureFleetUnitsForVehicle(
  vehicleId: string,
  desiredCount: number,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { make: true, model: true, color: true, location: true },
  });
  if (!vehicle) throw new Error("Vehicle type not found");

  const existing = await client.fleetVehicle.findMany({
    where: { vehicleId },
    select: { id: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const bookable = existing.filter((unit) => BOOKABLE_FLEET_STATUSES.includes(unit.status));
  const target = Math.max(1, desiredCount);

  if (bookable.length < target) {
    const toCreate = target - bookable.length;
    const startSeq = existing.length + 1;
    for (let i = 0; i < toCreate; i++) {
      const sequence = startSeq + i;
      let fleetNumber = buildDefaultFleetNumber(vehicle.make, vehicle.model, sequence);
      // Avoid unique collisions
      let attempt = 0;
      while (await client.fleetVehicle.findUnique({ where: { fleetNumber } })) {
        attempt += 1;
        fleetNumber = buildDefaultFleetNumber(vehicle.make, vehicle.model, sequence + attempt * 100);
      }
      await client.fleetVehicle.create({
        data: {
          vehicleId,
          fleetNumber,
          color: vehicle.color,
          branch: vehicle.location,
          status: FleetVehicleStatus.AVAILABLE,
        },
      });
    }
  }

  await syncVehicleFleetCountsFromUnits(vehicleId, client);
}

/**
 * Pick an available physical unit for the booking date range and attach it.
 * Capacity must already be asserted via assertFleetUnitsAvailable.
 */
export async function assignFleetVehicleToBooking(
  bookingId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const booking = await client.rentalBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      vehicleId: true,
      fleetVehicleId: true,
      pickupAt: true,
      dropoffAt: true,
      status: true,
    },
  });

  if (!booking) return null;
  if (booking.fleetVehicleId) return booking.fleetVehicleId;
  if (!BLOCKING_ASSIGNMENT_STATUSES.includes(booking.status)) return null;

  await assertFleetUnitsAvailable(
    booking.vehicleId,
    { pickupAt: booking.pickupAt, dropoffAt: booking.dropoffAt },
    { excludeBookingId: booking.id, client }
  );

  const candidates = await client.fleetVehicle.findMany({
    where: {
      vehicleId: booking.vehicleId,
      status: { in: BOOKABLE_FLEET_STATUSES },
    },
    orderBy: { fleetNumber: "asc" },
    select: { id: true, status: true },
  });

  if (candidates.length === 0) {
    throw new Error("No fleet units exist for this vehicle type");
  }

  const busy = await client.rentalBooking.findMany({
    where: {
      vehicleId: booking.vehicleId,
      id: { not: booking.id },
      fleetVehicleId: { not: null },
      ...rentalDateOverlapFilter(booking.pickupAt, booking.dropoffAt),
      ...blockingRentalBookingFilter(),
    },
    select: { fleetVehicleId: true },
  });
  const busyIds = new Set(busy.map((row) => row.fleetVehicleId).filter(Boolean) as string[]);

  const free = candidates.find(
    (unit) =>
      !busyIds.has(unit.id) &&
      (unit.status === FleetVehicleStatus.AVAILABLE || unit.status === FleetVehicleStatus.RESERVED)
  );

  // Prefer AVAILABLE; otherwise any non-busy bookable unit (staggered RENTED ok if dates free)
  const chosen =
    free ??
    candidates.find((unit) => !busyIds.has(unit.id) && unit.status !== FleetVehicleStatus.MAINTENANCE);

  if (!chosen) {
    throw new Error("No rental units available for the selected dates");
  }

  await client.rentalBooking.update({
    where: { id: booking.id },
    data: { fleetVehicleId: chosen.id },
  });

  await client.fleetVehicle.update({
    where: { id: chosen.id },
    data: { status: FleetVehicleStatus.RENTED },
  });

  return chosen.id;
}

/** Release a fleet unit when a booking no longer consumes it (cancel / complete). */
export async function releaseFleetVehicleFromBooking(
  bookingId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const booking = await client.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, fleetVehicleId: true, pickupAt: true, dropoffAt: true },
  });

  if (!booking?.fleetVehicleId) return;

  const otherActive = await client.rentalBooking.count({
    where: {
      fleetVehicleId: booking.fleetVehicleId,
      id: { not: booking.id },
      status: { in: BLOCKING_ASSIGNMENT_STATUSES },
      dropoffAt: { gt: new Date() },
    },
  });

  if (otherActive === 0) {
    await client.fleetVehicle.update({
      where: { id: booking.fleetVehicleId },
      data: { status: FleetVehicleStatus.AVAILABLE },
    });
  }
}

export type CreateFleetVehicleInput = {
  vehicleId: string;
  fleetNumber: string;
  registrationNumber?: string;
  vinNumber?: string;
  engineNumber?: string;
  odometer?: number;
  color?: string;
  purchaseDate?: Date | null;
  purchaseCostCents?: number | null;
  branch?: string;
  status?: FleetVehicleStatus;
  notes?: string;
};

export async function createFleetVehicleRecord(input: CreateFleetVehicleInput) {
  const fleetNumber = input.fleetNumber.trim().toUpperCase();
  if (!fleetNumber) throw new Error("Fleet number is required");

  const created = await prisma.fleetVehicle.create({
    data: {
      vehicleId: input.vehicleId,
      fleetNumber,
      registrationNumber: input.registrationNumber?.trim() || null,
      vinNumber: input.vinNumber?.trim() || null,
      engineNumber: input.engineNumber?.trim() || null,
      odometer: input.odometer ?? null,
      color: input.color?.trim() || null,
      purchaseDate: input.purchaseDate ?? null,
      purchaseCostCents: input.purchaseCostCents ?? null,
      branch: input.branch?.trim() || null,
      status: input.status ?? FleetVehicleStatus.AVAILABLE,
      notes: input.notes?.trim() || null,
    },
  });

  await syncVehicleFleetCountsFromUnits(input.vehicleId);
  return created;
}

export async function updateFleetVehicleRecord(
  id: string,
  input: Partial<CreateFleetVehicleInput> & { status?: FleetVehicleStatus }
) {
  const existing = await prisma.fleetVehicle.findUnique({ where: { id } });
  if (!existing) throw new Error("Fleet vehicle not found");

  const updated = await prisma.fleetVehicle.update({
    where: { id },
    data: {
      ...(input.fleetNumber !== undefined
        ? { fleetNumber: input.fleetNumber.trim().toUpperCase() }
        : {}),
      ...(input.registrationNumber !== undefined
        ? { registrationNumber: input.registrationNumber.trim() || null }
        : {}),
      ...(input.vinNumber !== undefined ? { vinNumber: input.vinNumber.trim() || null } : {}),
      ...(input.engineNumber !== undefined
        ? { engineNumber: input.engineNumber.trim() || null }
        : {}),
      ...(input.odometer !== undefined ? { odometer: input.odometer } : {}),
      ...(input.color !== undefined ? { color: input.color.trim() || null } : {}),
      ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
      ...(input.purchaseCostCents !== undefined
        ? { purchaseCostCents: input.purchaseCostCents }
        : {}),
      ...(input.branch !== undefined ? { branch: input.branch.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
    },
  });

  await syncVehicleFleetCountsFromUnits(existing.vehicleId);
  return updated;
}

export async function deleteFleetVehicleRecord(id: string) {
  const existing = await prisma.fleetVehicle.findUnique({
    where: { id },
    select: { id: true, vehicleId: true },
  });
  if (!existing) throw new Error("Fleet vehicle not found");

  const activeBookings = await prisma.rentalBooking.count({
    where: {
      fleetVehicleId: id,
      status: { in: BLOCKING_ASSIGNMENT_STATUSES },
    },
  });
  if (activeBookings > 0) {
    throw new Error("Cannot delete a fleet unit with active bookings");
  }

  await prisma.fleetVehicle.delete({ where: { id } });
  await syncVehicleFleetCountsFromUnits(existing.vehicleId);
}

export type { DateRange };
