"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import {
  customerAgreementFormSchema,
  pickupChecklistSchema,
  returnChecklistSchema,
} from "@/lib/rentals/rental-agreement-validation";
import {
  assignVehicleAndCompletePickup,
  completeRental,
  getAgreementBookingByToken,
  markRentalSettlementPaid,
  processVehicleReturn,
  sendOrResendAgreementRequestEmail,
  submitCustomerRentalAgreement,
} from "@/lib/rentals/rental-agreement-service";
import { buildRentalAgreementUrl } from "@/lib/rentals/rental-workflow-emails";
import { calculateReturnCharges, DEFAULT_EXCESS_KM_RATE_CENTS, DEFAULT_FUEL_CHARGE_CENTS } from "@/lib/rentals/rental-charges";
import { FleetVehicleStatus } from "@prisma/client";

async function requireManage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:manage")) throw new Error("Forbidden");
  return session.user;
}

export async function submitPublicRentalAgreementAction(
  bookingId: string,
  token: string,
  raw: unknown
) {
  const parsed = customerAgreementFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid form data");
  }
  await submitCustomerRentalAgreement(bookingId, token, parsed.data);
  return { ok: true };
}

export async function getPublicAgreementBookingAction(bookingId: string, token: string) {
  const booking = await getAgreementBookingByToken(bookingId, token);
  if (!booking) return null;
  return {
    id: booking.id,
    status: booking.status,
    customerFormCompletedAt: booking.customerFormCompletedAt,
    pickupAt: booking.pickupAt.toISOString(),
    dropoffAt: booking.dropoffAt.toISOString(),
    vehicle: booking.vehicle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
  };
}

export async function getAdminBookingDetail(bookingId: string) {
  await requireManage();
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: {
      vehicle: true,
      fleetVehicle: true,
      drivers: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { generatedAt: "desc" } },
      rentalHistory: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  const agreementUrl =
    booking.agreementToken && !booking.customerFormCompletedAt
      ? buildRentalAgreementUrl(booking.id, booking.agreementToken)
      : null;

  const availableFleet = await prisma.fleetVehicle.findMany({
    where: {
      vehicleId: booking.vehicleId,
      OR: [
        { status: { in: [FleetVehicleStatus.AVAILABLE, FleetVehicleStatus.RESERVED] } },
        { id: booking.fleetVehicleId ?? undefined },
      ],
    },
    include: {
      vehicle: {
        select: {
          make: true,
          model: true,
          year: true,
          fuelType: true,
          transmission: true,
          color: true,
          price: true,
        },
      },
    },
    orderBy: { fleetNumber: "asc" },
  });

  return { booking, availableFleet, agreementUrl };
}

export async function sendAgreementEmailAction(bookingId: string) {
  await requireManage();
  const result = await sendOrResendAgreementRequestEmail(bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return result;
}

export async function assignAndPickupAction(bookingId: string, raw: unknown) {
  await requireManage();
  const parsed = pickupChecklistSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid pickup data");
  }
  await assignVehicleAndCompletePickup(bookingId, parsed.data);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true };
}

export async function previewReturnChargesAction(bookingId: string, raw: unknown) {
  await requireManage();
  const booking = await prisma.rentalBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.kmOut == null || !booking.fuelOut || !booking.expectedReturnAt) {
    throw new Error("Pickup data missing");
  }
  const kmIn = Number((raw as { kmIn?: number }).kmIn ?? 0);
  const fuelIn = String((raw as { fuelIn?: string }).fuelIn ?? "");
  const returnedAt = new Date(String((raw as { returnedAt?: string }).returnedAt ?? new Date().toISOString()));
  const damageChargeCents = Number((raw as { damageChargeCents?: number }).damageChargeCents ?? 0);

  return calculateReturnCharges({
    kmOut: booking.kmOut,
    expectedKmIn: booking.expectedKmIn ?? booking.kmOut,
    kmIn,
    fuelOut: booking.fuelOut,
    fuelIn,
    excessKmRateCents: booking.excessKmRateCents ?? DEFAULT_EXCESS_KM_RATE_CENTS,
    fuelChargeCents: DEFAULT_FUEL_CHARGE_CENTS,
    expectedReturnAt: booking.expectedReturnAt,
    returnedAt,
    damageChargeCents,
    rentalTotalCents: booking.totalAmountCents,
  });
}

export async function returnVehicleAction(bookingId: string, raw: unknown) {
  await requireManage();
  const parsed = returnChecklistSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid return data");
  }
  const charges = await processVehicleReturn(bookingId, parsed.data);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return charges;
}

export async function markSettlementPaidAction(bookingId: string) {
  await requireManage();
  await markRentalSettlementPaid(bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function completeRentalAction(bookingId: string) {
  await requireManage();
  await completeRental(bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true };
}

export async function getFleetVehicleHistory(fleetVehicleId: string) {
  await requireManage();
  return prisma.vehicleRentalHistory.findMany({
    where: { fleetVehicleId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export type OpsDashboardBookingRow = {
  id: string;
  customerName: string;
  status: string;
  pickupAt: string;
  dropoffAt: string;
  vehicleLabel: string;
  fleetLabel: string | null;
};

export type OpsDashboardStats = {
  currentlyRented: number;
  dueToday: number;
  lateReturns: number;
  pendingAgreements: number;
  pendingPayments: number;
  completedRentals: number;
  leavingToday: OpsDashboardBookingRow[];
  comingToday: OpsDashboardBookingRow[];
};

function startOfLocalDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfLocalDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function mapOpsBookingRow(booking: {
  id: string;
  customerName: string | null;
  status: string;
  pickupAt: Date;
  dropoffAt: Date;
  vehicle: { year: number; make: string; model: string };
  fleetVehicle: { fleetNumber: string; registrationNumber: string | null } | null;
}): OpsDashboardBookingRow {
  return {
    id: booking.id,
    customerName: booking.customerName || "Guest",
    status: booking.status,
    pickupAt: booking.pickupAt.toISOString(),
    dropoffAt: booking.dropoffAt.toISOString(),
    vehicleLabel: `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`,
    fleetLabel: booking.fleetVehicle
      ? `${booking.fleetVehicle.fleetNumber}${
          booking.fleetVehicle.registrationNumber
            ? ` · ${booking.fleetVehicle.registrationNumber}`
            : ""
        }`
      : null,
  };
}

export async function getOpsDashboardStats(): Promise<OpsDashboardStats> {
  await requireManage();
  const now = new Date();
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);

  const bookingSelect = {
    id: true,
    customerName: true,
    status: true,
    pickupAt: true,
    dropoffAt: true,
    vehicle: { select: { year: true, make: true, model: true } },
    fleetVehicle: { select: { fleetNumber: true, registrationNumber: true } },
  } as const;

  const [
    currentlyRented,
    dueToday,
    lateReturns,
    pendingAgreements,
    pendingPayments,
    completedRentals,
    leavingTodayRows,
    comingTodayRows,
  ] = await Promise.all([
    prisma.rentalBooking.count({ where: { status: "ACTIVE" } }),
    prisma.rentalBooking.count({
      where: {
        status: { in: ["READY_FOR_PICKUP", "ACTIVE", "WAITING_FOR_VEHICLE_ASSIGNMENT"] },
        dropoffAt: { gte: start, lte: end },
      },
    }),
    prisma.rentalBooking.count({
      where: {
        status: "ACTIVE",
        dropoffAt: { lt: now },
      },
    }),
    prisma.rentalBooking.count({
      where: { status: "WAITING_FOR_CUSTOMER_FORM" },
    }),
    prisma.rentalBooking.count({
      where: { status: "AWAITING_PAYMENT" },
    }),
    prisma.rentalBooking.count({
      where: { status: "COMPLETED" },
    }),
    // Cars leaving the yard today (pickups scheduled today)
    prisma.rentalBooking.findMany({
      where: {
        pickupAt: { gte: start, lte: end },
        status: {
          notIn: ["CANCELLED", "COMPLETED", "RETURNED", "AWAITING_PAYMENT"],
        },
      },
      orderBy: { pickupAt: "asc" },
      select: bookingSelect,
    }),
    // Cars coming back today (returns / dropoffs scheduled today)
    prisma.rentalBooking.findMany({
      where: {
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          { dropoffAt: { gte: start, lte: end } },
          { expectedReturnAt: { gte: start, lte: end } },
        ],
      },
      orderBy: { dropoffAt: "asc" },
      select: bookingSelect,
    }),
  ]);

  return {
    currentlyRented,
    dueToday,
    lateReturns,
    pendingAgreements,
    pendingPayments,
    completedRentals,
    leavingToday: leavingTodayRows.map(mapOpsBookingRow),
    comingToday: comingTodayRows.map(mapOpsBookingRow),
  };
}
