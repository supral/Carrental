import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export function revalidateNotificationPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
  revalidateNotificationPaths();
}

export async function dismissSaleBookingNotifications(bookingId: string) {
  await prisma.notification.deleteMany({
    where: {
      type: NotificationType.SALE_BOOKING,
      link: { contains: `booking=${bookingId}` },
    },
  });
  revalidateNotificationPaths();
}

export async function dismissLeadNotifications(leadId: string) {
  await prisma.notification.deleteMany({
    where: {
      type: NotificationType.NEW_LEAD,
      link: { contains: `lead=${leadId}` },
    },
  });
  revalidateNotificationPaths();
}

export async function dismissViewingFollowUpNotifications(bookingId: string) {
  await prisma.notification.deleteMany({
    where: {
      type: NotificationType.SYSTEM,
      title: "Viewing time completed",
      link: `/admin/sale-bookings?booking=${bookingId}`,
    },
  });
  revalidateNotificationPaths();
}
