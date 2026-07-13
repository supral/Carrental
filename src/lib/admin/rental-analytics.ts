"use server";

import {
  FleetVehicleStatus,
  Prisma,
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVehicleName } from "@/lib/vehicles/display";
import { differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

export type AnalyticsViewBy = "category" | "type" | "fleet";
export type AnalyticsGroupBy = AnalyticsViewBy | "dealer" | "customer";

export type RentalAnalyticsFilters = {
  from?: string | null;
  to?: string | null;
  bookingStatus?: RentalBookingStatus | "ALL" | null;
  paymentStatus?: RentalPaymentStatus | "ALL" | null;
  category?: string | null;
  vehicleId?: string | null;
  fleetVehicleId?: string | null;
  dealerId?: string | null;
  customerEmail?: string | null;
};

export type RentalMetricSummary = {
  totalRevenueCents: number;
  totalBookings: number;
  activeRentals: number;
  completedRentals: number;
  cancelledRentals: number;
  availableUnits: number;
  totalUnits: number;
  utilizationRate: number;
  averageRentalDays: number;
  averageRevenuePerBookingCents: number;
};

export type RentalBreakdownRow = {
  key: string;
  label: string;
  revenueCents: number;
  bookings: number;
  rentalDays: number;
  cancelled: number;
  units?: number;
  status?: string;
  occupancyRate: number;
  cancellationRate: number;
  averageBookingValueCents: number;
  averageDailyRevenueCents: number;
};

function parseRange(filters: RentalAnalyticsFilters) {
  const from = filters.from ? startOfDay(new Date(filters.from)) : null;
  const to = filters.to ? endOfDay(new Date(filters.to)) : null;
  if (from && Number.isNaN(from.getTime())) throw new Error("Invalid from date");
  if (to && Number.isNaN(to.getTime())) throw new Error("Invalid to date");
  return { from, to };
}

function bookingWhereSql(filters: RentalAnalyticsFilters) {
  const { from, to } = parseRange(filters);
  const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];

  if (from) clauses.push(Prisma.sql`b."pickupAt" >= ${from}`);
  if (to) clauses.push(Prisma.sql`b."pickupAt" <= ${to}`);

  if (filters.bookingStatus && filters.bookingStatus !== "ALL") {
    clauses.push(Prisma.sql`b.status::text = ${filters.bookingStatus}`);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "ALL") {
    clauses.push(Prisma.sql`b."paymentStatus"::text = ${filters.paymentStatus}`);
  }
  if (filters.vehicleId) {
    clauses.push(Prisma.sql`b."vehicleId" = ${filters.vehicleId}`);
  }
  if (filters.fleetVehicleId) {
    clauses.push(Prisma.sql`b."fleetVehicleId" = ${filters.fleetVehicleId}`);
  }
  if (filters.customerEmail?.trim()) {
    clauses.push(
      Prisma.sql`LOWER(b."customerEmail") = ${filters.customerEmail.trim().toLowerCase()}`
    );
  }
  if (filters.category?.trim()) {
    clauses.push(Prisma.sql`v."bodyType" = ${filters.category.trim()}`);
  }
  if (filters.dealerId) {
    clauses.push(Prisma.sql`v."dealerId" = ${filters.dealerId}`);
  }

  return Prisma.join(clauses, " AND ");
}

function needsVehicleJoin(filters: RentalAnalyticsFilters, groupBy?: AnalyticsGroupBy) {
  return Boolean(
    filters.category ||
      filters.dealerId ||
      groupBy === "category" ||
      groupBy === "type" ||
      groupBy === "dealer"
  );
}

function periodDays(filters: RentalAnalyticsFilters) {
  const { from, to } = parseRange(filters);
  if (from && to) return Math.max(1, differenceInCalendarDays(to, from) + 1);
  return 30;
}

export async function getRentalMetricSummary(
  filters: RentalAnalyticsFilters = {}
): Promise<RentalMetricSummary> {
  const where = bookingWhereSql(filters);
  const joinVehicle = needsVehicleJoin(filters) ? Prisma.sql`JOIN "Vehicle" v ON v.id = b."vehicleId"` : Prisma.sql``;

  const [metrics] = await prisma.$queryRaw<
    Array<{
      total_revenue_cents: bigint | number;
      total_bookings: bigint | number;
      active_rentals: bigint | number;
      completed_rentals: bigint | number;
      cancelled_rentals: bigint | number;
      total_rental_days: bigint | number;
      paid_bookings: bigint | number;
    }>
  >`
    SELECT
      COALESCE(SUM(CASE
        WHEN b.status <> 'CANCELLED'::"RentalBookingStatus"
          AND (b."paymentStatus" = 'PAID'::"RentalPaymentStatus" OR b.status IN (
            'CONFIRMED'::"RentalBookingStatus",
            'ACTIVE'::"RentalBookingStatus",
            'COMPLETED'::"RentalBookingStatus"
          ))
        THEN b."totalAmountCents" ELSE 0 END), 0) AS total_revenue_cents,
      COUNT(*)::int AS total_bookings,
      COUNT(*) FILTER (
        WHERE b.status <> 'CANCELLED'::"RentalBookingStatus"
          AND b."pickupAt" <= NOW()
          AND b."dropoffAt" > NOW()
      )::int AS active_rentals,
      COUNT(*) FILTER (
        WHERE b.status = 'COMPLETED'::"RentalBookingStatus"
          OR (b.status <> 'CANCELLED'::"RentalBookingStatus" AND b."dropoffAt" <= NOW())
      )::int AS completed_rentals,
      COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled_rentals,
      COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS total_rental_days,
      COUNT(*) FILTER (
        WHERE b.status <> 'CANCELLED'::"RentalBookingStatus"
          AND (b."paymentStatus" = 'PAID'::"RentalPaymentStatus" OR b.status IN (
            'CONFIRMED'::"RentalBookingStatus",
            'ACTIVE'::"RentalBookingStatus",
            'COMPLETED'::"RentalBookingStatus"
          ))
      )::int AS paid_bookings
    FROM "RentalBooking" b
    ${joinVehicle}
    WHERE ${where}
  `;

  const [unitStats] = await prisma.$queryRaw<
    Array<{ available_units: bigint | number; total_units: bigint | number }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE fv.status = 'AVAILABLE'::"FleetVehicleStatus")::int AS available_units,
      COUNT(*) FILTER (
        WHERE fv.status IN (
          'AVAILABLE'::"FleetVehicleStatus",
          'RENTED'::"FleetVehicleStatus",
          'RESERVED'::"FleetVehicleStatus"
        )
      )::int AS total_units
    FROM "FleetVehicle" fv
    JOIN "Vehicle" v ON v.id = fv."vehicleId"
    WHERE TRUE
      ${filters.vehicleId ? Prisma.sql`AND fv."vehicleId" = ${filters.vehicleId}` : Prisma.sql``}
      ${filters.fleetVehicleId ? Prisma.sql`AND fv.id = ${filters.fleetVehicleId}` : Prisma.sql``}
      ${filters.category?.trim() ? Prisma.sql`AND v."bodyType" = ${filters.category.trim()}` : Prisma.sql``}
      ${filters.dealerId ? Prisma.sql`AND v."dealerId" = ${filters.dealerId}` : Prisma.sql``}
  `;

  const totalRevenueCents = Number(metrics?.total_revenue_cents ?? 0);
  const totalBookings = Number(metrics?.total_bookings ?? 0);
  const paidBookings = Number(metrics?.paid_bookings ?? 0);
  const totalRentalDays = Number(metrics?.total_rental_days ?? 0);
  const availableUnits = Number(unitStats?.available_units ?? 0);
  const totalUnits = Number(unitStats?.total_units ?? 0);
  const capacityDays = Math.max(1, totalUnits) * periodDays(filters);
  const utilizationRate = Math.min(100, Math.round((totalRentalDays / capacityDays) * 1000) / 10);

  return {
    totalRevenueCents,
    totalBookings,
    activeRentals: Number(metrics?.active_rentals ?? 0),
    completedRentals: Number(metrics?.completed_rentals ?? 0),
    cancelledRentals: Number(metrics?.cancelled_rentals ?? 0),
    availableUnits,
    totalUnits,
    utilizationRate,
    averageRentalDays:
      paidBookings > 0 ? Math.round((totalRentalDays / paidBookings) * 10) / 10 : 0,
    averageRevenuePerBookingCents:
      paidBookings > 0 ? Math.round(totalRevenueCents / paidBookings) : 0,
  };
}

type RawGroupRow = {
  key: string;
  label: string;
  revenue_cents: bigint | number;
  bookings: bigint | number;
  rental_days: bigint | number;
  cancelled: bigint | number;
  units: bigint | number | null;
  status: string | null;
};

function mapBreakdownRows(rows: RawGroupRow[], period: number): RentalBreakdownRow[] {
  return rows.map((row) => {
    const revenueCents = Number(row.revenue_cents ?? 0);
    const bookings = Number(row.bookings ?? 0);
    const rentalDays = Number(row.rental_days ?? 0);
    const cancelled = Number(row.cancelled ?? 0);
    const units = row.units == null ? undefined : Number(row.units);
    const capacity = Math.max(1, units ?? 1) * period;
    const occupancyRate = Math.min(100, Math.round((rentalDays / capacity) * 1000) / 10);
    const cancellationRate =
      bookings > 0 ? Math.round((cancelled / bookings) * 1000) / 10 : 0;

    return {
      key: row.key,
      label: row.label,
      revenueCents,
      bookings,
      rentalDays,
      cancelled,
      units,
      status: row.status ?? undefined,
      occupancyRate,
      cancellationRate,
      averageBookingValueCents:
      bookings - cancelled > 0 ? Math.round(revenueCents / (bookings - cancelled)) : 0,
      averageDailyRevenueCents: rentalDays > 0 ? Math.round(revenueCents / rentalDays) : 0,
    };
  });
}

export async function getRentalBreakdown(
  groupBy: AnalyticsGroupBy,
  filters: RentalAnalyticsFilters = {}
): Promise<RentalBreakdownRow[]> {
  const where = bookingWhereSql(filters);
  const period = periodDays(filters);

  if (groupBy === "category") {
    const rows = await prisma.$queryRaw<RawGroupRow[]>`
      WITH units_by_category AS (
        SELECT
          COALESCE(NULLIF(vv."bodyType", ''), 'Uncategorized') AS category,
          COUNT(*)::int AS units
        FROM "FleetVehicle" fv
        JOIN "Vehicle" vv ON vv.id = fv."vehicleId"
        WHERE fv.status IN (
          'AVAILABLE'::"FleetVehicleStatus",
          'RENTED'::"FleetVehicleStatus",
          'RESERVED'::"FleetVehicleStatus"
        )
        GROUP BY COALESCE(NULLIF(vv."bodyType", ''), 'Uncategorized')
      )
      SELECT
        COALESCE(NULLIF(v."bodyType", ''), 'Uncategorized') AS key,
        COALESCE(NULLIF(v."bodyType", ''), 'Uncategorized') AS label,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS rental_days,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled,
        COALESCE(MAX(u.units), 0)::int AS units,
        NULL AS status
      FROM "RentalBooking" b
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      LEFT JOIN units_by_category u
        ON u.category = COALESCE(NULLIF(v."bodyType", ''), 'Uncategorized')
      WHERE ${where}
      GROUP BY COALESCE(NULLIF(v."bodyType", ''), 'Uncategorized')
      ORDER BY revenue_cents DESC, label ASC
    `;
    return mapBreakdownRows(rows, period);
  }

  if (groupBy === "type") {
    const rows = await prisma.$queryRaw<RawGroupRow[]>`
      WITH units_by_type AS (
        SELECT
          fv."vehicleId",
          COUNT(*)::int AS units
        FROM "FleetVehicle" fv
        WHERE fv.status IN (
          'AVAILABLE'::"FleetVehicleStatus",
          'RENTED'::"FleetVehicleStatus",
          'RESERVED'::"FleetVehicleStatus"
        )
        GROUP BY fv."vehicleId"
      )
      SELECT
        v.id AS key,
        COALESCE(NULLIF(v.title, ''), CONCAT(v.make, ' ', v.model)) AS label,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS rental_days,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled,
        COALESCE(MAX(u.units), 0)::int AS units,
        NULL AS status
      FROM "RentalBooking" b
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      LEFT JOIN units_by_type u ON u."vehicleId" = v.id
      WHERE ${where}
      GROUP BY v.id, v.title, v.make, v.model
      ORDER BY revenue_cents DESC, label ASC
    `;
    return mapBreakdownRows(rows, period);
  }

  if (groupBy === "fleet") {
    const rows = await prisma.$queryRaw<RawGroupRow[]>`
      SELECT
        COALESCE(fv.id, 'unassigned') AS key,
        COALESCE(fv."fleetNumber", 'Unassigned') AS label,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS rental_days,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled,
        1 AS units,
        COALESCE(fv.status::text, NULL) AS status
      FROM "RentalBooking" b
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      LEFT JOIN "FleetVehicle" fv ON fv.id = b."fleetVehicleId"
      WHERE ${where}
      GROUP BY fv.id, fv."fleetNumber", fv.status
      ORDER BY revenue_cents DESC, label ASC
    `;
    return mapBreakdownRows(rows, period);
  }

  if (groupBy === "dealer") {
    const rows = await prisma.$queryRaw<RawGroupRow[]>`
      SELECT
        d.id AS key,
        d.name AS label,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS rental_days,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled,
        NULL AS units,
        NULL AS status
      FROM "RentalBooking" b
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      JOIN "Dealer" d ON d.id = v."dealerId"
      WHERE ${where}
      GROUP BY d.id, d.name
      ORDER BY revenue_cents DESC, label ASC
    `;
    return mapBreakdownRows(rows, period);
  }

  const rows = await prisma.$queryRaw<RawGroupRow[]>`
    SELECT
      CONCAT(
        COALESCE(LOWER(TRIM(b."customerEmail")), ''),
        '|',
        COALESCE(REGEXP_REPLACE(COALESCE(b."customerPhone", ''), '[^0-9+]', '', 'g'), '')
      ) AS key,
      COALESCE(
        (
          ARRAY_AGG(NULLIF(TRIM(b."customerName"), '') ORDER BY b."createdAt" DESC)
          FILTER (WHERE NULLIF(TRIM(b."customerName"), '') IS NOT NULL)
        )[1],
        MAX(b."customerEmail"),
        'Unknown customer'
      ) AS label,
      COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
      COUNT(*)::int AS bookings,
      COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."rentalDays" ELSE 0 END), 0)::int AS rental_days,
      COUNT(*) FILTER (WHERE b.status = 'CANCELLED'::"RentalBookingStatus")::int AS cancelled,
      NULL AS units,
      NULL AS status
    FROM "RentalBooking" b
    JOIN "Vehicle" v ON v.id = b."vehicleId"
    WHERE ${where}
    GROUP BY
      LOWER(TRIM(b."customerEmail")),
      REGEXP_REPLACE(COALESCE(b."customerPhone", ''), '[^0-9+]', '', 'g')
    ORDER BY revenue_cents DESC, label ASC
  `;
  return mapBreakdownRows(rows, period);
}

export async function getRentalDashboardAnalytics(
  viewBy: AnalyticsViewBy = "category",
  filters: RentalAnalyticsFilters = {}
) {
  const [metrics, breakdown, monthly] = await Promise.all([
    getRentalMetricSummary(filters),
    getRentalBreakdown(viewBy, filters),
    getMonthlyRentalSeries(filters),
  ]);

  return {
    viewBy,
    metrics,
    breakdown,
    charts: {
      revenue: breakdown.map((row) => ({ name: row.label, value: row.revenueCents / 100 })),
      bookings: breakdown.map((row) => ({ name: row.label, value: row.bookings })),
      rentalDays: breakdown.map((row) => ({ name: row.label, value: row.rentalDays })),
      utilization: breakdown.map((row) => ({ name: row.label, value: row.occupancyRate })),
      averageDailyRevenue: breakdown.map((row) => ({
        name: row.label,
        value: row.averageDailyRevenueCents / 100,
      })),
      monthly,
    },
  };
}

async function getMonthlyRentalSeries(filters: RentalAnalyticsFilters) {
  const where = bookingWhereSql(filters);
  const joinVehicle = needsVehicleJoin(filters)
    ? Prisma.sql`JOIN "Vehicle" v ON v.id = b."vehicleId"`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<
    Array<{ month: Date; revenue_cents: bigint | number; bookings: bigint | number }>
  >`
    SELECT
      date_trunc('month', b."pickupAt") AS month,
      COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED'::"RentalBookingStatus" THEN b."totalAmountCents" ELSE 0 END), 0) AS revenue_cents,
      COUNT(*)::int AS bookings
    FROM "RentalBooking" b
    ${joinVehicle}
    WHERE ${where}
      AND b."pickupAt" >= date_trunc('month', NOW() - INTERVAL '5 months')
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((row) => ({
    month: new Date(row.month).toLocaleString("en-AU", { month: "short" }),
    revenue: Number(row.revenue_cents) / 100,
    bookings: Number(row.bookings),
  }));
}

export async function getRentalAnalyticsFilterOptions() {
  const [categories, vehicles, fleet, dealers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { listingPurpose: "RENTAL" },
      distinct: ["bodyType"],
      select: { bodyType: true },
      orderBy: { bodyType: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { listingPurpose: "RENTAL" },
      select: { id: true, title: true, make: true, model: true, year: true, vehicleNumber: true },
      orderBy: [{ make: "asc" }, { model: "asc" }],
    }),
    prisma.fleetVehicle.findMany({
      select: { id: true, fleetNumber: true, status: true },
      orderBy: { fleetNumber: "asc" },
    }),
    prisma.dealer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    categories: categories.map((row) => row.bodyType).filter(Boolean),
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: formatVehicleName(vehicle),
    })),
    fleet: fleet.map((unit) => ({
      id: unit.id,
      label: unit.fleetNumber,
      status: unit.status as FleetVehicleStatus,
    })),
    dealers,
  };
}
