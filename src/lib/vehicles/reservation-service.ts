import {
  ListingPurpose,
  VehicleInventoryStatus,
  VehicleStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleOfferClearedFields } from "@/lib/vehicles/vehicle-offers-server";
import {
  RESERVATION_API_CONFLICT_MESSAGE,
  RESERVATION_TTL_MS,
  type ReservationPurpose,
} from "@/lib/vehicles/reservation-constants";

export class VehicleReservationConflictError extends Error {
  constructor(message = RESERVATION_API_CONFLICT_MESSAGE) {
    super(message);
    this.name = "VehicleReservationConflictError";
  }
}

export class VehicleReservationInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleReservationInvalidError";
  }
}

function reservationExpiryDate(now = new Date()) {
  return new Date(now.getTime() + RESERVATION_TTL_MS);
}

function isReservationExpired(expiresAt: Date | null | undefined, now = new Date()) {
  return !expiresAt || expiresAt <= now;
}

type ReserveVehicleInput = {
  vehicleId: string;
  reservationToken: string;
  purpose: ReservationPurpose;
  userId?: string | null;
};

/** Only link reservations to users that still exist (avoids stale JWT / reseed FK errors). */
async function resolveReservationUserId(
  userId: string | null | undefined,
  client: Prisma.TransactionClient
): Promise<string | null> {
  if (!userId) return null;
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Atomically reserve a vehicle for checkout.
 *
 * Concurrency control: `updateMany` with `inventoryStatus = AVAILABLE` ensures
 * only ONE concurrent request can flip the row to RESERVED (count === 1 wins).
 */
export async function reserveVehicle(input: ReserveVehicleInput) {
  const now = new Date();
  const expiresAt = reservationExpiryDate(now);

  return prisma.$transaction(async (tx) => {
    const reservedByUserId = await resolveReservationUserId(input.userId, tx);

    const vehicle = await tx.vehicle.findUnique({
      where: { id: input.vehicleId },
      select: {
        id: true,
        status: true,
        listingPurpose: true,
        inventoryStatus: true,
        reservationToken: true,
        reservationExpiresAt: true,
      },
    });

    if (!vehicle || vehicle.status !== VehicleStatus.ACTIVE) {
      throw new VehicleReservationInvalidError("Vehicle is not available");
    }

    if (input.purpose === ListingPurpose.RENTAL && vehicle.listingPurpose !== ListingPurpose.RENTAL) {
      throw new VehicleReservationInvalidError("This vehicle is not listed for rental");
    }

    if (input.purpose === ListingPurpose.SALE && vehicle.listingPurpose !== ListingPurpose.SALE) {
      throw new VehicleReservationInvalidError("This vehicle is not listed for sale");
    }

    // Idempotent re-reserve by the same checkout session (extends the hold).
    if (
      vehicle.inventoryStatus === VehicleInventoryStatus.RESERVED &&
      vehicle.reservationToken === input.reservationToken &&
      !isReservationExpired(vehicle.reservationExpiresAt, now)
    ) {
      const extended = await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: {
          reservationExpiresAt: expiresAt,
          reservedByUserId,
          reservationPurpose: input.purpose,
        },
        select: reservationSelect,
      });

      return extended;
    }

    // Release stale reservations inline so the next checkout attempt can proceed.
    if (
      vehicle.inventoryStatus === VehicleInventoryStatus.RESERVED &&
      isReservationExpired(vehicle.reservationExpiresAt, now)
    ) {
      await tx.vehicle.updateMany({
        where: {
          id: input.vehicleId,
          inventoryStatus: VehicleInventoryStatus.RESERVED,
          reservationExpiresAt: { lt: now },
        },
        data: clearReservationData(),
      });
    }

    // Race-safe claim: exactly one concurrent caller gets count === 1.
    const claimed = await tx.vehicle.updateMany({
      where: {
        id: input.vehicleId,
        status: VehicleStatus.ACTIVE,
        inventoryStatus: VehicleInventoryStatus.AVAILABLE,
      },
      data: {
        inventoryStatus: VehicleInventoryStatus.RESERVED,
        reservedByUserId,
        reservationToken: input.reservationToken,
        reservationPurpose: input.purpose,
        reservationExpiresAt: expiresAt,
      },
    });

    if (claimed.count !== 1) {
      throw new VehicleReservationConflictError();
    }

    const reserved = await tx.vehicle.findUnique({
      where: { id: input.vehicleId },
      select: reservationSelect,
    });

    if (!reserved) {
      throw new VehicleReservationInvalidError("Vehicle not found");
    }

    return reserved;
  });
}

const reservationSelect = {
  id: true,
  inventoryStatus: true,
  reservationToken: true,
  reservationPurpose: true,
  reservationExpiresAt: true,
  listingPurpose: true,
} satisfies Prisma.VehicleSelect;

export async function assertVehicleReservedByToken(vehicleId: string, reservationToken: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      inventoryStatus: true,
      reservationToken: true,
      reservationExpiresAt: true,
    },
  });

  if (!vehicle) {
    throw new VehicleReservationInvalidError("Vehicle not found");
  }

  if (
    vehicle.inventoryStatus !== VehicleInventoryStatus.RESERVED ||
    vehicle.reservationToken !== reservationToken ||
    isReservationExpired(vehicle.reservationExpiresAt)
  ) {
    throw new VehicleReservationInvalidError("Reservation expired or invalid. Please try again.");
  }
}

function clearReservationData(): Prisma.VehicleUncheckedUpdateManyInput {
  return {
    inventoryStatus: VehicleInventoryStatus.AVAILABLE,
    reservedByUserId: null,
    reservationToken: null,
    reservationPurpose: null,
    reservationExpiresAt: null,
  };
}

/** Release a hold when payment fails, the user cancels, or checkout is abandoned. */
export async function releaseVehicleReservation(vehicleId: string, reservationToken: string) {
  const result = await prisma.vehicle.updateMany({
    where: {
      id: vehicleId,
      inventoryStatus: VehicleInventoryStatus.RESERVED,
      reservationToken,
    },
    data: clearReservationData(),
  });

  return result.count === 1;
}

/**
 * Confirm payment inside a transaction.
 * Verifies the caller still owns the reservation, then marks RENTED or SOLD.
 */
export async function confirmVehicleReservationPayment(
  vehicleId: string,
  reservationToken: string,
  purpose: ReservationPurpose,
  client: Prisma.TransactionClient = prisma
) {
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      inventoryStatus: true,
      reservationToken: true,
      reservationExpiresAt: true,
      reservationPurpose: true,
    },
  });

  if (!vehicle) {
    throw new VehicleReservationInvalidError("Vehicle not found");
  }

  if (
    vehicle.inventoryStatus !== VehicleInventoryStatus.RESERVED ||
    vehicle.reservationToken !== reservationToken ||
    isReservationExpired(vehicle.reservationExpiresAt)
  ) {
    throw new VehicleReservationInvalidError("Reservation is no longer valid");
  }

  const nextStatus =
    purpose === ListingPurpose.RENTAL
      ? VehicleInventoryStatus.RENTED
      : VehicleInventoryStatus.SOLD;

  const updated = await client.vehicle.updateMany({
    where: {
      id: vehicleId,
      inventoryStatus: VehicleInventoryStatus.RESERVED,
      reservationToken,
    },
    data: {
      inventoryStatus: nextStatus,
      reservedByUserId: null,
      reservationToken: null,
      reservationPurpose: null,
      reservationExpiresAt: null,
      ...(purpose === ListingPurpose.SALE
        ? {
            status: VehicleStatus.SOLD,
            soldAt: new Date(),
            seasonOfferId: null,
            ...vehicleOfferClearedFields,
          }
        : {}),
    },
  });

  if (updated.count !== 1) {
    throw new VehicleReservationConflictError();
  }

  return updated.count === 1;
}

/** Cron task: release expired RESERVED vehicles back to AVAILABLE. */
export async function releaseExpiredVehicleReservations(now = new Date()) {
  const result = await prisma.vehicle.updateMany({
    where: {
      inventoryStatus: VehicleInventoryStatus.RESERVED,
      reservationExpiresAt: { lt: now },
    },
    data: clearReservationData(),
  });

  return result.count;
}

/** Return a rented fleet vehicle to the available pool after the rental ends. */
export async function releaseRentedVehicleToAvailable(vehicleId: string) {
  const result = await prisma.vehicle.updateMany({
    where: {
      id: vehicleId,
      inventoryStatus: VehicleInventoryStatus.RENTED,
    },
    data: {
      inventoryStatus: VehicleInventoryStatus.AVAILABLE,
    },
  });

  return result.count === 1;
}
