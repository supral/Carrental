export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date {
  return new Date(value);
}

export function isWithinRentalAvailabilityWindow(
  pickupAt: Date,
  dropoffAt: Date,
  availableFrom: Date | null | undefined,
  availableTo: Date | null | undefined
): boolean {
  if (availableFrom) {
    const from = new Date(availableFrom);
    from.setHours(0, 0, 0, 0);
    const pickupDay = new Date(pickupAt);
    pickupDay.setHours(0, 0, 0, 0);
    if (pickupDay < from) return false;
  }

  if (availableTo) {
    const to = new Date(availableTo);
    to.setHours(23, 59, 59, 999);
    if (dropoffAt > to) return false;
  }

  return true;
}

export function formatRentalAvailabilityWindow(
  availableFrom: Date | string | null | undefined,
  availableTo?: Date | string | null | undefined
): string | null {
  if (!availableFrom) return null;

  const from = availableFrom instanceof Date ? availableFrom : new Date(availableFrom);
  if (Number.isNaN(from.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const fromLabel = formatter.format(from);

  if (!availableTo) {
    return `Since ${fromLabel}`;
  }

  const to = availableTo instanceof Date ? availableTo : new Date(availableTo);
  if (Number.isNaN(to.getTime())) return `Since ${fromLabel}`;

  const timeFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${timeFormatter.format(from)} – ${timeFormatter.format(to)}`;
}
