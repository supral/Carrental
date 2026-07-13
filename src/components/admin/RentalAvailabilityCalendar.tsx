"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminVehicleMonthAvailability } from "@/lib/admin/rental-booking-actions";
import type {
  CalendarBookingSummary,
  CalendarDayAvailability,
  DayAvailabilityStatus,
} from "@/lib/rentals/availability-calendar";
import { getRentalBookingDisplayStatus } from "@/lib/rentals/rental-booking-status";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES: Record<DayAvailabilityStatus, string> = {
  available: "bg-green-50 text-green-800 border-green-200 hover:bg-green-100",
  partial: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
  full: "bg-red-50 text-red-800 border-red-200",
  unavailable: "bg-gray-100 text-gray-400 border-gray-200",
};

interface RentalAvailabilityCalendarProps {
  vehicleId: string;
  className?: string;
  pickupDate?: string;
  dropoffDate?: string;
  selectionHint?: string;
  onSelectDate?: (date: string, day: CalendarDayAvailability) => void;
}

export default function RentalAvailabilityCalendar({
  vehicleId,
  className = "",
  pickupDate,
  dropoffDate,
  selectionHint,
  onSelectDate,
}: RentalAvailabilityCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<CalendarDayAvailability[]>([]);
  const [bookings, setBookings] = useState<CalendarBookingSummary[]>([]);
  const [totalUnits, setTotalUnits] = useState(1);
  const [listedFrom, setListedFrom] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!vehicleId) return;

    startTransition(async () => {
      try {
        setError("");
        const data = await getAdminVehicleMonthAvailability(
          vehicleId,
          viewMonth.getFullYear(),
          viewMonth.getMonth() + 1
        );
        if (!data) {
          setDays([]);
          setBookings([]);
          setError("Vehicle not found");
          return;
        }
        setDays(data.days);
        setBookings(data.bookings);
        setTotalUnits(data.totalUnits);
        setListedFrom(data.listedFrom);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendar");
      }
    });
  }, [vehicleId, viewMonth]);

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Availability calendar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            See booked and free days for this vehicle ({totalUnits} unit
            {totalUnits === 1 ? "" : "s"}).
            {listedFrom
              ? ` Listed from ${format(parseISO(listedFrom), "dd MMM yyyy")}.`
              : ""}
          </p>
          {onSelectDate && (
            <p className="mt-1 text-sm font-medium text-primary">
              {selectionHint ??
                (!pickupDate
                  ? "Click a day to set pickup date"
                  : !dropoffDate
                    ? "Click a day to set drop-off date"
                    : "Click a day to choose a new pickup date")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewMonth((current) => subMonths(current, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[9rem] text-center text-sm font-semibold">
            {format(viewMonth, "MMMM yyyy")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-green-200" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-200" /> Partially booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-200" /> Fully booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-gray-300" /> Unavailable
        </span>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {isPending && <p className="mt-3 text-sm text-muted-foreground">Loading calendar...</p>}

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const inMonth = isSameMonth(date, viewMonth);
          const day = dayMap.get(key);

          if (!inMonth) {
            return <div key={key} className="h-14 rounded-lg bg-transparent" />;
          }

          const status = day?.status ?? "available";
          const clickable =
            Boolean(onSelectDate) && status !== "full" && status !== "unavailable";
          const isPickup = pickupDate === key;
          const isDropoff = dropoffDate === key;
          const inRange =
            Boolean(pickupDate && dropoffDate && key >= pickupDate && key <= dropoffDate);

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => day && onSelectDate?.(key, day)}
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                STATUS_STYLES[status],
                inRange && status !== "unavailable" && "ring-2 ring-primary/30",
                (isPickup || isDropoff) && "ring-2 ring-primary",
                !clickable && "cursor-default"
              )}
              title={
                day?.reason
                  ? day.reason
                  : day
                    ? `${day.availableUnits} of ${day.totalUnits} available`
                    : undefined
              }
            >
              <span className="font-semibold">{date.getDate()}</span>
              {day && day.reservedUnits > 0 && (
                <span className="text-[10px] font-medium opacity-80">
                  {day.reservedUnits}/{day.totalUnits}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {bookings.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground">Bookings this month</h4>
          <ul className="mt-3 space-y-2">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{booking.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(booking.pickupAt), "dd MMM yyyy, HH:mm")} →{" "}
                  {format(parseISO(booking.dropoffAt), "dd MMM yyyy, HH:mm")} ·{" "}
                  {getRentalBookingDisplayStatus({
                    status: booking.status,
                    pickupAt: booking.pickupAt,
                    dropoffAt: booking.dropoffAt,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
