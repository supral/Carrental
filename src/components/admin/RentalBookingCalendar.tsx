"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  cancelAdminRentalBooking,
  getAdminBookingCalendar,
  updateAdminRentalBooking,
} from "@/lib/admin/rental-booking-actions";
import type { BookingCalendarEvent, BookingCalendarVehicle } from "@/lib/rentals/booking-calendar";
import { getRentalBookingDisplayStatus } from "@/lib/rentals/rental-booking-status";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-emerald-600 text-white",
  "bg-amber-500 text-white",
  "bg-violet-600 text-white",
  "bg-sky-600 text-white",
  "bg-rose-600 text-white",
];

type CalendarView = "month" | "week" | "list";

type Props = {
  initialVehicleId?: string | null;
  lockedVehicleId?: string | null;
  className?: string;
};

function countOverlappingBookings(date: Date, events: BookingCalendarEvent[]) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return events.filter((event) => {
    const pickup = parseISO(event.pickupAt);
    const dropoff = parseISO(event.dropoffAt);
    return pickup < dayEnd && dropoff > dayStart;
  }).length;
}

function isRangeAvailable(
  pickupKey: string,
  dropoffKey: string,
  events: BookingCalendarEvent[],
  totalUnits: number
) {
  const start = parseISO(pickupKey);
  const end = parseISO(dropoffKey);
  if (end < start) return false;
  return eachDayOfInterval({ start, end }).every(
    (day) => countOverlappingBookings(day, events) < totalUnits
  );
}

export default function RentalBookingCalendar({
  initialVehicleId = null,
  lockedVehicleId = null,
  className = "",
}: Props) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<CalendarView>("month");
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(
    lockedVehicleId ?? initialVehicleId
  );
  const [vehicles, setVehicles] = useState<BookingCalendarVehicle[]>([]);
  const [events, setEvents] = useState<BookingCalendarEvent[]>([]);
  const [selected, setSelected] = useState<BookingCalendarEvent | null>(null);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [dropoffDate, setDropoffDate] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadKey = `${anchor.getFullYear()}-${anchor.getMonth() + 1}-${vehicleFilter ?? "all"}-${refreshNonce}`;

  useEffect(() => {
    startTransition(async () => {
      try {
        setError("");
        const data = await getAdminBookingCalendar(
          anchor.getFullYear(),
          anchor.getMonth() + 1,
          vehicleFilter
        );
        setVehicles(data.vehicles);
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendar");
      }
    });
  }, [loadKey, vehicleFilter, anchor, refreshNonce]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const chunks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
    return chunks;
  }, [anchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [anchor]);

  const filteredEvents = useMemo(() => {
    if (!vehicleFilter) return events;
    return events.filter((event) => event.vehicleId === vehicleFilter);
  }, [events, vehicleFilter]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleFilter) ?? null,
    [vehicles, vehicleFilter]
  );
  const bookingEnabled = Boolean(vehicleFilter && selectedVehicle);

  const title =
    view === "week"
      ? `${format(weekDays[0], "d MMM")} – ${format(weekDays[6], "d MMM yyyy")}`
      : format(anchor, "MMMM yyyy");

  function clearDateSelection() {
    setPickupDate(null);
    setDropoffDate(null);
  }

  function setVehicleAndClearSelection(nextVehicleId: string | null) {
    setVehicleFilter(nextVehicleId);
    clearDateSelection();
  }

  function goToday() {
    const today = new Date();
    setAnchor(view === "week" ? startOfWeek(today, { weekStartsOn: 0 }) : startOfMonth(today));
  }

  function goPrev() {
    setAnchor((current) => (view === "week" ? subWeeks(current, 1) : subMonths(current, 1)));
  }

  function goNext() {
    setAnchor((current) => (view === "week" ? addWeeks(current, 1) : addMonths(current, 1)));
  }

  function openCreateBooking(nextPickup: string, nextDropoff: string) {
    if (!vehicleFilter) return;
    const params = new URLSearchParams({
      vehicleId: vehicleFilter,
      pickupDate: nextPickup,
      dropoffDate: nextDropoff,
    });
    router.push(`/admin/bookings/new?${params.toString()}`);
  }

  function handleDayClick(date: Date) {
    if (!vehicleFilter || !selectedVehicle) {
      toast({
        type: "error",
        message: "Select a vehicle first, then click available dates to book.",
      });
      return;
    }

    const today = startOfDay(new Date());
    const day = startOfDay(date);
    if (isBefore(day, today)) {
      toast({ type: "error", message: "Pickup cannot be in the past." });
      return;
    }

    const dateKey = format(day, "yyyy-MM-dd");
    const reserved = countOverlappingBookings(day, filteredEvents);
    if (reserved >= selectedVehicle.totalUnits) {
      toast({ type: "error", message: "This vehicle is fully booked on that date." });
      return;
    }

    if (pickupDate && dropoffDate) {
      setPickupDate(dateKey);
      setDropoffDate(null);
      return;
    }

    if (!pickupDate || dateKey < pickupDate) {
      setPickupDate(dateKey);
      setDropoffDate(null);
      return;
    }

    if (!isRangeAvailable(pickupDate, dateKey, filteredEvents, selectedVehicle.totalUnits)) {
      toast({
        type: "error",
        message: "Selected dates are not fully available for this vehicle.",
      });
      return;
    }

    setDropoffDate(dateKey);
    openCreateBooking(pickupDate, dateKey);
  }

  const selectionHint = !vehicleFilter
    ? "Select a vehicle, then click an available day for pickup and another for return."
    : !pickupDate
      ? "Click an available day to set pickup date."
      : !dropoffDate
        ? "Click an available day to set return date and open Create Booking."
        : "Click a day to start a new selection.";

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-foreground">Booking Calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rentals shown as bars across pickup and return dates.
          </p>
          <p className="mt-2 text-sm font-medium text-primary">{selectionHint}</p>
          {(pickupDate || dropoffDate) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {pickupDate && <span>Pickup: {format(parseISO(pickupDate), "dd MMM yyyy")}</span>}
              {dropoffDate && <span>Return: {format(parseISO(dropoffDate), "dd MMM yyyy")}</span>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={clearDateSelection}
              >
                Clear dates
              </Button>
            </div>
          )}
        </div>

        {!lockedVehicleId && (
          <div className="flex max-w-full flex-wrap gap-2">
            <FilterPill
              active={!vehicleFilter}
              label="All vehicles"
              onClick={() => setVehicleAndClearSelection(null)}
            />
            {vehicles.map((vehicle) => (
              <FilterPill
                key={vehicle.id}
                active={vehicleFilter === vehicle.id}
                label={vehicle.title}
                colorClass={EVENT_COLORS[vehicle.colorIndex % EVENT_COLORS.length]}
                onClick={() => setVehicleAndClearSelection(vehicle.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <p className="ml-2 text-sm font-semibold">{title}</p>
        </div>

        <div className="flex gap-2">
          {(["month", "week", "list"] as CalendarView[]).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={view === option ? "default" : "outline"}
              onClick={() => {
                setView(option);
                if (option === "week") {
                  setAnchor((current) => startOfWeek(current, { weekStartsOn: 0 }));
                } else {
                  setAnchor((current) => startOfMonth(current));
                }
              }}
              className="capitalize"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {pending && <p className="mt-3 text-sm text-muted-foreground">Loading calendar...</p>}

      {view === "month" && (
        <MonthGrid
          weeks={weeks}
          anchor={anchor}
          events={filteredEvents}
          onSelectEvent={setSelected}
          onSelectDay={handleDayClick}
          bookingEnabled={bookingEnabled}
          totalUnits={selectedVehicle?.totalUnits ?? 1}
          pickupDate={pickupDate}
          dropoffDate={dropoffDate}
        />
      )}
      {view === "week" && (
        <WeekGrid
          days={weekDays}
          events={filteredEvents}
          onSelectEvent={setSelected}
          onSelectDay={handleDayClick}
          bookingEnabled={bookingEnabled}
          totalUnits={selectedVehicle?.totalUnits ?? 1}
          pickupDate={pickupDate}
          dropoffDate={dropoffDate}
        />
      )}
      {view === "list" && (
        <ListView events={filteredEvents} onSelect={setSelected} />
      )}

      {selected && (
        <EditRentalModal
          event={selected}
          vehicles={vehicles}
          lockedVehicleId={lockedVehicleId}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setRefreshNonce((value) => value + 1);
            toast({ type: "success", message: "Rental updated" });
          }}
          onDeleted={() => {
            setSelected(null);
            setRefreshNonce((value) => value + 1);
            toast({ type: "success", message: "Rental cancelled" });
          }}
          onError={(message) => toast({ type: "error", message })}
        />
      )}
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
  colorClass,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? colorClass ?? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
    </button>
  );
}

function MonthGrid({
  weeks,
  anchor,
  events,
  onSelectEvent,
  onSelectDay,
  bookingEnabled,
  totalUnits,
  pickupDate,
  dropoffDate,
}: {
  weeks: Date[][];
  anchor: Date;
  events: BookingCalendarEvent[];
  onSelectEvent: (event: BookingCalendarEvent) => void;
  onSelectDay: (date: Date) => void;
  bookingEnabled: boolean;
  totalUnits: number;
  pickupDate: string | null;
  dropoffDate: string | null;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border">
        {weeks.map((week) => (
          <WeekRow
            key={week[0].toISOString()}
            days={week}
            anchor={anchor}
            events={events}
            onSelectEvent={onSelectEvent}
            onSelectDay={onSelectDay}
            bookingEnabled={bookingEnabled}
            totalUnits={totalUnits}
            pickupDate={pickupDate}
            dropoffDate={dropoffDate}
          />
        ))}
      </div>
    </div>
  );
}

function WeekRow({
  days,
  anchor,
  events,
  onSelectEvent,
  onSelectDay,
  bookingEnabled,
  totalUnits,
  pickupDate,
  dropoffDate,
  showOutOfMonth = true,
}: {
  days: Date[];
  anchor: Date;
  events: BookingCalendarEvent[];
  onSelectEvent: (event: BookingCalendarEvent) => void;
  onSelectDay: (date: Date) => void;
  bookingEnabled: boolean;
  totalUnits: number;
  pickupDate: string | null;
  dropoffDate: string | null;
  showOutOfMonth?: boolean;
}) {
  const weekStart = startOfDay(days[0]);
  const weekEnd = addDays(weekStart, 7);
  const today = startOfDay(new Date());

  const weekEvents = events
    .map((event) => {
      const pickup = startOfDay(parseISO(event.pickupAt));
      const dropoff = startOfDay(parseISO(event.dropoffAt));
      const eventEnd = dropoff < pickup ? pickup : dropoff;
      if (eventEnd < weekStart || pickup >= weekEnd) return null;

      const visibleStart = maxDate([pickup, weekStart]);
      const visibleEnd = minDate([eventEnd, addDays(weekEnd, -1)]);
      const startCol = Math.max(
        0,
        Math.round((visibleStart.getTime() - weekStart.getTime()) / 86400000)
      );
      const endCol = Math.max(
        startCol,
        Math.round((visibleEnd.getTime() - weekStart.getTime()) / 86400000)
      );
      const span = endCol - startCol + 1;
      return { event, startCol, span };
    })
    .filter(Boolean) as Array<{ event: BookingCalendarEvent; startCol: number; span: number }>;

  const lanes: Array<Array<{ event: BookingCalendarEvent; startCol: number; span: number }>> = [];
  for (const item of weekEvents.sort((a, b) => a.startCol - b.startCol || b.span - a.span)) {
    let placed = false;
    for (const lane of lanes) {
      const overlaps = lane.some(
        (other) =>
          item.startCol < other.startCol + other.span &&
          item.startCol + item.span > other.startCol
      );
      if (!overlaps) {
        lane.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([item]);
  }

  const laneHeight = 26;
  const eventsHeight = Math.max(lanes.length, 1) * laneHeight + 8;

  return (
    <div className="relative min-h-[7.5rem]">
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = !showOutOfMonth || isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());
          const dateKey = format(day, "yyyy-MM-dd");
          const reserved = countOverlappingBookings(day, events);
          const available = reserved < totalUnits;
          const isPast = isBefore(startOfDay(day), today);
          const isPickup = pickupDate === dateKey;
          const isDropoff = dropoffDate === dateKey;
          const inRange = Boolean(
            pickupDate && dropoffDate && dateKey >= pickupDate && dateKey <= dropoffDate
          );
          const clickable = bookingEnabled && inMonth && !isPast && available;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                if (!inMonth) return;
                onSelectDay(day);
              }}
              className={cn(
                "min-h-[7.5rem] border-r border-border p-2 text-left last:border-r-0 transition-colors",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-accent/40",
                clickable && "cursor-pointer hover:bg-primary/5",
                bookingEnabled && inMonth && (isPast || !available) && "cursor-not-allowed opacity-70",
                inRange && "bg-primary/10",
                (isPickup || isDropoff) && "ring-2 ring-inset ring-primary"
              )}
              title={
                !bookingEnabled
                  ? "Select a vehicle to book"
                  : isPast
                    ? "Past date"
                    : !available
                      ? "Fully booked"
                      : "Click to select for booking"
              }
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {bookingEnabled && inMonth && !isPast
                    ? available
                      ? `${totalUnits - reserved}/${totalUnits}`
                      : "Full"
                    : ""}
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute inset-x-1 top-10"
        style={{ height: eventsHeight }}
      >
        {lanes.map((lane, laneIndex) =>
          lane.map(({ event, startCol, span }) => (
            <button
              key={`${event.id}-${startCol}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(event);
              }}
              className={cn(
                "pointer-events-auto absolute truncate rounded-md px-2 text-left text-[11px] font-semibold shadow-sm hover:opacity-90",
                EVENT_COLORS[event.colorIndex % EVENT_COLORS.length]
              )}
              style={{
                top: laneIndex * laneHeight,
                left: `calc(${(startCol / 7) * 100}% + 2px)`,
                width: `calc(${(span / 7) * 100}% - 4px)`,
                height: 22,
                lineHeight: "22px",
              }}
              title={`${event.vehicleName} — ${event.customerName}`}
            >
              {event.vehicleName} — {event.customerName}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  events,
  onSelectEvent,
  onSelectDay,
  bookingEnabled,
  totalUnits,
  pickupDate,
  dropoffDate,
}: {
  days: Date[];
  events: BookingCalendarEvent[];
  onSelectEvent: (event: BookingCalendarEvent) => void;
  onSelectDay: (date: Date) => void;
  bookingEnabled: boolean;
  totalUnits: number;
  pickupDate: string | null;
  dropoffDate: string | null;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {days.map((day) => (
          <div key={day.toISOString()} className="px-2 py-2 text-center">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              {format(day, "EEE")}
            </p>
            <p className="text-sm font-bold">{format(day, "d MMM")}</p>
          </div>
        ))}
      </div>
      <WeekRow
        days={days}
        anchor={days[3] ?? days[0]}
        events={events}
        onSelectEvent={onSelectEvent}
        onSelectDay={onSelectDay}
        bookingEnabled={bookingEnabled}
        totalUnits={totalUnits}
        pickupDate={pickupDate}
        dropoffDate={dropoffDate}
        showOutOfMonth={false}
      />
    </div>
  );
}

function ListView({
  events,
  onSelect,
}: {
  events: BookingCalendarEvent[];
  onSelect: (event: BookingCalendarEvent) => void;
}) {
  const sorted = [...events].sort(
    (a, b) => parseISO(a.pickupAt).getTime() - parseISO(b.pickupAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No rentals in this period.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {sorted.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => onSelect(event)}
            className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-left hover:bg-muted/40"
          >
            <div>
              <p className="font-semibold">
                {event.vehicleName}
                {event.fleetNumber ? ` (${event.fleetNumber})` : ""} — {event.customerName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(parseISO(event.pickupAt), "dd MMM yyyy, HH:mm")} →{" "}
                {format(parseISO(event.dropoffAt), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {getRentalBookingDisplayStatus({
                status: event.status,
                pickupAt: event.pickupAt,
                dropoffAt: event.dropoffAt,
              })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EditRentalModal({
  event,
  vehicles,
  lockedVehicleId,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  event: BookingCalendarEvent;
  vehicles: BookingCalendarVehicle[];
  lockedVehicleId?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [vehicleId, setVehicleId] = useState(event.vehicleId);
  const [customerName, setCustomerName] = useState(event.customerName);
  const [pickupDate, setPickupDate] = useState(format(parseISO(event.pickupAt), "yyyy-MM-dd"));
  const [dropoffDate, setDropoffDate] = useState(format(parseISO(event.dropoffAt), "yyyy-MM-dd"));
  const [notes, setNotes] = useState(event.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-bold tracking-wide">Edit Rental</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {getRentalBookingDisplayStatus({
            status: event.status,
            pickupAt: event.pickupAt,
            dropoffAt: event.dropoffAt,
          })}
          {event.fleetNumber ? ` · ${event.fleetNumber}` : ""}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <Label>Vehicle</Label>
            <Select
              value={vehicleId}
              onValueChange={setVehicleId}
              disabled={Boolean(lockedVehicleId)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(lockedVehicleId
                  ? vehicles.filter((vehicle) => vehicle.id === lockedVehicleId)
                  : vehicles
                ).map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Renter name</Label>
            <Input
              className="mt-1.5"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pickup</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Return</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await cancelAdminRentalBooking(event.id);
                  onDeleted();
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not cancel rental");
                }
              });
            }}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await updateAdminRentalBooking({
                      id: event.id,
                      vehicleId,
                      customerName,
                      pickupDate,
                      dropoffDate,
                      pickupTime: format(parseISO(event.pickupAt), "HH:mm"),
                      dropoffTime: format(parseISO(event.dropoffAt), "HH:mm"),
                      notes,
                    });
                    onSaved();
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Could not save rental");
                  }
                });
              }}
            >
              {pending ? "Saving..." : "Save rental"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
