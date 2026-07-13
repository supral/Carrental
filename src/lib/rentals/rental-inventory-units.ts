import { Prisma, RentalBookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertFleetUnitsAvailable,
  blockingRentalBookingFilter,
  computeDateRangeAvailability,
  getPeakConcurrentReservations,
} from "@/lib/rentals/fleet-inventory";

/** Statuses that consume a stored fleet unit. */
export const INVENTORY_CONSUMING_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.RESERVED,
  RentalBookingStatus.CONFIRMED,
  RentalBookingStatus.ACTIVE,
];

/** Statuses that release a stored fleet unit. */
export const INVENTORY_RELEASING_STATUSES: RentalBookingStatus[] = [
  RentalBookingStatus.CANCELLED,
  RentalBookingStatus.COMPLETED,
];

export function isInventoryConsumingStatus(status: RentalBookingStatus): boolean {
  return INVENTORY_CONSUMING_STATUSES.includes(status);
}

/**
 * Sync Vehicle.availableUnits from peak concurrent blocking bookings vs totalUnits.
 * Do not count every held booking as occupying a unit — staggered dates share fleet capacity.
 */
export async function syncVehicleAvailableUnits(
  vehicleId: string,
  client: Prisma.TransactionClient = prisma
) {
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { totalUnits: true },
  });
  if (!vehicle) return;

  const bookings = await client.rentalBooking.findMany({
    where: {
      vehicleId,
      ...blockingRentalBookingFilter(),
    },
    select: { pickupAt: true, dropoffAt: true },
  });

  const peak = getPeakConcurrentReservations(bookings);
  const { availableUnits } = computeDateRangeAvailability(vehicle.totalUnits, peak);

  await client.vehicle.update({
    where: { id: vehicleId },
    data: { availableUnits },
  });
}

/**
 * Mark inventory held after date-range capacity is confirmed.
 * Uses the same peak-concurrent check as the calendar and availability form — not the global counter.
 */
export async function applyRentalInventoryHold(
  bookingId: string,
  client: Prisma.TransactionClient = prisma
) {
  const booking = await client.rentalBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      vehicleId: true,
      inventoryHeld: true,
      status: true,
      pickupAt: true,
      dropoffAt: true,
    },
  });

  if (!booking || booking.inventoryHeld) return;
  if (!isInventoryConsumingStatus(booking.status)) return;

  await assertFleetUnitsAvailable(
    booking.vehicleId,
    { pickupAt: booking.pickupAt, dropoffAt: booking.dropoffAt },
    { excludeBookingId: booking.id, client }
  );

  await client.rentalBooking.update({
    where: { id: bookingId },
    data: { inventoryHeld: true },
  });

  await syncVehicleAvailableUnits(booking.vehicleId, client);
}

export async function releaseRentalInventoryHold(
  bookingId: string,
  client: Prisma.TransactionClient = prisma
) {
  const booking = await client.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, vehicleId: true, inventoryHeld: true },
  });

  if (!booking || !booking.inventoryHeld) return;

  await client.rentalBooking.update({
    where: { id: bookingId },
    data: { inventoryHeld: false },
  });

  await syncVehicleAvailableUnits(booking.vehicleId, client);
}

export async function handleRentalBookingStatusChange(
  bookingId: string,
  previousStatus: RentalBookingStatus,
  nextStatus: RentalBookingStatus,
  client: Prisma.TransactionClient = prisma
) {
  const wasConsuming = isInventoryConsumingStatus(previousStatus);
  const isConsuming = isInventoryConsumingStatus(nextStatus);
  const isReleasing = INVENTORY_RELEASING_STATUSES.includes(nextStatus);

  if (!wasConsuming && isConsuming) {
    await applyRentalInventoryHold(bookingId, client);
    const { assignFleetVehicleToBooking } = await import("@/lib/rentals/fleet-vehicles");
    await assignFleetVehicleToBooking(bookingId, client);
    return;
  }

  if (wasConsuming && isReleasing) {
    const { releaseFleetVehicleFromBooking } = await import("@/lib/rentals/fleet-vehicles");
    await releaseFleetVehicleFromBooking(bookingId, client);
    await releaseRentalInventoryHold(bookingId, client);
    return;
  }

  if (wasConsuming && !isConsuming && !isReleasing) {
    const { releaseFleetVehicleFromBooking } = await import("@/lib/rentals/fleet-vehicles");
    await releaseFleetVehicleFromBooking(bookingId, client);
    await releaseRentalInventoryHold(bookingId, client);
  }
}

export async function initializeRentalInventory(vehicleId: string, totalUnits: number) {
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      totalUnits,
      availableUnits: totalUnits,
    },
  });
}

export async function adjustRentalTotalUnits(vehicleId: string, newTotalUnits: number) {
  const { ensureFleetUnitsForVehicle } = await import("@/lib/rentals/fleet-vehicles");
  await ensureFleetUnitsForVehicle(vehicleId, newTotalUnits);
}
