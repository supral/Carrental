"use client";

import RentalDateTimePicker from "@/components/car-rental/search/RentalDateTimePicker";
import { cn } from "@/lib/utils";

export type RentalPickupDropoffDateTimesProps = {
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  minDate?: string;
  pickupLabel?: string;
  dropoffLabel?: string;
  pickupDateError?: string;
  pickupTimeError?: string;
  dropoffDateError?: string;
  dropoffTimeError?: string;
  onPickupDateChange: (value: string) => void;
  onPickupTimeChange: (value: string) => void;
  onDropoffDateChange: (value: string) => void;
  onDropoffTimeChange: (value: string) => void;
  className?: string;
};

/** Pickup and drop-off date/time side by side (not used on home search hero). */
export default function RentalPickupDropoffDateTimes({
  pickupDate,
  pickupTime,
  dropoffDate,
  dropoffTime,
  minDate,
  pickupLabel = "Pickup date & time *",
  dropoffLabel = "Drop-off date & time *",
  pickupDateError,
  pickupTimeError,
  dropoffDateError,
  dropoffTimeError,
  onPickupDateChange,
  onPickupTimeChange,
  onDropoffDateChange,
  onDropoffTimeChange,
  className,
}: RentalPickupDropoffDateTimesProps) {
  const today = minDate ?? new Date().toISOString().split("T")[0];

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      <RentalDateTimePicker
        label={pickupLabel}
        dateValue={pickupDate}
        timeValue={pickupTime}
        dateError={pickupDateError}
        timeError={pickupTimeError}
        minDate={today}
        onDateChange={onPickupDateChange}
        onTimeChange={onPickupTimeChange}
      />
      <RentalDateTimePicker
        label={dropoffLabel}
        dateValue={dropoffDate}
        timeValue={dropoffTime}
        dateError={dropoffDateError}
        timeError={dropoffTimeError}
        minDate={pickupDate || today}
        minTime={dropoffDate && dropoffDate === pickupDate ? pickupTime : undefined}
        onDateChange={onDropoffDateChange}
        onTimeChange={onDropoffTimeChange}
      />
    </div>
  );
}
