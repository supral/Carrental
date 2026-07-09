import { NotificationType, Role, SaleBookingStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVehicleName } from "@/lib/vehicles/display";
import { revalidateNotificationPaths } from "@/lib/admin/notification-service";

async function getSaleBookingAdminUserIds(dealerId: string) {
  const admins = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      OR: [{ role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } }, { dealerId }],
    },
    select: { id: true },
  });

  return admins.map((admin) => admin.id);
}

function viewingFollowUpLink(bookingId: string) {
  return `/admin/sale-bookings?booking=${bookingId}`;
}

async function hasViewingFollowUpNotification(bookingId: string) {
  const existing = await prisma.notification.findFirst({
    where: {
      type: NotificationType.SYSTEM,
      title: "Viewing time completed",
      link: viewingFollowUpLink(bookingId),
    },
    select: { id: true },
  });

  return existing != null;
}

export async function processCompletedViewingFollowUps(now = new Date()) {
  const dueBookings = await prisma.saleBooking.findMany({
    where: {
      status: SaleBookingStatus.MEETING_SCHEDULED,
      meetingScheduledAt: { lt: now },
    },
    include: {
      vehicle: {
        select: { title: true, make: true, model: true, year: true },
      },
    },
  });

  let notified = 0;

  for (const booking of dueBookings) {
    if (await hasViewingFollowUpNotification(booking.id)) {
      continue;
    }

    const adminIds = await getSaleBookingAdminUserIds(booking.dealerId);
    if (adminIds.length === 0) {
      continue;
    }

    const vehicleName = formatVehicleName(booking.vehicle);

    await prisma.notification.createMany({
      data: adminIds.map((userId) => ({
        userId,
        type: NotificationType.SYSTEM,
        title: "Viewing time completed",
        message: `Viewing for ${vehicleName} with ${booking.customerName} has ended. Finalize the deal or cancel the request.`,
        link: viewingFollowUpLink(booking.id),
      })),
    });

    notified += 1;
  }

  if (notified > 0) {
    revalidateNotificationPaths();
  }

  return { notified, checked: dueBookings.length };
}
