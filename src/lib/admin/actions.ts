"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { VehicleStatus, DealerStatus, UserStatus, AuditAction, ListingPurpose, NotificationType, Role } from "@prisma/client";
import { hasPermission } from "@/lib/admin/permissions";
import {
  createVehicleSchema,
  parseVehicleForm,
  type CreateVehicleFormValues,
} from "@/lib/admin/vehicle-schema";
import { adjustRentalTotalUnits } from "@/lib/rentals/rental-inventory-units";
import { saveVehicleRentalOptionAssignments } from "@/lib/admin/rental-option-actions";
import {
  saveVehicleCustomFields,
  saveVehicleTemplateValues,
  type CustomFieldInput,
  type TemplateFieldValueInput,
} from "@/lib/vehicles/vehicle-specs-service";
import { detailsToLegacyFields } from "@/lib/vehicles/vehicle-details";
import {
  assignSeasonOfferToVehicle,
  vehicleOfferClearedFields,
} from "@/lib/vehicles/vehicle-offers-server";
import { dismissLeadNotifications } from "@/lib/admin/notification-service";
import { markNotificationRead as markNotificationReadForUser } from "@/lib/admin/notification-service";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, image: true },
  });

  if (!dbUser) {
    throw new Error("Your session is no longer valid. Please sign out and sign in again.");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    image: dbUser.image,
  };
}

async function logAudit(userId: string, action: AuditAction, entity: string, entityId?: string, details?: object) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action,
        entity,
        entityId,
        details: details ?? undefined,
      },
    });
  } catch {
    // Audit logging must not block primary admin actions.
  }
}

async function notifySuperAdmins(title: string, message: string, link?: string) {
  try {
    const superAdmins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });

    if (superAdmins.length === 0) return;

    await prisma.notification.createMany({
      data: superAdmins.map((admin) => ({
        userId: admin.id,
        type: NotificationType.APPROVAL_REQUEST,
        title,
        message,
        link,
      })),
    });
  } catch {
    // Non-blocking
  }
}

export async function createVehicle(
  values: CreateVehicleFormValues,
  uploadedImageUrls: string[] = [],
  rentalOptionIds?: string[],
  vehicleDetails?: import("@/lib/vehicles/vehicle-details").VehicleDetailsDocument,
  templateValues?: TemplateFieldValueInput[],
  customFields?: CustomFieldInput[],
  seasonOfferId?: string | null
) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "vehicles:manage")) throw new Error("Forbidden");

  const parsed = createVehicleSchema.parse({
    ...values,
    listingPurpose: ListingPurpose.RENTAL,
  });
  const data = parseVehicleForm(parsed, uploadedImageUrls, vehicleDetails);
  const canPublishLive = hasPermission(user.role, "vehicles:approve");
  const status = canPublishLive ? data.status : VehicleStatus.PENDING;
  const featured = canPublishLive ? data.featured : false;

  const vehicle = await prisma.vehicle.create({
    data: {
      title: data.title,
      vehicleNumber: data.vehicleNumber,
      make: data.make,
      model: data.model,
      year: data.year,
      price: data.price,
      mileage: data.mileage,
      fuelType: data.fuelType,
      transmission: data.transmission,
      bodyType: data.bodyType,
      vehicleTypeId: data.vehicleTypeId,
      category: data.category,
      listingPurpose: data.listingPurpose as import("@prisma/client").ListingPurpose,
      condition: data.condition,
      color: data.color,
      doors: data.doors,
      seats: data.seats,
      driveType: data.driveType,
      location: data.location,
      description: data.description,
      features: data.features,
      details: data.details as object,
      status,
      featured,
      dealerId: data.dealerId,
      createdById: user.id,
      rentalAvailableFrom: data.rentalAvailableFrom,
      rentalAvailableTo: data.rentalAvailableTo,
      totalUnits: data.listingPurpose === ListingPurpose.RENTAL ? data.totalUnits : 1,
      availableUnits: data.listingPurpose === ListingPurpose.RENTAL ? data.totalUnits : 1,
      images: {
        create: data.imageUrls.map((url, order) => ({ url, order })),
      },
    },
  });

  if (templateValues?.length) {
    await saveVehicleTemplateValues(vehicle.id, templateValues);
  }
  if (customFields?.length) {
    await saveVehicleCustomFields(vehicle.id, customFields);
  }
  if (data.listingPurpose === ListingPurpose.RENTAL && rentalOptionIds?.length) {
    await saveVehicleRentalOptionAssignments(vehicle.id, rentalOptionIds);
  }
  if (data.listingPurpose === ListingPurpose.SALE && seasonOfferId) {
    await assignSeasonOfferToVehicle(vehicle.id, seasonOfferId);
  }

  await logAudit(user.id, "CREATE", "Vehicle", vehicle.id, { title: vehicle.title, status });
  if (status === VehicleStatus.PENDING) {
    await notifySuperAdmins(
      "New listing awaiting review",
      `${user.name} submitted "${vehicle.title}" for approval.`,
      "/admin/moderation"
    );
  }
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin");
  revalidatePath("/vehicles");
  revalidatePath("/car-rental", "layout");
  revalidatePath("/admin/marketing/offers");
  revalidatePath("/");
  return { id: vehicle.id };
}

export async function updateVehicleRentalOptions(
  vehicleId: string,
  rentalOptionIds: string[],
  totalUnits?: number,
  vehicleDetails?: import("@/lib/vehicles/vehicle-details").VehicleDetailsDocument,
  templateValues?: TemplateFieldValueInput[],
  customFields?: CustomFieldInput[],
  vehicleTypeId?: string | null
) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "vehicles:manage")) throw new Error("Forbidden");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { listingPurpose: true, totalUnits: true, vehicleTypeId: true },
  });

  if (!vehicle || vehicle.listingPurpose !== ListingPurpose.RENTAL) {
    throw new Error("Vehicle is not a rental listing");
  }

  if (totalUnits !== undefined) {
    await adjustRentalTotalUnits(vehicleId, totalUnits);
  }

  const legacy = vehicleDetails ? detailsToLegacyFields(vehicleDetails) : null;

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      rentalAvailableTo: null,
      ...(vehicleTypeId !== undefined ? { vehicleTypeId } : {}),
      ...(vehicleDetails
        ? {
            details: vehicleDetails as object,
            description: legacy?.description ?? "",
            features: legacy?.features ?? [],
          }
        : {}),
    },
  });

  await saveVehicleRentalOptionAssignments(vehicleId, rentalOptionIds);
  if (templateValues) await saveVehicleTemplateValues(vehicleId, templateValues);
  if (customFields) await saveVehicleCustomFields(vehicleId, customFields);

  await logAudit(user.id, "UPDATE", "Vehicle", vehicleId, { rentalFleet: true });
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}/edit`);
  revalidatePath("/car-rental", "layout");
}

export async function updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
  const user = await getSessionUser();

  if (status === VehicleStatus.ACTIVE || status === VehicleStatus.REJECTED) {
    if (!hasPermission(user.role, "vehicles:approve")) {
      throw new Error("Only Super Admin can approve or reject listings");
    }
  } else if (!hasPermission(user.role, "vehicles:manage")) {
    throw new Error("Forbidden");
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status,
      soldAt: status === VehicleStatus.SOLD ? new Date() : null,
      featured: status === VehicleStatus.ACTIVE ? undefined : false,
      ...(status === VehicleStatus.SOLD
        ? { seasonOfferId: null, ...vehicleOfferClearedFields }
        : {}),
    },
  });

  await logAudit(user.id, status === VehicleStatus.ACTIVE ? "APPROVE" : status === VehicleStatus.REJECTED ? "REJECT" : "UPDATE", "Vehicle", vehicleId, { status });
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/marketing/offers");
  revalidatePath("/vehicles");
  revalidatePath("/car-rental", "layout");
  revalidatePath("/");
}

export async function toggleVehicleFeatured(vehicleId: string, featured: boolean) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "vehicles:manage")) throw new Error("Forbidden");

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { featured } });
  await logAudit(user.id, "UPDATE", "Vehicle", vehicleId, { featured });
  revalidatePath("/admin/vehicles");
  revalidatePath("/");
}

export async function deleteVehicle(vehicleId: string) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "vehicles:manage")) throw new Error("Forbidden");

  await prisma.vehicle.delete({ where: { id: vehicleId } });
  await logAudit(user.id, "DELETE", "Vehicle", vehicleId);
  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
  revalidatePath("/car-rental", "layout");
  revalidatePath("/");
}

export async function updateDealerStatus(dealerId: string, status: DealerStatus) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "dealers:manage")) throw new Error("Forbidden");

  await prisma.dealer.update({
    where: { id: dealerId },
    data: { status, verified: status === DealerStatus.APPROVED },
  });
  await logAudit(user.id, status === DealerStatus.APPROVED ? "APPROVE" : "SUSPEND", "Dealer", dealerId, { status });
  revalidatePath("/admin/dealers");
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "users:manage") && !hasPermission(user.role, "users:admin_manage")) {
    throw new Error("Forbidden");
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  await logAudit(user.id, status === UserStatus.BANNED ? "SUSPEND" : "UPDATE", "User", userId, { status });
  revalidatePath("/admin/users");
}

export async function updateLeadStatus(leadId: string, status: string, assignedToId?: string) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "leads:manage")) throw new Error("Forbidden");

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as never, assignedToId: assignedToId || undefined },
  });
  await logAudit(user.id, "UPDATE", "Lead", leadId, { status });
  if (status !== "NEW") {
    await dismissLeadNotifications(leadId);
  }
  revalidatePath("/admin/leads");
}

export async function markNotificationRead(notificationId: string) {
  const user = await getSessionUser();
  await markNotificationReadForUser(notificationId, user.id);
}

export async function addModeratorNote(vehicleId: string, content: string) {
  const user = await getSessionUser();
  if (!hasPermission(user.role, "vehicles:approve")) throw new Error("Forbidden");

  await prisma.moderatorNote.create({
    data: { vehicleId, authorId: user.id, content },
  });
  revalidatePath("/admin/moderation");
}
