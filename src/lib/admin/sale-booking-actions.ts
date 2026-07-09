"use server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { revalidatePath } from "next/cache";
import {
  acceptSaleBooking,
  cancelSaleBooking,
  completeSaleBooking,
  finalizeSaleBookingDeal,
  markSaleBookingPaid,
  scheduleSaleBookingMeeting,
} from "@/lib/sales/sale-booking-service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:view")) throw new Error("Forbidden");
  return session.user;
}

export async function acceptSaleBookingAction(bookingId: string) {
  await requireAdmin();
  await acceptSaleBooking(bookingId);
  revalidatePath("/admin/sale-bookings");
}

export async function scheduleSaleMeetingAction(
  bookingId: string,
  input: { meetingScheduledAt: string; meetingLocation: string; meetingNotes?: string }
) {
  await requireAdmin();
  const meetingScheduledAt = new Date(input.meetingScheduledAt);
  if (Number.isNaN(meetingScheduledAt.getTime())) {
    throw new Error("Invalid meeting date/time");
  }

  await scheduleSaleBookingMeeting(bookingId, {
    meetingScheduledAt,
    meetingLocation: input.meetingLocation.trim(),
    meetingNotes: input.meetingNotes?.trim(),
  });

  revalidatePath("/admin/sale-bookings");
}

export async function finalizeSaleDealAction(bookingId: string, agreedPriceAud: number) {
  await requireAdmin();
  if (!Number.isFinite(agreedPriceAud) || agreedPriceAud <= 0) {
    throw new Error("Invalid agreed price");
  }

  await finalizeSaleBookingDeal(bookingId, Math.round(agreedPriceAud * 100));
  revalidatePath("/admin/sale-bookings");
}

export async function markSalePaidAction(bookingId: string) {
  await requireAdmin();
  await markSaleBookingPaid(bookingId);
  revalidatePath("/admin/sale-bookings");
}

export async function completeSaleAction(bookingId: string) {
  await requireAdmin();
  await completeSaleBooking(bookingId);
  revalidatePath("/admin/sale-bookings");
  revalidatePath("/admin/vehicles");
}

export async function cancelSaleBookingAction(bookingId: string) {
  await requireAdmin();
  await cancelSaleBooking(bookingId);
  revalidatePath("/admin/sale-bookings");
}
