"use server";

import { revalidatePath } from "next/cache";
import { ListingPurpose, VehicleStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { getVehicleMonthAvailability } from "@/lib/rentals/availability-calendar";
import { createAndConfirmRentalBooking } from "@/lib/rentals/availability-service";
import { isWithinRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import { getFleetAvailability } from "@/lib/rentals/fleet-inventory";
import { getDynamicVehicleRentalOptions } from "@/lib/rentals/dynamic-rental-options";
import { combineDateAndTime, normalizeTimeValue } from "@/lib/rentals/search-validation";
import { formatVehicleName } from "@/lib/vehicles/display";
import type { SelectedRentalOptionInput } from "@/lib/rentals/option-catalog";

async function requireBookingAdmin(manage = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const permission = manage ? "vehicles:manage" : "vehicles:view";
  if (!hasPermission(session.user.role, permission)) throw new Error("Forbidden");
  return session.user;
}

export async function listActiveRentalVehiclesForBooking() {
  await requireBookingAdmin();

  const vehicles = await prisma.vehicle.findMany({
    where: {
      listingPurpose: ListingPurpose.RENTAL,
      status: VehicleStatus.ACTIVE,
    },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
      price: true,
      totalUnits: true,
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: formatVehicleName(vehicle),
    price: vehicle.price,
    totalUnits: vehicle.totalUnits ?? 1,
  }));
}

export async function getAdminVehicleMonthAvailability(
  vehicleId: string,
  year: number,
  month: number
) {
  await requireBookingAdmin();
  return getVehicleMonthAvailability(vehicleId, year, month);
}

export async function getAdminVehicleOptions(vehicleId: string) {
  await requireBookingAdmin();
  return getDynamicVehicleRentalOptions(vehicleId);
}

export async function checkAdminBookingAvailability(
  vehicleId: string,
  pickupDateTime: string,
  dropoffDateTime: string
) {
  await requireBookingAdmin();

  const pickupAt = new Date(pickupDateTime);
  const dropoffAt = new Date(dropoffDateTime);
  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) {
    throw new Error("Invalid pickup or drop-off date/time");
  }
  if (dropoffAt <= pickupAt) {
    throw new Error("Drop-off must be after pickup");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    select: {
      rentalAvailableFrom: true,
      rentalAvailableTo: true,
    },
  });

  if (!vehicle) {
    throw new Error("This rental vehicle is not available");
  }

  if (
    !isWithinRentalAvailabilityWindow(
      pickupAt,
      dropoffAt,
      vehicle.rentalAvailableFrom,
      vehicle.rentalAvailableTo
    )
  ) {
    const fromLabel = vehicle.rentalAvailableFrom
      ? new Intl.DateTimeFormat("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(vehicle.rentalAvailableFrom)
      : null;
    const toLabel = vehicle.rentalAvailableTo
      ? new Intl.DateTimeFormat("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(vehicle.rentalAvailableTo)
      : null;

    if (fromLabel && toLabel) {
      throw new Error(`This vehicle can only be booked between ${fromLabel} and ${toLabel}.`);
    }
    if (fromLabel) {
      throw new Error(`This vehicle is only available from ${fromLabel}. Choose a later pickup date.`);
    }
    if (toLabel) {
      throw new Error(`This vehicle is only available until ${toLabel}. Choose an earlier drop-off date.`);
    }
    throw new Error("This vehicle is not available for the selected dates");
  }

  if (pickupAt < new Date()) {
    throw new Error("Pickup cannot be in the past. Choose a later pickup date.");
  }

  const fleet = await getFleetAvailability(vehicleId, { pickupAt, dropoffAt });
  if (fleet.availableUnits <= 0) {
    throw new Error("This vehicle is fully booked for the selected dates");
  }

  return {
    ...fleet,
    available: true,
    message:
      fleet.reservedUnits > 0
        ? `Selected dates are available (${fleet.availableUnits} of ${fleet.totalUnits} units free).`
        : "Selected dates are available.",
  };
}

export type AdminCreateRentalBookingInput = {
  vehicleId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerZip: string;
  customerDob: string;
  customerCountry: string;
  notes?: string;
  bookingSource?: "walk_in" | "phone" | "other";
  selectedOptions?: SelectedRentalOptionInput[];
};

export async function createAdminRentalBooking(input: AdminCreateRentalBookingInput) {
  const admin = await requireBookingAdmin(true);

  const pickupAt = combineDateAndTime(input.pickupDate, normalizeTimeValue(input.pickupTime));
  const dropoffAt = combineDateAndTime(input.dropoffDate, normalizeTimeValue(input.dropoffTime));

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) {
    throw new Error("Invalid pickup or drop-off date/time");
  }
  if (dropoffAt <= pickupAt) {
    throw new Error("Drop-off must be after pickup. Choose a later drop-off time or date.");
  }

  const customerDob = new Date(`${input.customerDob}T00:00:00`);
  if (Number.isNaN(customerDob.getTime())) {
    throw new Error("Invalid date of birth");
  }

  const sourceLabel =
    input.bookingSource === "phone"
      ? "Phone"
      : input.bookingSource === "other"
        ? "Other"
        : "Walk-in";

  const noteParts = [
    `Admin booking (${sourceLabel}) by ${admin.email ?? admin.name ?? admin.id}`,
    input.notes?.trim() || null,
  ].filter(Boolean);

  const booking = await createAndConfirmRentalBooking({
    vehicleId: input.vehicleId,
    pickupAddress: input.pickupAddress.trim(),
    dropoffAddress: input.dropoffAddress.trim(),
    pickupAt,
    dropoffAt,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim(),
    customerPhone: input.customerPhone.trim(),
    customerAddress: input.customerAddress.trim(),
    customerZip: input.customerZip.trim(),
    customerDob,
    customerCountry: input.customerCountry.trim() || "Australia",
    notes: noteParts.join("\n"),
    selectedOptions: input.selectedOptions ?? [],
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${input.vehicleId}/edit`);
  revalidatePath("/car-rental", "layout");

  return {
    id: booking.id,
    totalAmountCents: booking.totalAmountCents,
    status: booking.status,
  };
}

export async function getAdminBookingCalendar(year: number, month: number, vehicleId?: string | null) {
  await requireBookingAdmin();
  const { getBookingCalendarEvents } = await import("@/lib/rentals/booking-calendar");
  return getBookingCalendarEvents({ year, month, vehicleId });
}

export type AdminUpdateRentalBookingInput = {
  id: string;
  vehicleId: string;
  customerName: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  notes?: string;
};

export async function updateAdminRentalBooking(input: AdminUpdateRentalBookingInput) {
  await requireBookingAdmin(true);

  const pickupAt = combineDateAndTime(
    input.pickupDate,
    normalizeTimeValue(input.pickupTime || "09:00")
  );
  const dropoffAt = combineDateAndTime(
    input.dropoffDate,
    normalizeTimeValue(input.dropoffTime || "09:00")
  );

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime())) {
    throw new Error("Invalid pickup or drop-off date/time");
  }
  if (dropoffAt <= pickupAt) {
    throw new Error("Drop-off must be after pickup");
  }

  const existing = await prisma.rentalBooking.findUnique({
    where: { id: input.id },
    select: { id: true, vehicleId: true, status: true },
  });
  if (!existing) throw new Error("Booking not found");

  const fleet = await getFleetAvailability(input.vehicleId, { pickupAt, dropoffAt }, {
    excludeBookingId: input.id,
  });
  if (fleet.availableUnits <= 0) {
    throw new Error("This vehicle is fully booked for the selected dates");
  }

  const updated = await prisma.rentalBooking.update({
    where: { id: input.id },
    data: {
      vehicleId: input.vehicleId,
      customerName: input.customerName.trim(),
      pickupAt,
      dropoffAt,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/vehicles/${input.vehicleId}/edit`);
  if (existing.vehicleId !== input.vehicleId) {
    revalidatePath(`/admin/vehicles/${existing.vehicleId}/edit`);
  }

  return { id: updated.id };
}

export async function cancelAdminRentalBooking(bookingId: string) {
  await requireBookingAdmin(true);

  const existing = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, vehicleId: true, status: true },
  });
  if (!existing) throw new Error("Booking not found");
  if (existing.status === "CANCELLED") return { ok: true };

  const { handleRentalBookingStatusChange } = await import("@/lib/rentals/rental-inventory-units");
  const { RentalBookingStatus } = await import("@prisma/client");

  await prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: { status: RentalBookingStatus.CANCELLED },
    });
    await handleRentalBookingStatusChange(
      bookingId,
      existing.status,
      RentalBookingStatus.CANCELLED,
      tx
    );
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/vehicles/${existing.vehicleId}/edit`);
  return { ok: true };
}
