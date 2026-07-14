"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RentalPickupDropoffDateTimes from "@/components/car-rental/search/RentalPickupDropoffDateTimes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import { buildRentalDetailUrl } from "@/lib/rentals/filter-utils";
import { getRentalCarTitle } from "@/lib/rentals/our-cars-display";
import { validateRentalSearchForm } from "@/lib/rentals/search-validation";
import type { Vehicle } from "@/types";
import type { RentalSearchFormValues } from "@/types/rental";

interface RentalDateRangeDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyDates: Pick<
  RentalSearchFormValues,
  "pickupDate" | "pickupTime" | "dropoffDate" | "dropoffTime"
> = {
  pickupDate: "",
  pickupTime: "",
  dropoffDate: "",
  dropoffTime: "",
};

export default function RentalDateRangeDialog({
  vehicle,
  open,
  onOpenChange,
}: RentalDateRangeDialogProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [dates, setDates] = useState(emptyDates);
  const [errors, setErrors] = useState<Partial<Record<keyof RentalSearchFormValues, string>>>({});

  useEffect(() => {
    if (!open) {
      setDates(emptyDates);
      setErrors({});
    }
  }, [open]);

  if (!vehicle) {
    return null;
  }

  const handleContinue = () => {
    const values: RentalSearchFormValues = {
      pickupAddress: DEFAULT_RENTAL_ADDRESS,
      dropoffAddress: DEFAULT_RENTAL_ADDRESS,
      ...dates,
    };

    const result = validateRentalSearchForm(values);
    if (!result.success) {
      const nextErrors: Partial<Record<keyof RentalSearchFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RentalSearchFormValues;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    const bookUrl = buildRentalDetailUrl(vehicle.id, result.data, "rent");
    onOpenChange(false);
    router.push(bookUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Select rental dates</DialogTitle>
          <DialogDescription>
            Choose when you need the <span className="font-medium text-gray-900">{getRentalCarTitle(vehicle)}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <RentalPickupDropoffDateTimes
            pickupDate={dates.pickupDate}
            pickupTime={dates.pickupTime}
            dropoffDate={dates.dropoffDate}
            dropoffTime={dates.dropoffTime}
            minDate={today}
            pickupDateError={errors.pickupDate}
            pickupTimeError={errors.pickupTime}
            dropoffDateError={errors.dropoffDate}
            dropoffTimeError={errors.dropoffTime}
            onPickupDateChange={(value) => {
              setDates((prev) => ({ ...prev, pickupDate: value }));
              setErrors((prev) => ({ ...prev, pickupDate: undefined, pickupTime: undefined }));
            }}
            onPickupTimeChange={(value) => {
              setDates((prev) => ({ ...prev, pickupTime: value }));
              setErrors((prev) => ({ ...prev, pickupTime: undefined }));
            }}
            onDropoffDateChange={(value) => {
              setDates((prev) => ({ ...prev, dropoffDate: value }));
              setErrors((prev) => ({ ...prev, dropoffDate: undefined, dropoffTime: undefined }));
            }}
            onDropoffTimeChange={(value) => {
              setDates((prev) => ({ ...prev, dropoffTime: value }));
              setErrors((prev) => ({ ...prev, dropoffTime: undefined }));
            }}
          />

          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            Continue to booking
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
