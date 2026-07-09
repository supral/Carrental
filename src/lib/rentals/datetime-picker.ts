import { format, parseISO } from "date-fns";

export const RENTAL_TIME_SLOTS = Array.from({ length: 12 }, (_, index) => {
  const hour = 7 + index;
  return `${String(hour).padStart(2, "0")}:00`;
});

export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatRentalDateLabel(dateValue: string): string {
  if (!dateValue) return "";
  try {
    return format(parseISO(dateValue), "EEE, d MMM yyyy");
  } catch {
    return dateValue;
  }
}

export function formatRentalDateTimeLabel(dateValue: string, timeValue: string): string {
  if (!dateValue && !timeValue) return "";
  if (dateValue && timeValue) {
    return `${formatRentalDateLabel(dateValue)} at ${formatTimeLabel(timeValue)}`;
  }
  if (dateValue) return formatRentalDateLabel(dateValue);
  return formatTimeLabel(timeValue);
}

export function getAvailableTimeSlots(
  selectedDate: string,
  minDate?: string,
  minTime?: string
): string[] {
  const today = format(new Date(), "yyyy-MM-dd");
  const compareDate = selectedDate || minDate || today;
  let slots = RENTAL_TIME_SLOTS;

  if (compareDate === today) {
    const now = new Date();
    const minMinutes = now.getHours() * 60 + now.getMinutes() + 30;
    slots = slots.filter((slot) => {
      const [hours, minutes] = slot.split(":").map(Number);
      return hours * 60 + minutes >= minMinutes;
    });
  }

  if (minTime && selectedDate && minDate && selectedDate === minDate) {
    slots = slots.filter((slot) => slot > minTime);
  }

  return slots;
}

export function getDefaultTimeSlot(
  selectedDate: string,
  minDate?: string,
  minTime?: string
): string {
  return getAvailableTimeSlots(selectedDate, minDate, minTime)[0] ?? "09:00";
}
