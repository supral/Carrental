"use server";

import { FleetVehicleStatus, ListingPurpose, Role, VehicleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission, isSuperAdmin } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import {
  allocateNextFleetNumber,
  createFleetVehicleRecord,
  createFleetVehicleRecordsBulk,
  deleteFleetVehicleRecord,
  getFleetTypeStatusCountsBatch,
  updateFleetVehicleRecord,
} from "@/lib/rentals/fleet-vehicles";
import { saveVehicleRentalOptionAssignments } from "@/lib/admin/rental-option-actions";
import { formatVehicleName } from "@/lib/vehicles/display";
import { BLOCKING_RENTAL_STATUSES } from "@/lib/rentals/fleet-inventory";

async function requireFleetAdmin(manage = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const permission = manage ? "vehicles:manage" : "vehicles:view";
  if (!hasPermission(session.user.role, permission)) throw new Error("Forbidden");
  return session.user;
}

export async function listVehicleTypesForFleet() {
  await requireFleetAdmin();

  const vehicles = await prisma.vehicle.findMany({
    where: {
      listingPurpose: ListingPurpose.RENTAL,
      status: { in: [VehicleStatus.ACTIVE, VehicleStatus.PENDING, VehicleStatus.DRAFT] },
    },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
      price: true,
      fuelType: true,
      transmission: true,
      seats: true,
      doors: true,
      driveType: true,
      color: true,
      bodyType: true,
      location: true,
      features: true,
      description: true,
      images: { orderBy: { order: "asc" }, take: 3, select: { url: true } },
      _count: { select: { fleetVehicles: true } },
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: formatVehicleName(vehicle),
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: vehicle.price,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    seats: vehicle.seats,
    doors: vehicle.doors,
    driveType: vehicle.driveType,
    color: vehicle.color,
    bodyType: vehicle.bodyType,
    location: vehicle.location,
    features: vehicle.features,
    description: vehicle.description,
    imageUrls: vehicle.images.map((image) => image.url),
    fleetCount: vehicle._count.fleetVehicles,
  }));
}

export async function previewNextFleetNumber(vehicleId: string) {
  await requireFleetAdmin();
  if (!vehicleId) return null;
  return allocateNextFleetNumber(vehicleId);
}

export async function listFleetTypeSummaries() {
  await requireFleetAdmin();

  const types = await prisma.vehicle.findMany({
    where: {
      listingPurpose: ListingPurpose.RENTAL,
      fleetVehicles: { some: {} },
    },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
    },
    orderBy: [{ title: "asc" }, { make: "asc" }, { model: "asc" }],
  });

  const statsByType = await getFleetTypeStatusCountsBatch(types.map((type) => type.id));

  return types.map((type) => {
    const stats = statsByType.get(type.id) ?? {
      fleetSize: 0,
      available: 0,
      rented: 0,
      reserved: 0,
      maintenance: 0,
      inactive: 0,
    };

    return {
      vehicleId: type.id,
      vehicleName: formatVehicleName(type),
      fleetSize: stats.fleetSize,
      available: stats.available,
      rented: stats.rented,
      reserved: stats.reserved,
      maintenance: stats.maintenance,
    };
  });
}

export async function listFleetVehicles() {
  await requireFleetAdmin();

  const rows = await prisma.fleetVehicle.findMany({
    include: {
      vehicle: {
        select: {
          id: true,
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
          price: true,
          vehicleRentalOptions: {
            where: { enabled: true },
            include: { rentalOption: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ fleetNumber: "asc" }],
  });

  const typeIds = [...new Set(rows.map((row) => row.vehicleId))];
  const statsByType = await getFleetTypeStatusCountsBatch(typeIds);

  return rows.map((row) => {
    const stats = statsByType.get(row.vehicleId) ?? {
      fleetSize: 0,
      available: 0,
      rented: 0,
      reserved: 0,
      maintenance: 0,
      inactive: 0,
    };

    return {
      id: row.id,
      fleetNumber: row.fleetNumber,
      make: row.make ?? row.vehicle.make,
      model: row.model ?? row.vehicle.model,
      year: row.year ?? row.vehicle.year,
      registrationNumber: row.registrationNumber,
      vinNumber: row.vinNumber,
      engineNumber: row.engineNumber,
      odometer: row.odometer ?? row.currentKm,
      color: row.color,
      purchaseDate: row.purchaseDate?.toISOString() ?? null,
      purchaseCostCents: row.purchaseCostCents,
      branch: row.branch,
      status: row.status,
      notes: row.notes,
      vehicleId: row.vehicleId,
      vehicleName: row.vehicle.title,
      rentalOptions: row.vehicle.vehicleRentalOptions.map((item) => item.rentalOption.name),
      dailyPrice: row.vehicle.price,
      createdAt: row.createdAt.toISOString(),
      fleetSize: stats.fleetSize,
      available: stats.available,
      rented: stats.rented,
      reserved: stats.reserved,
      maintenance: stats.maintenance,
    };
  });
}

export type FleetVehicleFormInput = {
  vehicleId: string;
  /** Super Admin override only — otherwise auto-generated. Ignored when unitCount > 1. */
  fleetNumber?: string;
  /** How many physical cars to create (each gets its own Fleet #). Default 1. */
  unitCount?: number;
  make?: string;
  model?: string;
  year?: number | null;
  registrationNumber?: string;
  vinNumber?: string;
  engineNumber?: string;
  odometer?: number | null;
  color?: string;
  purchaseDate?: string | null;
  purchaseCostCents?: number | null;
  branch?: string;
  status?: FleetVehicleStatus;
  notes?: string;
  rentalOptionIds?: string[];
};

export async function createFleetVehicle(input: FleetVehicleFormInput) {
  const user = await requireFleetAdmin(true);

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, listingPurpose: ListingPurpose.RENTAL },
    select: { id: true },
  });
  if (!vehicle) throw new Error("Select a valid vehicle type");

  if (input.year == null || Number.isNaN(Number(input.year))) {
    throw new Error("Year is required for fleet vehicles");
  }

  const unitCount = Math.max(1, Math.min(500, Math.floor(Number(input.unitCount ?? 1))));
  if (!Number.isFinite(unitCount) || unitCount < 1) {
    throw new Error("Number of units must be at least 1");
  }

  const fleetNumberOverride =
    unitCount === 1 && input.fleetNumber?.trim() && isSuperAdmin(user.role as Role)
      ? input.fleetNumber.trim()
      : undefined;

  const recordInput = {
    vehicleId: input.vehicleId,
    fleetNumber: fleetNumberOverride,
    make: input.make,
    model: input.model,
    year: input.year,
    // Per-unit identifiers only when adding a single car
    registrationNumber: unitCount === 1 ? input.registrationNumber : undefined,
    vinNumber: unitCount === 1 ? input.vinNumber : undefined,
    engineNumber: unitCount === 1 ? input.engineNumber : undefined,
    odometer: unitCount === 1 ? input.odometer ?? undefined : undefined,
    color: input.color,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
    purchaseCostCents: input.purchaseCostCents ?? null,
    branch: input.branch,
    status: input.status,
    notes: input.notes,
  };

  // Bulk path: one number allocation + batched createMany (Neon/Vercel safe).
  // Single-unit path keeps override + rego/VIN/odometer support.
  const created =
    unitCount === 1
      ? await createFleetVehicleRecord(recordInput).then((row) => ({
          id: row.id,
          fleetNumbers: [row.fleetNumber],
        }))
      : await createFleetVehicleRecordsBulk(recordInput, unitCount);

  if (input.rentalOptionIds) {
    await saveVehicleRentalOptionAssignments(input.vehicleId, input.rentalOptionIds);
  }

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/fleet/type/${input.vehicleId}`);

  return {
    id: created.id,
    fleetNumber: created.fleetNumbers[0],
    count: created.fleetNumbers.length,
    fleetNumbers: created.fleetNumbers,
  };
}

export async function updateFleetVehicle(id: string, input: Partial<FleetVehicleFormInput>) {
  const user = await requireFleetAdmin(true);

  if (input.fleetNumber !== undefined && !isSuperAdmin(user.role as Role)) {
    throw new Error("Only Super Admin can change Fleet Numbers");
  }

  if (input.fleetNumber?.trim()) {
    const fleetNumber = input.fleetNumber.trim().toUpperCase();
    const conflict = await prisma.fleetVehicle.findFirst({
      where: { fleetNumber, id: { not: id } },
      select: { id: true },
    });
    if (conflict) throw new Error(`Fleet number ${fleetNumber} is already in use`);
  }

  const existing = await prisma.fleetVehicle.findUnique({
    where: { id },
    select: { vehicleId: true },
  });

  await updateFleetVehicleRecord(id, {
    fleetNumber: input.fleetNumber,
    make: input.make,
    model: input.model,
    year: input.year === null ? undefined : input.year ?? undefined,
    registrationNumber: input.registrationNumber,
    vinNumber: input.vinNumber,
    engineNumber: input.engineNumber,
    odometer: input.odometer === null ? undefined : input.odometer,
    color: input.color,
    purchaseDate:
      input.purchaseDate === undefined
        ? undefined
        : input.purchaseDate
          ? new Date(input.purchaseDate)
          : null,
    purchaseCostCents: input.purchaseCostCents,
    branch: input.branch,
    status: input.status,
    notes: input.notes,
  });

  if (input.vehicleId && input.rentalOptionIds) {
    await saveVehicleRentalOptionAssignments(input.vehicleId, input.rentalOptionIds);
  }

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
  if (existing) revalidatePath(`/admin/fleet/type/${existing.vehicleId}`);
  return { ok: true };
}

export async function deleteFleetVehicle(id: string) {
  await requireFleetAdmin(true);
  const existing = await prisma.fleetVehicle.findUnique({
    where: { id },
    select: { vehicleId: true },
  });
  await deleteFleetVehicleRecord(id);
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
  if (existing) revalidatePath(`/admin/fleet/type/${existing.vehicleId}`);
  return { ok: true };
}

export async function getVehicleTypePreview(vehicleId: string) {
  await requireFleetAdmin();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, listingPurpose: ListingPurpose.RENTAL },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      price: true,
      fuelType: true,
      transmission: true,
      seats: true,
      doors: true,
      driveType: true,
      color: true,
      bodyType: true,
      features: true,
      description: true,
      images: { orderBy: { order: "asc" }, take: 4, select: { url: true } },
      vehicleRentalOptions: {
        where: { enabled: true },
        include: { rentalOption: true },
      },
    },
  });

  if (!vehicle) return null;

  const [assignedOptions, nextFleetNumber] = await Promise.all([
    prisma.vehicleRentalOption.findMany({
      where: { vehicleId, enabled: true },
      select: { rentalOptionId: true },
    }),
    allocateNextFleetNumber(vehicleId),
  ]);

  return {
    id: vehicle.id,
    title: formatVehicleName(vehicle),
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: vehicle.price,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    seats: vehicle.seats,
    doors: vehicle.doors,
    driveType: vehicle.driveType,
    color: vehicle.color,
    bodyType: vehicle.bodyType,
    features: vehicle.features,
    description: vehicle.description,
    imageUrls: vehicle.images.map((image) => image.url),
    rentalOptions: vehicle.vehicleRentalOptions.map((row) => row.rentalOption.name),
    rentalOptionIds: assignedOptions.map((row) => row.rentalOptionId),
    nextFleetNumber,
  };
}

/** Roster of every physical unit under a vehicle type (History page). */
export async function getFleetTypeRoster(vehicleId: string) {
  await requireFleetAdmin();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, listingPurpose: ListingPurpose.RENTAL },
    select: { id: true, title: true, make: true, model: true, year: true },
  });
  if (!vehicle) return null;

  const now = new Date();
  const units = await prisma.fleetVehicle.findMany({
    where: { vehicleId },
    orderBy: { fleetNumber: "asc" },
    include: {
      rentalBookings: {
        where: {
          status: { in: BLOCKING_RENTAL_STATUSES },
          dropoffAt: { gt: now },
        },
        orderBy: { pickupAt: "asc" },
        take: 1,
        select: {
          id: true,
          customerName: true,
          status: true,
          pickupAt: true,
          dropoffAt: true,
        },
      },
    },
  });

  const statsByType = await getFleetTypeStatusCountsBatch([vehicleId]);
  const typeStats = statsByType.get(vehicleId)!;

  return {
    vehicle: {
      id: vehicle.id,
      title: vehicle.title,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    },
    stats: typeStats,
    units: units.map((unit) => {
      const booking = unit.rentalBookings[0] ?? null;
      return {
        id: unit.id,
        fleetNumber: unit.fleetNumber,
        registrationNumber: unit.registrationNumber,
        vinNumber: unit.vinNumber,
        currentKm: unit.currentKm ?? unit.odometer,
        currentFuelLevel: unit.currentFuelLevel,
        status: unit.status,
        year: unit.year,
        make: unit.make,
        model: unit.model,
        currentBooking: booking
          ? {
              id: booking.id,
              customerName: booking.customerName,
              status: booking.status,
              pickupAt: booking.pickupAt.toISOString(),
              dropoffAt: booking.dropoffAt.toISOString(),
            }
          : null,
      };
    }),
  };
}
