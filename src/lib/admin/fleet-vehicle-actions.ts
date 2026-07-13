"use server";

import { FleetVehicleStatus, ListingPurpose, VehicleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import {
  createFleetVehicleRecord,
  deleteFleetVehicleRecord,
  updateFleetVehicleRecord,
} from "@/lib/rentals/fleet-vehicles";
import { formatVehicleName } from "@/lib/vehicles/display";

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
        },
      },
    },
    orderBy: [{ fleetNumber: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    fleetNumber: row.fleetNumber,
    registrationNumber: row.registrationNumber,
    vinNumber: row.vinNumber,
    engineNumber: row.engineNumber,
    odometer: row.odometer,
    color: row.color,
    purchaseDate: row.purchaseDate?.toISOString() ?? null,
    purchaseCostCents: row.purchaseCostCents,
    branch: row.branch,
    status: row.status,
    notes: row.notes,
    vehicleId: row.vehicleId,
    vehicleName: formatVehicleName(row.vehicle),
    dailyPrice: row.vehicle.price,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type FleetVehicleFormInput = {
  vehicleId: string;
  fleetNumber: string;
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
};

export async function createFleetVehicle(input: FleetVehicleFormInput) {
  await requireFleetAdmin(true);

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, listingPurpose: ListingPurpose.RENTAL },
    select: { id: true },
  });
  if (!vehicle) throw new Error("Select a valid vehicle type");

  const created = await createFleetVehicleRecord({
    vehicleId: input.vehicleId,
    fleetNumber: input.fleetNumber,
    registrationNumber: input.registrationNumber,
    vinNumber: input.vinNumber,
    engineNumber: input.engineNumber,
    odometer: input.odometer ?? undefined,
    color: input.color,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
    purchaseCostCents: input.purchaseCostCents ?? null,
    branch: input.branch,
    status: input.status,
    notes: input.notes,
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
  return { id: created.id, fleetNumber: created.fleetNumber };
}

export async function updateFleetVehicle(id: string, input: Partial<FleetVehicleFormInput>) {
  await requireFleetAdmin(true);

  await updateFleetVehicleRecord(id, {
    fleetNumber: input.fleetNumber,
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

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
  return { ok: true };
}

export async function deleteFleetVehicle(id: string) {
  await requireFleetAdmin(true);
  await deleteFleetVehicleRecord(id);
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/vehicles");
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
  };
}
