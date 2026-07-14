"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RentalAvailabilityCalendar from "@/components/admin/RentalAvailabilityCalendar";
import RentalAddressInput from "@/components/car-rental/search/RentalAddressInput";
import RentalDateTimePicker from "@/components/car-rental/search/RentalDateTimePicker";
import RentalOptionsSelector from "@/components/car-rental/booking/RentalOptionsSelector";
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
  checkAdminBookingAvailability,
  createAdminRentalBooking,
  getAdminVehicleOptions,
} from "@/lib/admin/rental-booking-actions";
import {
  buildInitialRentalOptionSelections,
  rentalSelectionsToPayload,
  type RentalOptionSelections,
} from "@/lib/rentals/rental-option-selection";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import type { VehicleRentalOptionConfig } from "@/lib/rentals/option-catalog";
import { formatPrice } from "@/lib/utils";

type VehicleOption = {
  id: string;
  title: string;
  price: number;
  totalUnits: number;
};

interface CreateRentalBookingFormProps {
  vehicles: VehicleOption[];
  initialVehicleId?: string;
  initialPickupDate?: string;
  initialDropoffDate?: string;
}

export default function CreateRentalBookingForm({
  vehicles,
  initialVehicleId,
  initialPickupDate,
  initialDropoffDate,
}: CreateRentalBookingFormProps) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [canBook, setCanBook] = useState(false);

  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? vehicles[0]?.id ?? "");
  const [bookingSource, setBookingSource] = useState<"walk_in" | "phone" | "other">("walk_in");
  const [pickupAddress, setPickupAddress] = useState(DEFAULT_RENTAL_ADDRESS);
  const [dropoffAddress, setDropoffAddress] = useState(DEFAULT_RENTAL_ADDRESS);
  const [pickupDate, setPickupDate] = useState(initialPickupDate ?? "");
  const [pickupTime, setPickupTime] = useState("09:00");
  const [dropoffDate, setDropoffDate] = useState(initialDropoffDate ?? "");
  const [dropoffTime, setDropoffTime] = useState(
    initialPickupDate &&
      initialDropoffDate &&
      initialPickupDate === initialDropoffDate
      ? "17:00"
      : "09:00"
  );
  const [vehicleOptions, setVehicleOptions] = useState<VehicleRentalOptionConfig[]>([]);
  const [selections, setSelections] = useState<RentalOptionSelections>({});

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null,
    [vehicles, vehicleId]
  );

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!vehicleId) {
      setVehicleOptions([]);
      setSelections({});
      return;
    }

    let cancelled = false;
    void getAdminVehicleOptions(vehicleId)
      .then((options) => {
        if (cancelled) return;
        setVehicleOptions(options);
        setSelections(buildInitialRentalOptionSelections(options));
      })
      .catch(() => {
        if (cancelled) return;
        setVehicleOptions([]);
        setSelections({});
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || !pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      setAvailabilityNote(
        pickupDate && !dropoffDate
          ? "Select a drop-off date to check availability."
          : ""
      );
      setCanBook(false);
      return;
    }

    const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
    const dropoffAt = new Date(`${dropoffDate}T${dropoffTime}:00`);
    if (dropoffAt <= pickupAt) {
      setAvailabilityNote("Drop-off must be after pickup. Adjust the drop-off time or date.");
      setCanBook(false);
      return;
    }

    const pickupDateTime = pickupAt.toISOString();
    const dropoffDateTime = dropoffAt.toISOString();
    const timer = window.setTimeout(() => {
      void checkAdminBookingAvailability(vehicleId, pickupDateTime, dropoffDateTime)
        .then((availability) => {
          setAvailabilityNote(availability.message);
          setCanBook(true);
        })
        .catch((err) => {
          setAvailabilityNote(err instanceof Error ? err.message : "Could not check availability");
          setCanBook(false);
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [vehicleId, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const applyCalendarDate = (date: string) => {
    setError("");

    if (!pickupDate || (pickupDate && dropoffDate)) {
      setPickupDate(date);
      setDropoffDate("");
      if (!pickupTime) setPickupTime("09:00");
      return;
    }

    if (date < pickupDate) {
      setPickupDate(date);
      setDropoffDate("");
      return;
    }

    setDropoffDate(date);
    if (date === pickupDate) {
      const [hours, minutes] = (pickupTime || "09:00").split(":").map(Number);
      const bumpedHour = Math.min(20, hours + 1);
      const bumped = `${String(bumpedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      setDropoffTime(bumped <= pickupTime ? "20:00" : bumped);
    } else if (!dropoffTime) {
      setDropoffTime("09:00");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const get = (key: string) => String(formData.get(key) ?? "").trim();

    startTransition(async () => {
      try {
        const result = await createAdminRentalBooking({
          vehicleId,
          pickupAddress,
          dropoffAddress,
          pickupDate,
          pickupTime,
          dropoffDate,
          dropoffTime,
          customerName: get("customerName"),
          customerEmail: get("customerEmail"),
          customerPhone: get("customerPhone"),
          customerAddress: get("customerAddress"),
          customerZip: get("customerZip"),
          customerDob: get("customerDob"),
          customerCountry: get("customerCountry") || "Australia",
          notes: get("notes") || undefined,
          bookingSource,
          selectedOptions: rentalSelectionsToPayload(selections),
        });

        toast({
          type: "success",
          message: `Booking created successfully (${formatPrice(result.totalAmountCents / 100)}).`,
        });
        router.push("/admin/bookings");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create booking");
      }
    });
  };

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No active rental vehicles found. Add a vehicle to the rental fleet first.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/vehicles/new">Add rental vehicle</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Trip details</h2>
            <p className="text-sm text-muted-foreground">
              Create a confirmed booking for walk-in or phone customers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.title} · {formatPrice(vehicle.price)}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block">Booking source</Label>
              <Select
                value={bookingSource}
                onValueChange={(value) => setBookingSource(value as "walk_in" | "phone" | "other")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in / Office</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <RentalAddressInput
              label="Pickup Address"
              value={pickupAddress}
              onChange={setPickupAddress}
              required
            />
            <RentalAddressInput
              label="Drop-off Address"
              value={dropoffAddress}
              onChange={setDropoffAddress}
              required
            />
          </div>

          <RentalDateTimePicker
            label="Pickup date & time *"
            dateValue={pickupDate}
            timeValue={pickupTime}
            minDate={today}
            onDateChange={(value) => {
              setPickupDate(value);
              if (dropoffDate && dropoffDate < value) {
                setDropoffDate("");
                setDropoffTime("09:00");
              }
            }}
            onTimeChange={setPickupTime}
          />
          <RentalDateTimePicker
            label="Drop-off date & time *"
            dateValue={dropoffDate}
            timeValue={dropoffTime}
            minDate={pickupDate || today}
            minTime={dropoffDate && dropoffDate === pickupDate ? pickupTime : undefined}
            onDateChange={setDropoffDate}
            onTimeChange={setDropoffTime}
          />

          {availabilityNote && (
            <p
              className={`text-sm ${
                canBook
                  ? "text-green-700"
                  : availabilityNote.includes("Select a drop-off")
                    ? "text-amber-700"
                    : "text-red-600"
              }`}
            >
              {availabilityNote}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <RentalOptionsSelector
            vehicleOptions={vehicleOptions}
            selections={selections}
            onSelectionsChange={setSelections}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Customer details</h2>
            <p className="text-sm text-muted-foreground">Required for the booking record and confirmation.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="customerName" className="mb-1.5 block">
                Full name *
              </Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div>
              <Label htmlFor="customerEmail" className="mb-1.5 block">
                Email *
              </Label>
              <Input id="customerEmail" name="customerEmail" type="email" required />
            </div>
            <div>
              <Label htmlFor="customerPhone" className="mb-1.5 block">
                Phone *
              </Label>
              <Input id="customerPhone" name="customerPhone" type="tel" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customerAddress" className="mb-1.5 block">
                Address *
              </Label>
              <Input id="customerAddress" name="customerAddress" required />
            </div>
            <div>
              <Label htmlFor="customerZip" className="mb-1.5 block">
                Postcode *
              </Label>
              <Input id="customerZip" name="customerZip" required />
            </div>
            <div>
              <Label htmlFor="customerDob" className="mb-1.5 block">
                Date of birth *
              </Label>
              <Input id="customerDob" name="customerDob" type="date" required max={today} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customerCountry" className="mb-1.5 block">
                Country *
              </Label>
              <Input id="customerCountry" name="customerCountry" defaultValue="Australia" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes" className="mb-1.5 block">
                Notes
              </Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
                placeholder="Payment collected, special requests, etc."
              />
            </div>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/bookings">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending || !vehicleId || !canBook}>
            {isPending ? "Creating booking..." : "Create booking"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        {selectedVehicle && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selected vehicle
            </p>
            <p className="mt-1 text-lg font-bold">{selectedVehicle.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPrice(selectedVehicle.price)} / day
            </p>
          </div>
        )}

        {vehicleId ? (
          <RentalAvailabilityCalendar
            vehicleId={vehicleId}
            pickupDate={pickupDate}
            dropoffDate={dropoffDate}
            onSelectDate={(date) => applyCalendarDate(date)}
          />
        ) : null}
      </div>
    </form>
  );
}
