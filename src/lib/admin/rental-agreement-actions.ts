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
import { FleetVehicleStatus, RentalBookingStatus } from "@prisma/client";

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

export async function completeAgreementInOfficeAction(
  bookingId: string,
  raw: {
    drivingLicenceNumber: string;
    licencePhotoUrl: string;
    licenceExpiry?: string;
    signatureText: string;
  }
) {
  await requireManage();
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerAddress: true,
      customerDob: true,
      customerFormCompletedAt: true,
    },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.customerFormCompletedAt) {
    throw new Error("Agreement is already completed");
  }
  if (!booking.customerName || !booking.customerEmail || !booking.customerPhone) {
    throw new Error("Customer contact details are missing on this booking");
  }
  if (!booking.customerDob) {
    throw new Error("Customer date of birth is missing on this booking");
  }

  const licence = raw.drivingLicenceNumber?.trim();
  const photo = raw.licencePhotoUrl?.trim();
  const signature = raw.signatureText?.trim();
  if (!licence || !photo || !signature) {
    throw new Error("Licence number, licence image, and typed signature are required");
  }

  const { applyAdminAssistedAgreement } = await import(
    "@/lib/rentals/rental-agreement-service"
  );
  await applyAdminAssistedAgreement(bookingId, {
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress || "",
    customerDob: booking.customerDob,
    drivingLicenceNumber: licence,
    licencePhotoUrl: photo,
    licenceExpiry: raw.licenceExpiry?.trim() || null,
    signatureText: signature,
    terms: {
      rentalTerms: true,
      insuranceExcess: true,
      fuelPolicy: true,
      extraKilometres: true,
      lateReturnCharges: true,
      damagePolicy: true,
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
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
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  pickupAt: string;
  dropoffAt: string;
  vehicleLabel: string;
  fleetLabel: string | null;
  movement: "pickup" | "return";
};

export type OpsMovementPeriodCounts = {
  leaving: number;
  coming: number;
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
  /** Unique customers with a pickup or return scheduled today */
  customersToday: OpsDashboardBookingRow[];
  movements: {
    today: OpsMovementPeriodCounts;
    week: OpsMovementPeriodCounts;
    month: OpsMovementPeriodCounts;
  };
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

function mapOpsBookingRow(
  booking: {
    id: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    status: string;
    pickupAt: Date;
    dropoffAt: Date;
    vehicle: { year: number; make: string; model: string };
    fleetVehicle: { fleetNumber: string; registrationNumber: string | null } | null;
  },
  movement: "pickup" | "return"
): OpsDashboardBookingRow {
  return {
    id: booking.id,
    customerName: booking.customerName || "Guest",
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
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
    movement,
  };
}

export async function getOpsDashboardStats(): Promise<OpsDashboardStats> {
  await requireManage();
  const now = new Date();
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);
  const weekStart = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  );
  const weekEnd = endOfLocalDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
  const monthStart = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const bookingSelect = {
    id: true,
    customerName: true,
    customerEmail: true,
    customerPhone: true,
    status: true,
    pickupAt: true,
    dropoffAt: true,
    expectedReturnAt: true,
    vehicle: { select: { year: true, make: true, model: true } },
    fleetVehicle: { select: { fleetNumber: true, registrationNumber: true } },
  } as const;

  const leavingStatusFilter = {
    notIn: [
      RentalBookingStatus.CANCELLED,
      RentalBookingStatus.COMPLETED,
      RentalBookingStatus.RETURNED,
      RentalBookingStatus.AWAITING_PAYMENT,
    ],
  };
  const comingStatusFilter = {
    notIn: [RentalBookingStatus.CANCELLED, RentalBookingStatus.COMPLETED],
  };

  const leavingWhere = (from: Date, to: Date) => ({
    pickupAt: { gte: from, lte: to },
    status: leavingStatusFilter,
  });
  const comingWhere = (from: Date, to: Date) => ({
    status: comingStatusFilter,
    OR: [
      { dropoffAt: { gte: from, lte: to } },
      { expectedReturnAt: { gte: from, lte: to } },
    ],
  });

  const dateInRange = (value: Date | null | undefined, from: Date, to: Date) => {
    if (!value) return false;
    const t = value.getTime();
    return t >= from.getTime() && t <= to.getTime();
  };

  const [statusGroups, dueToday, lateReturns, leavingMonthRows, comingMonthRows] =
    await Promise.all([
      prisma.rentalBooking.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
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
      prisma.rentalBooking.findMany({
        where: leavingWhere(monthStart, monthEnd),
        orderBy: { pickupAt: "asc" },
        select: bookingSelect,
      }),
      prisma.rentalBooking.findMany({
        where: comingWhere(monthStart, monthEnd),
        orderBy: { dropoffAt: "asc" },
        select: bookingSelect,
      }),
    ]);

  const countByStatus = Object.fromEntries(
    statusGroups.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const filterLeaving = (from: Date, to: Date) =>
    leavingMonthRows.filter((row) => dateInRange(row.pickupAt, from, to));
  const filterComing = (from: Date, to: Date) =>
    comingMonthRows.filter(
      (row) =>
        dateInRange(row.dropoffAt, from, to) || dateInRange(row.expectedReturnAt, from, to)
    );

  const leavingTodayRows = filterLeaving(start, end);
  const comingTodayRows = filterComing(start, end);
  const leavingToday = leavingTodayRows.map((row) => mapOpsBookingRow(row, "pickup"));
  const comingToday = comingTodayRows.map((row) => mapOpsBookingRow(row, "return"));

  const customersByKey = new Map<string, OpsDashboardBookingRow>();
  for (const row of [...leavingToday, ...comingToday]) {
    const key = `${row.customerEmail || row.customerPhone || row.customerName}|${row.id}`;
    customersByKey.set(key, row);
  }

  return {
    currentlyRented: countByStatus.ACTIVE ?? 0,
    dueToday,
    lateReturns,
    pendingAgreements: countByStatus.WAITING_FOR_CUSTOMER_FORM ?? 0,
    pendingPayments: countByStatus.AWAITING_PAYMENT ?? 0,
    completedRentals: countByStatus.COMPLETED ?? 0,
    leavingToday,
    comingToday,
    customersToday: Array.from(customersByKey.values()).sort((a, b) => {
      const aTime = a.movement === "pickup" ? a.pickupAt : a.dropoffAt;
      const bTime = b.movement === "pickup" ? b.pickupAt : b.dropoffAt;
      return aTime.localeCompare(bTime);
    }),
    movements: {
      today: { leaving: leavingToday.length, coming: comingToday.length },
      week: {
        leaving: filterLeaving(weekStart, weekEnd).length,
        coming: filterComing(weekStart, weekEnd).length,
      },
      month: { leaving: leavingMonthRows.length, coming: comingMonthRows.length },
    },
  };
}
