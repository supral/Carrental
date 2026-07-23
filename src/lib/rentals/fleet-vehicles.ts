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
  const prefix = buildFleetNumberPrefix({ make, model });
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

/** Compact unique prefix used in Fleet Numbers, e.g. MGZS, PRADO, TOYOTA. */
export function buildFleetNumberPrefix(input: {
  make?: string | null;
  model?: string | null;
  title?: string | null;
}): string {
  const clean = (value: string | null | undefined) =>
    (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const make = clean(input.make);
  const model = clean(input.model);
  const title = clean(input.title);

  const usableMake = make && make !== "RENTAL" ? make : "";
  const usableModel = model && model !== "TYPE" ? model : "";

  if (usableModel.length >= 4) {
    return usableModel.slice(0, 8);
  }
  if (usableModel.length >= 1 && usableMake.length >= 1) {
    return `${usableMake.slice(0, 3)}${usableModel}`.slice(0, 8);
  }
  if (usableMake.length >= 2) {
    return usableMake.slice(0, 6);
  }
  if (title.length >= 2) {
    return title.slice(0, 6);
  }
  return "FLEET";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Next Fleet Number for a vehicle type: PREFIX-001, PREFIX-002, …
 * Increments past the highest existing suffix for that type's prefix.
 * Never reuses numbers from deleted units that still hold the high-water mark —
 * we only scan remaining rows; deleted suffixes can leave gaps by design.
 */
/**
 * Allocate `count` sequential Fleet Numbers for a vehicle type in one pass.
 * Avoids per-unit DB round-trips (critical for Neon/Vercel bulk creates).
 */
export async function allocateFleetNumberRange(
  vehicleId: string,
  count: number,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string[]> {
  if (count < 1) return [];

  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { make: true, model: true, title: true },
  });
  if (!vehicle) throw new Error("Vehicle type not found");

  const prefix = buildFleetNumberPrefix(vehicle);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i");

  const [existingForType, existingWithPrefix] = await Promise.all([
    client.fleetVehicle.findMany({
      where: { vehicleId },
      select: { fleetNumber: true },
    }),
    client.fleetVehicle.findMany({
      where: { fleetNumber: { startsWith: `${prefix}-` } },
      select: { fleetNumber: true },
    }),
  ]);

  let maxSeq = 0;
  for (const row of existingForType) {
    const match = row.fleetNumber.match(pattern);
    if (match) {
      maxSeq = Math.max(maxSeq, Number.parseInt(match[1], 10));
    }
  }

  const used = new Set(existingWithPrefix.map((row) => row.fleetNumber.toUpperCase()));
  const allocated: string[] = [];
  let next = maxSeq + 1;
  const safetyLimit = maxSeq + count + 10_000;

  while (allocated.length < count) {
    if (next > safetyLimit) {
      throw new Error("Could not allocate enough fleet numbers");
    }
    const candidate = `${prefix}-${String(next).padStart(3, "0")}`;
    next += 1;
    if (used.has(candidate.toUpperCase())) continue;
    used.add(candidate.toUpperCase());
    allocated.push(candidate);
  }

  return allocated;
}

export async function allocateNextFleetNumber(
  vehicleId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const [number] = await allocateFleetNumberRange(vehicleId, 1, client);
  if (!number) throw new Error("Could not allocate fleet number");
  return number;
}

export type FleetTypeStatusCounts = {
  fleetSize: number;
  available: number;
  rented: number;
  reserved: number;
  maintenance: number;
  inactive: number;
};

/** Live status totals for one vehicle type — never stored as DB columns. */
export async function getFleetTypeStatusCounts(
  vehicleId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<FleetTypeStatusCounts> {
  const rows = await client.fleetVehicle.groupBy({
    by: ["status"],
    where: { vehicleId },
    _count: { _all: true },
  });

  const counts: FleetTypeStatusCounts = {
    fleetSize: 0,
    available: 0,
    rented: 0,
    reserved: 0,
    maintenance: 0,
    inactive: 0,
  };

  for (const row of rows) {
    const n = row._count._all;
    counts.fleetSize += n;
    if (row.status === FleetVehicleStatus.AVAILABLE) counts.available = n;
    if (row.status === FleetVehicleStatus.RENTED) counts.rented = n;
    if (row.status === FleetVehicleStatus.RESERVED) counts.reserved = n;
    if (row.status === FleetVehicleStatus.MAINTENANCE) counts.maintenance = n;
    if (row.status === FleetVehicleStatus.INACTIVE) counts.inactive = n;
  }

  return counts;
}

/** Batch status counts for many vehicle types. */
export async function getFleetTypeStatusCountsBatch(
  vehicleIds: string[],
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Map<string, FleetTypeStatusCounts>> {
  const map = new Map<string, FleetTypeStatusCounts>();
  for (const id of vehicleIds) {
    map.set(id, {
      fleetSize: 0,
      available: 0,
      rented: 0,
      reserved: 0,
      maintenance: 0,
      inactive: 0,
    });
  }
  if (vehicleIds.length === 0) return map;

  const rows = await client.fleetVehicle.groupBy({
    by: ["vehicleId", "status"],
    where: { vehicleId: { in: vehicleIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    const entry = map.get(row.vehicleId);
    if (!entry) continue;
    const n = row._count._all;
    entry.fleetSize += n;
    if (row.status === FleetVehicleStatus.AVAILABLE) entry.available = n;
    if (row.status === FleetVehicleStatus.RENTED) entry.rented = n;
    if (row.status === FleetVehicleStatus.RESERVED) entry.reserved = n;
    if (row.status === FleetVehicleStatus.MAINTENANCE) entry.maintenance = n;
    if (row.status === FleetVehicleStatus.INACTIVE) entry.inactive = n;
  }

  return map;
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
    const fleetNumbers = await allocateFleetNumberRange(vehicleId, toCreate, client);
    if (fleetNumbers.length > 0) {
      await client.fleetVehicle.createMany({
        data: fleetNumbers.map((fleetNumber) => ({
          vehicleId,
          fleetNumber,
          color: vehicle.color,
          branch: vehicle.location,
          status: FleetVehicleStatus.AVAILABLE,
        })),
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
  /** Optional override — normally auto-allocated. */
  fleetNumber?: string;
  make?: string;
  model?: string;
  year?: number | null;
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
  const fleetNumber = input.fleetNumber?.trim()
    ? input.fleetNumber.trim().toUpperCase()
    : await allocateNextFleetNumber(input.vehicleId);

  if (!fleetNumber) throw new Error("Fleet number is required");

  const duplicate = await prisma.fleetVehicle.findUnique({ where: { fleetNumber } });
  if (duplicate) {
    throw new Error(`Fleet number ${fleetNumber} is already in use`);
  }

  const created = await prisma.fleetVehicle.create({
    data: {
      vehicleId: input.vehicleId,
      fleetNumber,
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      year: input.year ?? null,
      registrationNumber: input.registrationNumber?.trim() || null,
      vinNumber: input.vinNumber?.trim() || null,
      engineNumber: input.engineNumber?.trim() || null,
      odometer: input.odometer ?? null,
      currentKm: input.odometer ?? null,
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

const BULK_CREATE_BATCH_SIZE = 100;

/**
 * Bulk-create physical fleet units with one number allocation + batched inserts.
 * Designed for Neon/Vercel where per-row loops time out.
 */
export async function createFleetVehicleRecordsBulk(
  input: CreateFleetVehicleInput,
  unitCount: number
): Promise<{ id: string; fleetNumbers: string[] }> {
  const count = Math.max(1, Math.min(500, Math.floor(unitCount)));
  if (count === 1) {
    const created = await createFleetVehicleRecord(input);
    return { id: created.id, fleetNumbers: [created.fleetNumber] };
  }

  const fleetNumbers = await allocateFleetNumberRange(input.vehicleId, count);
  if (fleetNumbers.length !== count) {
    throw new Error("Could not allocate fleet numbers for all units");
  }

  const make = input.make?.trim() || null;
  const model = input.model?.trim() || null;
  const year = input.year ?? null;
  const color = input.color?.trim() || null;
  const branch = input.branch?.trim() || null;
  const notes = input.notes?.trim() || null;
  const status = input.status ?? FleetVehicleStatus.AVAILABLE;
  const purchaseDate = input.purchaseDate ?? null;
  const purchaseCostCents = input.purchaseCostCents ?? null;

  const rows = fleetNumbers.map((fleetNumber) => ({
    vehicleId: input.vehicleId,
    fleetNumber,
    make,
    model,
    year,
    color,
    branch,
    notes,
    status,
    purchaseDate,
    purchaseCostCents,
  }));

  // Batched createMany — each INSERT is atomic; retry-safe because numbers advance.
  for (let offset = 0; offset < rows.length; offset += BULK_CREATE_BATCH_SIZE) {
    await prisma.fleetVehicle.createMany({
      data: rows.slice(offset, offset + BULK_CREATE_BATCH_SIZE),
    });
  }

  await syncVehicleFleetCountsFromUnits(input.vehicleId);

  const first = await prisma.fleetVehicle.findFirst({
    where: { vehicleId: input.vehicleId, fleetNumber: fleetNumbers[0] },
    select: { id: true },
  });
  if (!first) {
    throw new Error("Fleet units were created but could not be loaded");
  }

  return { id: first.id, fleetNumbers };
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
      ...(input.make !== undefined ? { make: input.make.trim() || null } : {}),
      ...(input.model !== undefined ? { model: input.model.trim() || null } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
      ...(input.registrationNumber !== undefined
        ? { registrationNumber: input.registrationNumber.trim() || null }
        : {}),
      ...(input.vinNumber !== undefined ? { vinNumber: input.vinNumber.trim() || null } : {}),
      ...(input.engineNumber !== undefined
        ? { engineNumber: input.engineNumber.trim() || null }
        : {}),
      ...(input.odometer !== undefined
        ? { odometer: input.odometer, currentKm: input.odometer }
        : {}),
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
