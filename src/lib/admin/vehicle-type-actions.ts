"use server";

import { revalidatePath } from "next/cache";
import { TemplateFieldInputType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";

async function requireManage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:manage")) throw new Error("Forbidden");
  return session.user;
}

export async function listVehicleTypes(search?: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  return prisma.vehicleType.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: {
      _count: { select: { templateFields: true, vehicles: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getVehicleTypeWithTemplate(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");

  return prisma.vehicleType.findUnique({
    where: { id },
    include: {
      templateFields: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
}

export async function createVehicleType(data: {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}) {
  await requireManage();
  const type = await prisma.vehicleType.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      icon: data.icon?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  revalidatePath("/admin/vehicle-types");
  return type;
}

export async function updateVehicleType(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
    active?: boolean;
  }
) {
  await requireManage();
  const type = await prisma.vehicleType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  revalidatePath("/admin/vehicle-types");
  revalidatePath(`/admin/vehicle-types/${id}`);
  return type;
}

export async function deleteVehicleType(id: string) {
  await requireManage();
  const count = await prisma.vehicle.count({ where: { vehicleTypeId: id } });
  if (count > 0) {
    throw new Error("Cannot delete a vehicle type that is assigned to vehicles.");
  }
  await prisma.vehicleType.delete({ where: { id } });
  revalidatePath("/admin/vehicle-types");
}

export type TemplateFieldInput = {
  id?: string;
  name: string;
  inputType: TemplateFieldInputType;
  required: boolean;
  sortOrder: number;
  group: string;
  defaultValue?: string | null;
};

export async function saveVehicleTypeTemplateFields(
  vehicleTypeId: string,
  fields: TemplateFieldInput[]
) {
  await requireManage();

  const existing = await prisma.vehicleTemplateField.findMany({
    where: { vehicleTypeId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((f) => f.id));
  const incomingIds = new Set(fields.filter((f) => f.id).map((f) => f.id!));

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.vehicleTemplateField.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  for (const field of fields) {
    if (!field.name.trim()) continue;
    if (field.id && existingIds.has(field.id)) {
      await prisma.vehicleTemplateField.update({
        where: { id: field.id },
        data: {
          name: field.name.trim(),
          inputType: field.inputType,
          required: field.required,
          sortOrder: field.sortOrder,
          group: field.group.trim() || "Specifications",
          defaultValue: field.defaultValue?.trim() || null,
        },
      });
    } else {
      await prisma.vehicleTemplateField.create({
        data: {
          vehicleTypeId,
          name: field.name.trim(),
          inputType: field.inputType,
          required: field.required,
          sortOrder: field.sortOrder,
          group: field.group.trim() || "Specifications",
          defaultValue: field.defaultValue?.trim() || null,
        },
      });
    }
  }

  revalidatePath(`/admin/vehicle-types/${vehicleTypeId}`);
  revalidatePath("/admin/vehicle-types");
}
