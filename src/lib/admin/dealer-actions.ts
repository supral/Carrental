"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuditAction, DealerStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/admin/permissions";
import { slugifyDealerName } from "@/lib/dealers/dealer-slug";

const dealerFormSchema = z.object({
  name: z.string().min(2, "Dealer name is required"),
  slug: z
    .string()
    .min(2, "Site URL slug is required")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(5, "Address is required"),
  description: z.string().optional(),
  tagline: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #dc2626").optional(),
  verified: z.boolean().optional(),
  status: z.nativeEnum(DealerStatus).optional(),
});

export type DealerFormValues = z.infer<typeof dealerFormSchema>;

async function requireDealerManage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "dealers:manage")) throw new Error("Forbidden");
  return session.user;
}

async function ensureUniqueSlug(slug: string, excludeId?: string) {
  const existing = await prisma.dealer.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new Error("That site URL is already taken. Choose a different slug.");
}

export async function suggestDealerSlug(name: string): Promise<string> {
  const base = slugifyDealerName(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.dealer.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function createDealer(values: DealerFormValues) {
  const user = await requireDealerManage();
  const parsed = dealerFormSchema.parse(values);
  await ensureUniqueSlug(parsed.slug);

  const dealer = await prisma.dealer.create({
    data: {
      name: parsed.name.trim(),
      slug: parsed.slug,
      email: parsed.email.trim().toLowerCase(),
      phone: parsed.phone.trim(),
      address: parsed.address.trim(),
      description: parsed.description?.trim() || null,
      tagline: parsed.tagline?.trim() || null,
      logo: parsed.logo?.trim() || null,
      primaryColor: parsed.primaryColor || "#dc2626",
      verified: parsed.verified ?? false,
      status: parsed.status ?? DealerStatus.PENDING,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Dealer",
      entityId: dealer.id,
      details: { name: dealer.name, slug: dealer.slug },
    },
  });

  revalidatePath("/admin/dealers");
  revalidatePath("/dealers");
  revalidatePath(`/dealers/${dealer.slug}`);
  return { id: dealer.id, slug: dealer.slug };
}

export async function updateDealer(dealerId: string, values: DealerFormValues) {
  const user = await requireDealerManage();
  const parsed = dealerFormSchema.parse(values);
  await ensureUniqueSlug(parsed.slug, dealerId);

  const dealer = await prisma.dealer.update({
    where: { id: dealerId },
    data: {
      name: parsed.name.trim(),
      slug: parsed.slug,
      email: parsed.email.trim().toLowerCase(),
      phone: parsed.phone.trim(),
      address: parsed.address.trim(),
      description: parsed.description?.trim() || null,
      tagline: parsed.tagline?.trim() || null,
      logo: parsed.logo?.trim() || null,
      primaryColor: parsed.primaryColor || "#dc2626",
      verified: parsed.verified ?? false,
      status: parsed.status,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Dealer",
      entityId: dealer.id,
      details: { name: dealer.name, slug: dealer.slug },
    },
  });

  revalidatePath("/admin/dealers");
  revalidatePath("/dealers");
  revalidatePath(`/dealers/${dealer.slug}`);
  return { id: dealer.id, slug: dealer.slug };
}
