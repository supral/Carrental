import { prisma } from "@/lib/prisma";
import { ListingPurpose, Prisma, RentalBookingStatus, RentalPaymentStatus, VehicleStatus } from "@prisma/client";
import { isWithinRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import {
  assertFleetUnitsAvailable,
  blockingRentalBookingFilter,
  NO_VEHICLES_AVAILABLE_MESSAGE,
  rentalDateOverlapFilter,
} from "@/lib/rentals/fleet-inventory";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";
import { handleRentalBookingStatusChange } from "@/lib/rentals/rental-inventory-units";
import { rentalOverlapFilter } from "@/lib/rentals/rental-overlap";
import { quoteRentalBooking } from "@/lib/rentals/rental-options-service";
import {
  buildRentalSearchVehicleWhere,
  mapRentalSearchVehicle,
  rentalSearchInclude,
} from "@/lib/rentals/search-mapper";
import { RENTAL_TRANSACTION_OPTIONS } from "@/lib/rentals/transaction-options";
import type { RentalSearchRequest, RentalVehicleResult } from "@/types/rental";

export interface RentalAvailabilitySearchInput extends RentalSearchRequest {
  page?: number;
  limit?: number;
}

function parseSearchWindow(input: RentalAvailabilitySearchInput) {
  const pickupAt = new Date(input.pickupDateTime);
  const dropoffAt = new Date(input.dropoffDateTime);

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) {
    throw new Error("Invalid pickup or drop-off date/time");
  }

  if (dropoffAt <= pickupAt) {
    throw new Error("Drop-off must be after pickup");
  }

  if (pickupAt < new Date()) {
    throw new Error("Pickup cannot be in the past");
  }

  return { pickupAt, dropoffAt };
}

export async function searchAvailableRentalVehicles(input: RentalAvailabilitySearchInput) {
  const { pickupAt, dropoffAt } = parseSearchWindow(input);
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(100, Math.max(1, input.limit || 12));
  const vehicleWhere = buildRentalSearchVehicleWhere(pickupAt, dropoffAt);

  const [rows, reservationCounts] = await Promise.all([
    prisma.vehicle.findMany({
      where: vehicleWhere,
      include: rentalSearchInclude,
      orderBy: { price: "asc" },
    }),
    prisma.rentalBooking.groupBy({
      by: ["vehicleId"],
      where: {
        vehicle: vehicleWhere,
        ...rentalDateOverlapFilter(pickupAt, dropoffAt),
        ...blockingRentalBookingFilter(),
      },
      _count: { _all: true },
    }),
  ]);

  const reservedByVehicleId = new Map(
    reservationCounts.map((row) => [row.vehicleId, row._count._all])
  );

  const availableRows = rows
    .map((vehicle) => {
      const totalUnits = Math.max(1, vehicle.totalUnits ?? 1);
      const storedAvailable = Math.max(0, vehicle.availableUnits ?? totalUnits);
      const reservedForRange = reservedByVehicleId.get(vehicle.id) ?? 0;
      const rangeAvailable = Math.max(0, totalUnits - reservedForRange);
      const availableUnits = Math.min(storedAvailable, rangeAvailable);

      return {
        vehicle,
        fleet: {
          totalUnits,
          reservedUnits: totalUnits - availableUnits,
          availableUnits,
        },
      };
    })
    .filter(({ fleet }) => fleet.availableUnits > 0);
  const total = availableRows.length;
  const start = (page - 1) * limit;
  const pageRows = availableRows.slice(start, start + limit);

  const data: RentalVehicleResult[] = pageRows.map(({ vehicle, fleet }) =>
    mapRentalSearchVehicle(vehicle, fleet)
  );

  return {
    data,
    meta: {
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      pickupDateTime: pickupAt.toISOString(),
      dropoffDateTime: dropoffAt.toISOString(),
      totalAvailable: total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export interface CreateRentalBookingInput {
  vehicleId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  dropoffAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerZip: string;
  customerDob: Date;
  customerCountry: string;
  drivingLicenceNumber?: string;
  licencePhotoUrl?: string;
  notes?: string;
  selectedOptions?: import("@/lib/rentals/option-catalog").SelectedRentalOptionInput[];
}

export async function createRentalBooking(input: CreateRentalBookingInput) {
  const range = { pickupAt: input.pickupAt, dropoffAt: input.dropoffAt };

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: input.vehicleId,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    select: {
      id: true,
      rentalAvailableFrom: true,
      rentalAvailableTo: true,
    },
  });

  if (!vehicle) {
    throw new Error("This rental vehicle is not available");
  }

  if (
    !isWithinRentalAvailabilityWindow(
      input.pickupAt,
      input.dropoffAt,
      vehicle.rentalAvailableFrom,
      vehicle.rentalAvailableTo
    )
  ) {
    throw new Error("This vehicle is not available for the selected dates");
  }

  const quote = await quoteRentalBooking({
    vehicleId: input.vehicleId,
    pickupAt: input.pickupAt,
    dropoffAt: input.dropoffAt,
    selectedOptions: input.selectedOptions ?? [],
  });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM "Vehicle"
      WHERE id = ${input.vehicleId}
      FOR UPDATE
    `;

    await assertFleetUnitsAvailable(input.vehicleId, range, { client: tx });

    return tx.rentalBooking.create({
      data: {
        vehicleId: input.vehicleId,
        pickupAddress: input.pickupAddress,
        dropoffAddress: input.dropoffAddress,
        pickupAt: input.pickupAt,
        dropoffAt: input.dropoffAt,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        customerZip: input.customerZip,
        customerDob: input.customerDob,
        customerCountry: input.customerCountry,
        drivingLicenceNumber: input.drivingLicenceNumber || null,
        licencePhotoUrl: input.licencePhotoUrl || null,
        notes: input.notes,
        rentalDays: quote.breakdown.rentalDays,
        baseAmountCents: quote.breakdown.baseAmountCents,
        extrasAmountCents: quote.breakdown.extrasAmountCents,
        taxAmountCents: quote.breakdown.taxAmountCents,
        totalAmountCents: quote.breakdown.totalAmountCents,
        selectedOptions: quote.breakdown.optionLines as unknown as Prisma.InputJsonValue,
        currency: "aud",
        status: RentalBookingStatus.PENDING,
        paymentStatus: RentalPaymentStatus.UNPAID,
      },
    });
  }, RENTAL_TRANSACTION_OPTIONS);
}

const confirmedBookingInclude = {
  vehicle: {
    select: {
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
    },
  },
} as const;

/** Create and confirm a rental booking in one transaction (Stripe bypass / immediate confirm). */
export async function createAndConfirmRentalBooking(input: CreateRentalBookingInput) {
  const range = { pickupAt: input.pickupAt, dropoffAt: input.dropoffAt };

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: input.vehicleId,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    select: {
      id: true,
      rentalAvailableFrom: true,
      rentalAvailableTo: true,
    },
  });

  if (!vehicle) {
    throw new Error("This rental vehicle is not available");
  }

  if (
    !isWithinRentalAvailabilityWindow(
      input.pickupAt,
      input.dropoffAt,
      vehicle.rentalAvailableFrom,
      vehicle.rentalAvailableTo
    )
  ) {
    throw new Error("This vehicle is not available for the selected dates");
  }

  const quote = await quoteRentalBooking({
    vehicleId: input.vehicleId,
    pickupAt: input.pickupAt,
    dropoffAt: input.dropoffAt,
    selectedOptions: input.selectedOptions ?? [],
  });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM "Vehicle"
      WHERE id = ${input.vehicleId}
      FOR UPDATE
    `;

    await assertFleetUnitsAvailable(input.vehicleId, range, { client: tx });

    const created = await tx.rentalBooking.create({
      data: {
        vehicleId: input.vehicleId,
        pickupAddress: input.pickupAddress,
        dropoffAddress: input.dropoffAddress,
        pickupAt: input.pickupAt,
        dropoffAt: input.dropoffAt,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        customerZip: input.customerZip,
        customerDob: input.customerDob,
        customerCountry: input.customerCountry,
        drivingLicenceNumber: input.drivingLicenceNumber || null,
        licencePhotoUrl: input.licencePhotoUrl || null,
        notes: input.notes,
        rentalDays: quote.breakdown.rentalDays,
        baseAmountCents: quote.breakdown.baseAmountCents,
        extrasAmountCents: quote.breakdown.extrasAmountCents,
        taxAmountCents: quote.breakdown.taxAmountCents,
        totalAmountCents: quote.breakdown.totalAmountCents,
        selectedOptions: quote.breakdown.optionLines as unknown as Prisma.InputJsonValue,
        currency: "aud",
        status: RentalBookingStatus.PENDING,
        paymentStatus: RentalPaymentStatus.UNPAID,
      },
    });

    const confirmed = await tx.rentalBooking.update({
      where: { id: created.id },
      data: {
        paymentStatus: RentalPaymentStatus.PAID,
        status: RentalBookingStatus.CONFIRMED,
        paidAt: new Date(),
      },
      include: confirmedBookingInclude,
    });

    await handleRentalBookingStatusChange(
      created.id,
      RentalBookingStatus.PENDING,
      RentalBookingStatus.CONFIRMED,
      tx
    );

    const losers = await tx.rentalBooking.findMany({
      where: {
        ...rentalOverlapFilter(input.vehicleId, range, created.id),
        paymentStatus: { not: RentalPaymentStatus.PAID },
      },
      select: { id: true, status: true },
    });

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

    return confirmed;
  }, RENTAL_TRANSACTION_OPTIONS);
}

export { NO_VEHICLES_AVAILABLE_MESSAGE, RentalUnavailableError };
