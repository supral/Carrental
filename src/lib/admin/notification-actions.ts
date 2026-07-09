"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  markNotificationRead,
  revalidateNotificationPaths,
} from "@/lib/admin/notification-service";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function openNotification(notificationId: string) {
  const user = await requireUser();

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: user.id },
    select: { id: true, link: true },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  await markNotificationRead(notification.id, user.id);
  redirect(notification.link || "/admin/notifications");
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await markNotificationRead(notificationId, user.id);
}

export async function dismissReadNotificationsAction() {
  const user = await requireUser();

  await prisma.notification.deleteMany({
    where: { userId: user.id, read: true },
  });

  revalidateNotificationPaths();
}
