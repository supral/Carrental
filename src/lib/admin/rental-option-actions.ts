"use server";

import { revalidatePath } from "next/cache";
import { RentalOptionCategory, RentalOptionPriceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";

async function requireManage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:manage")) throw new Error("Forbidden");
  return session.user;
}

export async function listRentalOptions(filters?: {
  search?: string;
  category?: RentalOptionCategory;
  activeOnly?: boolean;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  return prisma.rentalOption.findMany({
    where: {
      ...(filters?.search
        ? { name: { contains: filters.search, mode: "insensitive" } }
        : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.activeOnly ? { active: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getRentalOption(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");
  return prisma.rentalOption.findUnique({ where: { id } });
}

export async function createRentalOption(data: {
  name: string;
  category: RentalOptionCategory;
  price: number;
  description?: string;
  priceType?: RentalOptionPriceType;
  supportsQuantity?: boolean;
  maxQuantity?: number;
  sortOrder?: number;
}) {
  await requireManage();
  const option = await prisma.rentalOption.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      price: Math.max(0, data.price),
      description: data.description?.trim() || null,
      priceType: data.priceType ?? RentalOptionPriceType.PER_DAY,
      supportsQuantity: data.supportsQuantity ?? false,
      maxQuantity: data.maxQuantity ?? null,
      sortOrder: data.sortOrder ?? 0,
      active: true,
    },
  });
  revalidatePath("/admin/rental-options");
  return option;
}

export async function updateRentalOption(
  id: string,
  data: {
    name?: string;
    category?: RentalOptionCategory;
    price?: number;
    description?: string | null;
    priceType?: RentalOptionPriceType;
    supportsQuantity?: boolean;
    maxQuantity?: number | null;
    sortOrder?: number;
    active?: boolean;
  }
) {
  await requireManage();
  const option = await prisma.rentalOption.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.price !== undefined ? { price: Math.max(0, data.price) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.priceType !== undefined ? { priceType: data.priceType } : {}),
      ...(data.supportsQuantity !== undefined ? { supportsQuantity: data.supportsQuantity } : {}),
      ...(data.maxQuantity !== undefined ? { maxQuantity: data.maxQuantity } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  revalidatePath("/admin/rental-options");
  return option;
}

export async function deleteRentalOption(id: string) {
  await requireManage();
  await prisma.rentalOption.delete({ where: { id } });
  revalidatePath("/admin/rental-options");
}

export async function toggleRentalOptionActive(id: string, active: boolean) {
  await requireManage();
  await prisma.rentalOption.update({ where: { id }, data: { active } });
  revalidatePath("/admin/rental-options");
}

/** All active options with vehicle assignment state for admin vehicle form. */
export async function getRentalOptionsForVehicle(vehicleId?: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  const options = await prisma.rentalOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  if (!vehicleId) {
    return options.map((option) => ({
      ...option,
      assigned: false,
      enabled: false,
      priceOverride: null as number | null,
    }));
  }

  const assignments = await prisma.vehicleRentalOption.findMany({
    where: { vehicleId },
  });
  const byOptionId = new Map(assignments.map((a) => [a.rentalOptionId, a]));

  return options.map((option) => {
    const assignment = byOptionId.get(option.id);
    return {
      ...option,
      assigned: Boolean(assignment),
      enabled: assignment?.enabled ?? false,
      priceOverride: assignment?.priceOverride ?? null,
    };
  });
}

export async function saveVehicleRentalOptionAssignments(
  vehicleId: string,
  selectedOptionIds: string[]
) {
  await requireManage();

  await prisma.vehicleRentalOption.deleteMany({
    where: {
      vehicleId,
      rentalOptionId: { notIn: selectedOptionIds },
    },
  });

  for (const rentalOptionId of selectedOptionIds) {
    await prisma.vehicleRentalOption.upsert({
      where: {
        vehicleId_rentalOptionId: { vehicleId, rentalOptionId },
      },
      create: { vehicleId, rentalOptionId, enabled: true },
      update: { enabled: true },
    });
  }

  revalidatePath(`/admin/vehicles/${vehicleId}/edit`);
  revalidatePath("/admin/vehicles");
}
