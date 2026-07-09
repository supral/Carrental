import { z } from "zod";

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function normalizeTimeValue(time: string): string {
  const trimmed = time.trim();
  if (!trimmed) return "";
  const match = trimmed.match(TIME_PATTERN);
  if (!match) return trimmed;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function combineDateAndTime(date: string, time: string): Date {
  const normalized = normalizeTimeValue(time);
  return new Date(`${date}T${normalized}:00`);
}

export const rentalSearchFormSchema = z
  .object({
    pickupAddress: z.string().trim().min(1, "Pickup address is required"),
    pickupDate: z.string().min(1, "Pickup date is required"),
    pickupTime: z.string().min(1, "Pickup time is required").refine(
      (value) => TIME_PATTERN.test(normalizeTimeValue(value)),
      "Enter a valid time (HH:MM)"
    ),
    dropoffAddress: z.string().trim().min(1, "Drop-off address is required"),
    dropoffDate: z.string().min(1, "Drop-off date is required"),
    dropoffTime: z.string().min(1, "Drop-off time is required").refine(
      (value) => TIME_PATTERN.test(normalizeTimeValue(value)),
      "Enter a valid time (HH:MM)"
    ),
  })
  .superRefine((data, ctx) => {
    const pickupAt = combineDateAndTime(data.pickupDate, normalizeTimeValue(data.pickupTime));
    const dropoffAt = combineDateAndTime(data.dropoffDate, normalizeTimeValue(data.dropoffTime));
    const now = new Date();

    if (Number.isNaN(pickupAt.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid pickup date or time", path: ["pickupDate"] });
      return;
    }

    if (Number.isNaN(dropoffAt.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid drop-off date or time", path: ["dropoffDate"] });
      return;
    }

    if (pickupAt < now) {
      ctx.addIssue({
        code: "custom",
        message: "Pickup cannot be in the past",
        path: ["pickupDate"],
      });
    }

    if (dropoffAt <= pickupAt) {
      ctx.addIssue({
        code: "custom",
        message: "Drop-off must be after pickup",
        path: ["dropoffDate"],
      });
    }
  });

export type RentalSearchFormInput = z.infer<typeof rentalSearchFormSchema>;

export function toRentalSearchRequest(values: RentalSearchFormInput) {
  const pickupAt = combineDateAndTime(values.pickupDate, values.pickupTime);
  const dropoffAt = combineDateAndTime(values.dropoffDate, values.dropoffTime);

  return {
    pickupAddress: values.pickupAddress.trim(),
    pickupDateTime: pickupAt.toISOString(),
    dropoffAddress: values.dropoffAddress.trim(),
    dropoffDateTime: dropoffAt.toISOString(),
  };
}

export function validateRentalSearchForm(values: RentalSearchFormInput) {
  return rentalSearchFormSchema.safeParse(values);
}
