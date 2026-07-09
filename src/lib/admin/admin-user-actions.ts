"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuditAction, Role, UserStatus } from "@prisma/client";
import { ASSIGNABLE_ADMIN_ROLES, hasPermission } from "@/lib/admin/permissions";

const adminUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  phone: z.string().trim().optional(),
  dealerId: z.string().optional(),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "users:admin_manage")) throw new Error("Forbidden");
  return session.user;
}

async function logAudit(userId: string, action: AuditAction, entity: string, entityId?: string, details?: object) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ?? undefined,
      },
    });
  } catch {
    // Non-blocking
  }
}

function validateAssignableRole(role: Role) {
  if (!ASSIGNABLE_ADMIN_ROLES.includes(role)) {
    throw new Error("This role cannot be assigned");
  }
}

export async function createAdminUser(input: z.infer<typeof adminUserSchema>) {
  const actor = await requireSuperAdmin();
  const parsed = adminUserSchema.parse(input);
  validateAssignableRole(parsed.role);

  if (!parsed.password) {
    throw new Error("Password is required for new admin users");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      phone: parsed.phone,
      dealerId: parsed.role === Role.DEALER_MANAGER ? parsed.dealerId || null : null,
      status: UserStatus.ACTIVE,
    },
  });

  await logAudit(actor.id, "CREATE", "User", user.id, { email: user.email, role: user.role });
  revalidatePath("/admin/admins");
  return { id: user.id };
}

export async function updateAdminUser(
  userId: string,
  input: z.infer<typeof adminUserSchema>
) {
  const actor = await requireSuperAdmin();
  const parsed = adminUserSchema.parse(input);
  validateAssignableRole(parsed.role);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found");
  if (target.role === Role.SUPER_ADMIN) throw new Error("Super Admin accounts cannot be edited here");

  const emailTaken = await prisma.user.findFirst({
    where: { email: parsed.email, id: { not: userId } },
  });
  if (emailTaken) throw new Error("Email is already in use");

  const passwordHash = parsed.password ? await bcrypt.hash(parsed.password, 12) : undefined;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      phone: parsed.phone,
      dealerId: parsed.role === Role.DEALER_MANAGER ? parsed.dealerId || null : null,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  await logAudit(actor.id, "UPDATE", "User", user.id, { email: user.email, role: user.role });
  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}/edit`);
}

export async function deleteAdminUser(userId: string) {
  const actor = await requireSuperAdmin();
  if (actor.id === userId) throw new Error("You cannot delete your own account");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found");
  if (target.role === Role.SUPER_ADMIN) throw new Error("Super Admin accounts cannot be deleted");

  await prisma.user.delete({ where: { id: userId } });
  await logAudit(actor.id, "DELETE", "User", userId, { email: target.email });
  revalidatePath("/admin/admins");
}

export async function updateAdminUserStatus(userId: string, status: UserStatus) {
  const actor = await requireSuperAdmin();
  if (actor.id === userId) throw new Error("You cannot change your own status");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found");
  if (target.role === Role.SUPER_ADMIN) throw new Error("Super Admin status cannot be changed here");

  await prisma.user.update({ where: { id: userId }, data: { status } });
  await logAudit(actor.id, status === UserStatus.BANNED ? "SUSPEND" : "UPDATE", "User", userId, { status });
  revalidatePath("/admin/admins");
}
