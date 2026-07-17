"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RentalAvailabilityCalendar from "@/components/admin/RentalAvailabilityCalendar";
import RentalAddressInput from "@/components/car-rental/search/RentalAddressInput";
import RentalPickupDropoffDateTimes from "@/components/car-rental/search/RentalPickupDropoffDateTimes";
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
  getOptionCategory,
  hasProtectionChoiceSelected,
  rentalSelectionsToPayload,
  type RentalOptionSelections,
} from "@/lib/rentals/rental-option-selection";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import {
  getEnabledVehicleOptions,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";
import { formatPrice } from "@/lib/utils";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";

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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "POS" | "STRIPE">("POS");
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
  const [licencePhotoUrl, setLicencePhotoUrl] = useState("");
  const [licenceUploading, setLicenceUploading] = useState(false);
  const [terms, setTerms] = useState({
    rentalTerms: false,
    insuranceExcess: false,
    fuelPolicy: false,
    extraKilometres: false,
    lateReturnCharges: false,
    damagePolicy: false,
  });

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null,
    [vehicles, vehicleId]
  );

  const insuranceOptions = useMemo(
    () =>
      getEnabledVehicleOptions(vehicleOptions).filter(
        (option) => getOptionCategory(option) === "insurance"
      ),
    [vehicleOptions]
  );

  const protectionChosen = hasProtectionChoiceSelected(selections, insuranceOptions);
  const [showProtectionError, setShowProtectionError] = useState(false);

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

    if (!protectionChosen) {
      setShowProtectionError(true);
      setError("Please select Standard Damage Cover or No Protection.");
      return;
    }
    setShowProtectionError(false);

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
          customerDob: get("customerDob"),
          customerCountry: get("customerCountry") || "Australia",
          drivingLicenceNumber: get("drivingLicenceNumber") || undefined,
          licencePhotoUrl: licencePhotoUrl || undefined,
          licenceExpiry: get("licenceExpiry") || undefined,
          signatureText: get("signatureText") || undefined,
          acceptRentalTerms: terms.rentalTerms,
          acceptInsuranceExcess: terms.insuranceExcess,
          acceptFuelPolicy: terms.fuelPolicy,
          acceptExtraKilometres: terms.extraKilometres,
          acceptLateReturnCharges: terms.lateReturnCharges,
          acceptDamagePolicy: terms.damagePolicy,
          notes: get("notes") || undefined,
          bookingSource,
          paymentMethod,
          selectedOptions: rentalSelectionsToPayload(selections),
        });

        if (result.checkoutUrl) {
          toast({
            type: "success",
            message: `Booking created (${formatPrice(result.totalAmountCents / 100)}). Opening Stripe Checkout…`,
          });
          window.location.href = result.checkoutUrl;
          return;
        }

        toast({
          type: "success",
          message: result.agreementCompletedInOffice
            ? `Booking created & paid via ${paymentMethod === "CASH" ? "Cash" : "POS"} (${formatPrice(result.totalAmountCents / 100)}). Confirmation emailed.`
            : `Booking created & paid via ${paymentMethod === "CASH" ? "Cash" : "POS"} (${formatPrice(result.totalAmountCents / 100)}). Confirmation and agreement emails sent.`,
        });
        router.push(`/admin/bookings/${result.id}`);
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
    <form onSubmit={handleSubmit} className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <LoadingOverlay show={isPending} label="Creating booking..." />
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

            <div>
              <Label className="mb-1.5 block">Payment method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "CASH" | "POS" | "STRIPE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POS">POS (card terminal)</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="STRIPE">Stripe (online checkout)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {paymentMethod === "STRIPE"
                  ? "Creates an unpaid booking and opens Stripe Checkout for the customer."
                  : paymentMethod === "POS"
                    ? "Marks the booking paid after card is taken on the POS terminal."
                    : "Marks the booking paid for cash received in office."}
              </p>
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

          <RentalPickupDropoffDateTimes
            pickupDate={pickupDate}
            pickupTime={pickupTime}
            dropoffDate={dropoffDate}
            dropoffTime={dropoffTime}
            minDate={today}
            onPickupDateChange={(value) => {
              setPickupDate(value);
              if (dropoffDate && dropoffDate < value) {
                setDropoffDate("");
                setDropoffTime("09:00");
              }
            }}
            onPickupTimeChange={setPickupTime}
            onDropoffDateChange={setDropoffDate}
            onDropoffTimeChange={setDropoffTime}
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
            onSelectionsChange={(next) => {
              setSelections(next);
              setShowProtectionError(false);
            }}
            requireProtectionChoice
            protectionError={
              showProtectionError
                ? "Please select Standard Damage Cover or No Protection."
                : undefined
            }
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Customer details</h2>
            <p className="text-sm text-muted-foreground">
              Required for the booking. Optionally complete the rental agreement here for walk-in
              customers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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
            <div>
              <Label htmlFor="customerAddress" className="mb-1.5 block">
                Address *
              </Label>
              <Input id="customerAddress" name="customerAddress" required />
            </div>
            <div>
              <Label htmlFor="customerDob" className="mb-1.5 block">
                Date of birth *
              </Label>
              <Input id="customerDob" name="customerDob" type="date" required max={today} />
            </div>
            <div>
              <Label htmlFor="customerCountry" className="mb-1.5 block">
                Country *
              </Label>
              <Input id="customerCountry" name="customerCountry" defaultValue="Australia" required />
            </div>

            <div className="sm:col-span-2 border-t border-border pt-4">
              <h3 className="font-semibold">Rental agreement (office / walk-in)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave <span className="font-medium">Licence number</span> empty to email the
                customer the agreement form link. Or fill licence, image, signature, and all terms
                to complete the agreement in office (no agreement email).
              </p>
            </div>

            <div>
              <Label htmlFor="drivingLicenceNumber" className="mb-1.5 block">
                Licence number
              </Label>
              <Input id="drivingLicenceNumber" name="drivingLicenceNumber" placeholder="Licence no." />
            </div>
            <div>
              <Label htmlFor="licenceExpiry" className="mb-1.5 block">
                Licence expiry
              </Label>
              <Input id="licenceExpiry" name="licenceExpiry" type="date" />
            </div>
            <div>
              <Label htmlFor="licencePhoto" className="mb-1.5 block">
                Licence image
              </Label>
              <Input
                id="licencePhoto"
                type="file"
                accept="image/*,application/pdf"
                disabled={licenceUploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setLicenceUploading(true);
                  setError("");
                  try {
                    const body = new FormData();
                    body.append("file", file);
                    const res = await fetch("/api/uploads/licence", { method: "POST", body });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Licence upload failed");
                    setLicencePhotoUrl(json.url as string);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Licence upload failed");
                    setLicencePhotoUrl("");
                  } finally {
                    setLicenceUploading(false);
                  }
                }}
              />
              {licenceUploading && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <LoadingLabel label="Uploading licence..." />
                </p>
              )}
              {licencePhotoUrl && !licenceUploading && (
                <p className="mt-1 text-xs text-emerald-700">Licence image uploaded</p>
              )}
            </div>
            <div>
              <Label htmlFor="signatureText" className="mb-1.5 block">
                Signature (type full name)
              </Label>
              <Input
                id="signatureText"
                name="signatureText"
                placeholder="Signed name"
              />
            </div>
            <div className="sm:col-span-2 space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">Rental terms</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["rentalTerms", "I agree to Rental Terms"],
                    ["insuranceExcess", "Insurance Excess"],
                    ["fuelPolicy", "Fuel Policy"],
                    ["extraKilometres", "Extra Kilometres"],
                    ["lateReturnCharges", "Late Return Charges"],
                    ["damagePolicy", "Damage Policy"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={terms[key]}
                      onChange={(e) =>
                        setTerms((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
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
          <Button type="submit" disabled={isPending || !vehicleId || !canBook || !protectionChosen}>
            {isPending ? (
              <LoadingLabel
                label={
                  paymentMethod === "STRIPE" ? "Opening Stripe..." : "Creating booking..."
                }
              />
            ) : paymentMethod === "STRIPE" ? (
              "Create & pay with Stripe"
            ) : paymentMethod === "POS" ? (
              "Create & mark paid (POS)"
            ) : (
              "Create & mark paid (Cash)"
            )}
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
