import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  blockingRentalBookingFilter,
  computeDateRangeAvailability,
  getPeakConcurrentReservations,
} from "@/lib/rentals/fleet-inventory";

export type DayAvailabilityStatus = "available" | "partial" | "full" | "unavailable";

export interface CalendarDayAvailability {
  date: string;
  day: number;
  status: DayAvailabilityStatus;
  reservedUnits: number;
  availableUnits: number;
  totalUnits: number;
  reason?: string;
}

export interface CalendarBookingSummary {
  id: string;
  customerName: string;
  pickupAt: string;
  dropoffAt: string;
  status: string;
}

export interface VehicleMonthAvailability {
  vehicleId: string;
  year: number;
  month: number;
  totalUnits: number;
  listedFrom: string | null;
  listedTo: string | null;
  days: CalendarDayAvailability[];
  bookings: CalendarBookingSummary[];
}

function dayStatus(
  reservedUnits: number,
  availableUnits: number
): Exclude<DayAvailabilityStatus, "unavailable"> {
  if (availableUnits <= 0) return "full";
  if (reservedUnits > 0) return "partial";
  return "available";
}

export async function getVehicleMonthAvailability(
  vehicleId: string,
  year: number,
  month: number
): Promise<VehicleMonthAvailability | null> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      totalUnits: true,
      rentalAvailableFrom: true,
      rentalAvailableTo: true,
    },
  });

  if (!vehicle) return null;

  const fleetBookable = await prisma.fleetVehicle.count({
    where: {
      vehicleId,
      status: { in: ["AVAILABLE", "RENTED", "RESERVED"] },
    },
  });
  const totalUnits =
    fleetBookable > 0 ? fleetBookable : Math.max(1, vehicle.totalUnits ?? 1);
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const rangeEnd = addDays(endOfDay(monthEnd), 1);
  const todayStart = startOfDay(new Date());
  const listedFrom = vehicle.rentalAvailableFrom
    ? startOfDay(vehicle.rentalAvailableFrom)
    : null;
  const listedTo = vehicle.rentalAvailableTo
    ? endOfDay(vehicle.rentalAvailableTo)
    : null;

  const bookings = await prisma.rentalBooking.findMany({
    where: {
      vehicleId,
      ...blockingRentalBookingFilter(),
      pickupAt: { lt: rangeEnd },
      dropoffAt: { gt: monthStart },
    },
    select: {
      id: true,
      customerName: true,
      pickupAt: true,
      dropoffAt: true,
      status: true,
    },
    orderBy: { pickupAt: "asc" },
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    const dateKey = format(date, "yyyy-MM-dd");

    if (dayStart < todayStart) {
      return {
        date: dateKey,
        day: date.getDate(),
        status: "unavailable" as const,
        reservedUnits: 0,
        availableUnits: 0,
        totalUnits,
        reason: "Past date",
      };
    }

    if (listedFrom && dayStart < listedFrom) {
      return {
        date: dateKey,
        day: date.getDate(),
        status: "unavailable" as const,
        reservedUnits: 0,
        availableUnits: 0,
        totalUnits,
        reason: `Not listed until ${format(listedFrom, "dd MMM yyyy")}`,
      };
    }

    if (listedTo && dayStart > listedTo) {
      return {
        date: dateKey,
        day: date.getDate(),
        status: "unavailable" as const,
        reservedUnits: 0,
        availableUnits: 0,
        totalUnits,
        reason: `Listing ended ${format(listedTo, "dd MMM yyyy")}`,
      };
    }

    const dayBookings = bookings.filter(
      (booking) => booking.pickupAt < dayEnd && booking.dropoffAt > dayStart
    );
    const peakReserved = getPeakConcurrentReservations(dayBookings);
    const availability = computeDateRangeAvailability(totalUnits, peakReserved);

    return {
      date: dateKey,
      day: date.getDate(),
      status: dayStatus(availability.reservedUnits, availability.availableUnits),
      reservedUnits: availability.reservedUnits,
      availableUnits: availability.availableUnits,
      totalUnits: availability.totalUnits,
    };
  });

  return {
    vehicleId,
    year,
    month,
    totalUnits,
    listedFrom: listedFrom ? listedFrom.toISOString() : null,
    listedTo: listedTo ? listedTo.toISOString() : null,
    days,
    bookings: bookings.map((booking) => ({
      id: booking.id,
      customerName: booking.customerName ?? "Customer",
      pickupAt: booking.pickupAt.toISOString(),
      dropoffAt: booking.dropoffAt.toISOString(),
      status: booking.status,
    })),
  };
}
