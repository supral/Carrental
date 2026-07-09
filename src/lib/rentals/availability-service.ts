import { prisma } from "@/lib/prisma";
import { ListingPurpose, Prisma, RentalBookingStatus, RentalPaymentStatus, VehicleStatus } from "@prisma/client";
import { mapDbVehicleToPublic } from "@/lib/vehicles/public-vehicle-service";
import { isWithinRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import {
  assertFleetUnitsAvailable,
  getFleetAvailability,
  NO_VEHICLES_AVAILABLE_MESSAGE,
} from "@/lib/rentals/fleet-inventory";
import { RentalUnavailableError } from "@/lib/rentals/rental-errors";
import { calculateRentalDays } from "@/lib/rentals/pricing";
import { quoteRentalBooking } from "@/lib/rentals/rental-options-service";
import type { RentalSearchRequest, RentalVehicleResult } from "@/types/rental";

const vehicleInclude = {
  dealer: { select: { name: true, phone: true, rating: true } },
  images: { orderBy: { order: "asc" as const } },
  vehicleType: { select: { id: true, name: true } },
  seasonOffer: true,
};

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

  const where = {
    status: VehicleStatus.ACTIVE,
    listingPurpose: ListingPurpose.RENTAL,
    AND: [
      {
        OR: [{ rentalAvailableFrom: null }, { rentalAvailableFrom: { lte: pickupAt } }],
      },
      {
        OR: [{ rentalAvailableTo: null }, { rentalAvailableTo: { gte: dropoffAt } }],
      },
    ],
  };

  const rows = await prisma.vehicle.findMany({
    where,
    include: vehicleInclude,
    orderBy: { createdAt: "desc" },
  });

  const withFleet = await Promise.all(
    rows.map(async (vehicle) => {
      const fleet = await getFleetAvailability(vehicle.id, { pickupAt, dropoffAt });
      return { vehicle, fleet };
    })
  );

  const availableRows = withFleet.filter(({ fleet }) => fleet.availableUnits > 0);
  const total = availableRows.length;
  const start = (page - 1) * limit;
  const pageRows = availableRows.slice(start, start + limit);

  const data: RentalVehicleResult[] = pageRows.map(({ vehicle, fleet }) => {
    const mapped = mapDbVehicleToPublic(vehicle);
    return {
      ...mapped,
      totalUnits: fleet.totalUnits,
      reservedUnits: fleet.reservedUnits,
      availableUnits: fleet.availableUnits,
      rating: vehicle.dealer.rating > 0 ? vehicle.dealer.rating : 4.5,
    };
  });

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

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        status: VehicleStatus.ACTIVE,
        listingPurpose: ListingPurpose.RENTAL,
      },
      select: {
        id: true,
        price: true,
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

    await tx.$executeRaw`
      SELECT id FROM "Vehicle"
      WHERE id = ${input.vehicleId}
      FOR UPDATE
    `;

    await assertFleetUnitsAvailable(input.vehicleId, range, { client: tx });

    const quote = await quoteRentalBooking({
      vehicleId: input.vehicleId,
      pickupAt: input.pickupAt,
      dropoffAt: input.dropoffAt,
      selectedOptions: input.selectedOptions ?? [],
    });

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
  });
}

export { NO_VEHICLES_AVAILABLE_MESSAGE, RentalUnavailableError };
