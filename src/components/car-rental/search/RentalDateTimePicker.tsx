"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatRentalDateLabel,
  formatTimeLabel,
  getAvailableTimeSlots,
  getDefaultTimeSlot,
} from "@/lib/rentals/datetime-picker";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

interface RentalDateTimePickerProps {
  label: string;
  dateValue: string;
  timeValue: string;
  dateError?: string;
  timeError?: string;
  minDate?: string;
  minTime?: string;
  inline?: boolean;
  className?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

function fieldButtonClass(hasError: boolean) {
  return cn(
    "flex h-12 w-full items-center gap-2.5 rounded-xl border bg-white px-3.5 text-left text-sm transition-colors",
    "hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
    hasError ? "border-destructive" : "border-gray-300"
  );
}

export default function RentalDateTimePicker({
  label,
  dateValue,
  timeValue,
  dateError,
  timeError,
  minDate,
  minTime,
  inline = false,
  className,
  onDateChange,
  onTimeChange,
}: RentalDateTimePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (dateValue) {
      try {
        return startOfMonth(parseISO(dateValue));
      } catch {
        return startOfMonth(new Date());
      }
    }
    return startOfMonth(new Date());
  });

  const minDay = minDate ? startOfDay(parseISO(minDate)) : startOfDay(new Date());

  useEffect(() => {
    if (!dateValue) return;
    try {
      setViewMonth(startOfMonth(parseISO(dateValue)));
    } catch {
      // ignore invalid stored value
    }
  }, [dateValue]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const timeSlots = useMemo(
    () => getAvailableTimeSlots(dateValue, minDate, minTime),
    [dateValue, minDate, minTime]
  );

  const handleDateSelect = (day: Date) => {
    const nextDate = format(day, "yyyy-MM-dd");
    onDateChange(nextDate);

    const slots = getAvailableTimeSlots(nextDate, minDate, minTime);
    if (!timeValue || !slots.includes(timeValue)) {
      onTimeChange(getDefaultTimeSlot(nextDate, minDate, minTime));
    }

    setCalendarOpen(false);
  };

  const dateField = (
        <div>
          <span className="mb-1 block text-xs text-gray-500">Date</span>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={fieldButtonClass(!!dateError)}
                aria-label={`Choose ${label} date`}
              >
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className={cn("truncate", dateValue ? "text-gray-900" : "text-gray-500")}>
                  {dateValue ? formatRentalDateLabel(dateValue) : "Choose date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className="w-[17.5rem] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((month) => subMonths(month, 1))}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900">{format(viewMonth, "MMM yyyy")}</p>
                <button
                  type="button"
                  onClick={() => setViewMonth((month) => addMonths(month, 1))}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-400">
                {WEEKDAYS.map((day, index) => (
                  <div key={`${day}-${index}`} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                {calendarDays.map((day) => {
                  const disabled = isBefore(day, minDay);
                  const selected = dateValue ? isSameDay(day, parseISO(dateValue)) : false;
                  const muted = !isSameMonth(day, viewMonth);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        "h-8 rounded-md text-sm transition-colors",
                        selected && "bg-primary font-semibold text-white",
                        !selected && !disabled && !muted && "text-gray-900 hover:bg-accent",
                        !selected && muted && "text-gray-300",
                        disabled && "cursor-not-allowed text-gray-300"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          {dateError && <p className="mt-1 text-xs text-primary">{dateError}</p>}
        </div>
  );

  const timeField = (
        <div>
          <span className="mb-1 block text-xs text-gray-500">Time</span>
          <Select
            value={timeValue || undefined}
            onValueChange={onTimeChange}
            disabled={!dateValue}
          >
            <SelectTrigger
              className={cn(
                "h-12 rounded-xl",
                timeError ? "border-destructive" : "border-gray-300"
              )}
            >
              <SelectValue placeholder={dateValue ? "Choose time" : "Pick date first"} />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {timeSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {formatTimeLabel(slot)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timeError && <p className="mt-1 text-xs text-primary">{timeError}</p>}
        </div>
  );

  if (inline) {
    return (
      <>
        {dateField}
        {timeField}
      </>
    );
  }

  return (
    <div className={className}>
      <span className="mb-1.5 block text-sm font-medium text-gray-800">{label}</span>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr]">
        {dateField}
        {timeField}
      </div>
    </div>
  );
}
