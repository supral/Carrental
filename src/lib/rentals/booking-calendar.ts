import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ListingPurpose, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { blockingRentalBookingFilter } from "@/lib/rentals/fleet-inventory";
import { formatVehicleName } from "@/lib/vehicles/display";

export type BookingCalendarEvent = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  fleetNumber: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  pickupAt: string;
  dropoffAt: string;
  status: string;
  colorIndex: number;
};

export type BookingCalendarVehicle = {
  id: string;
  title: string;
  colorIndex: number;
};

const COLOR_COUNT = 6;

function colorIndexForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % COLOR_COUNT;
}

export async function getBookingCalendarVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      listingPurpose: ListingPurpose.RENTAL,
      status: { in: [VehicleStatus.ACTIVE, VehicleStatus.PENDING] },
    },
    select: {
      id: true,
      title: true,
      make: true,
      model: true,
      year: true,
      vehicleNumber: true,
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: formatVehicleName(vehicle),
    colorIndex: colorIndexForId(vehicle.id),
  }));
}

export async function getBookingCalendarEvents(input: {
  year: number;
  month: number;
  vehicleId?: string | null;
}): Promise<{ vehicles: BookingCalendarVehicle[]; events: BookingCalendarEvent[] }> {
  const monthStart = startOfMonth(new Date(input.year, input.month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  // Pad with surrounding weeks so month view bars render on edges.
  const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const rangeEnd = addDays(endOfDay(endOfWeek(monthEnd, { weekStartsOn: 0 })), 1);

  const [vehicles, bookings] = await Promise.all([
    getBookingCalendarVehicles(),
    prisma.rentalBooking.findMany({
      where: {
        ...(input.vehicleId ? { vehicleId: input.vehicleId } : {}),
        ...blockingRentalBookingFilter(),
        pickupAt: { lt: rangeEnd },
        dropoffAt: { gt: rangeStart },
      },
      select: {
        id: true,
        vehicleId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        notes: true,
        pickupAt: true,
        dropoffAt: true,
        status: true,
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
          },
        },
        fleetVehicle: {
          select: { fleetNumber: true },
        },
      },
      orderBy: { pickupAt: "asc" },
    }),
  ]);

  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const events: BookingCalendarEvent[] = bookings.map((booking) => {
    const vehicleMeta = vehicleMap.get(booking.vehicleId);
    const vehicleName =
      vehicleMeta?.title ?? formatVehicleName(booking.vehicle);
    const colorIndex = vehicleMeta?.colorIndex ?? colorIndexForId(booking.vehicleId);

    return {
      id: booking.id,
      vehicleId: booking.vehicleId,
      vehicleName,
      fleetNumber: booking.fleetVehicle?.fleetNumber ?? booking.vehicle.vehicleNumber ?? null,
      customerName: booking.customerName ?? "Customer",
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      notes: booking.notes,
      pickupAt: booking.pickupAt.toISOString(),
      dropoffAt: booking.dropoffAt.toISOString(),
      status: booking.status,
      colorIndex,
    };
  });

  return {
    vehicles,
    events: input.vehicleId
      ? events.filter((event) => event.vehicleId === input.vehicleId)
      : events,
  };
}

export function getAdjacentMonth(year: number, month: number, delta: number) {
  const next = addMonths(new Date(year, month - 1, 1), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export function getPreviousMonth(year: number, month: number) {
  return getAdjacentMonth(year, month, -1);
}

export function getNextMonth(year: number, month: number) {
  return getAdjacentMonth(year, month, 1);
}

export { startOfDay, COLOR_COUNT };
