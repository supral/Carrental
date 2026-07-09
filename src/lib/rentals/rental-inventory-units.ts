import { Prisma, RentalBookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function syncVehicleAvailableUnits(
  vehicleId: string,
  client: Prisma.TransactionClient = prisma
) {
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: { totalUnits: true },
  });
  if (!vehicle) return;

  const heldCount = await client.rentalBooking.count({
    where: {
      vehicleId,
      inventoryHeld: true,
      status: { in: INVENTORY_CONSUMING_STATUSES },
    },
  });

  const availableUnits = Math.max(0, vehicle.totalUnits - heldCount);
  await client.vehicle.update({
    where: { id: vehicleId },
    data: { availableUnits },
  });
}

export async function applyRentalInventoryHold(
  bookingId: string,
  client: Prisma.TransactionClient = prisma
) {
  const booking = await client.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, vehicleId: true, inventoryHeld: true, status: true },
  });

  if (!booking || booking.inventoryHeld) return;
  if (!isInventoryConsumingStatus(booking.status)) return;

  const vehicle = await client.vehicle.findUnique({
    where: { id: booking.vehicleId },
    select: { availableUnits: true },
  });

  if (!vehicle || vehicle.availableUnits <= 0) {
    throw new Error("No rental units available");
  }

  await client.vehicle.update({
    where: { id: booking.vehicleId },
    data: { availableUnits: { decrement: 1 } },
  });

  await client.rentalBooking.update({
    where: { id: bookingId },
    data: { inventoryHeld: true },
  });
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

  await client.vehicle.update({
    where: { id: booking.vehicleId },
    data: { availableUnits: { increment: 1 } },
  });

  await client.rentalBooking.update({
    where: { id: bookingId },
    data: { inventoryHeld: false },
  });
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
    return;
  }

  if (wasConsuming && isReleasing) {
    await releaseRentalInventoryHold(bookingId, client);
    return;
  }

  if (wasConsuming && !isConsuming && !isReleasing) {
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
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { totalUnits: true, availableUnits: true },
  });
  if (!vehicle) throw new Error("Vehicle not found");

  const bookedUnits = vehicle.totalUnits - vehicle.availableUnits;
  if (newTotalUnits < bookedUnits) {
    throw new Error(
      `Cannot reduce total units below ${bookedUnits} while ${bookedUnits} unit(s) are currently booked.`
    );
  }

  const delta = newTotalUnits - vehicle.totalUnits;
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      totalUnits: newTotalUnits,
      availableUnits: vehicle.availableUnits + delta,
    },
  });
}
