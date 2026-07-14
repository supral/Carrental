"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import SignaturePad from "@/components/rentals/SignaturePad";
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
  assignAndPickupAction,
  completeRentalAction,
  markSettlementPaidAction,
  returnVehicleAction,
  sendAgreementEmailAction,
} from "@/lib/admin/rental-agreement-actions";
import { FUEL_LEVELS, calculateReturnCharges, DEFAULT_FUEL_CHARGE_CENTS, DEFAULT_EXCESS_KM_RATE_CENTS } from "@/lib/rentals/rental-charges";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";
import {
  getWorkflowDisplayStatus,
  RENTAL_WORKFLOW_TIMELINE,
  getWorkflowTimelineIndex,
  WORKFLOW_STATUS_BADGE_CLASS,
} from "@/lib/rentals/rental-workflow";
import { cn, formatPrice } from "@/lib/utils";

type FleetOption = {
  id: string;
  fleetNumber: string;
  registrationNumber: string | null;
  vinNumber: string | null;
  currentKm: number | null;
  odometer: number | null;
  currentFuelLevel: string | null;
  fuelType: string | null;
  transmission: string | null;
  year: number | null;
  color: string | null;
  status: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    fuelType: string;
    transmission: string;
    color: string | null;
    price: number;
  };
};

type BookingDetail = {
  id: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  pickupAt: string | Date;
  dropoffAt: string | Date;
  rentalDays: number;
  totalAmountCents: number;
  baseAmountCents: number;
  customerFormCompletedAt: string | Date | null;
  agreementPdfUrl: string | null;
  fleetVehicleId: string | null;
  kmOut: number | null;
  expectedKmIn: number | null;
  kmIn: number | null;
  fuelOut: string | null;
  fuelIn: string | null;
  expectedReturnAt: string | Date | null;
  returnedAt: string | Date | null;
  dailyRateCents: number | null;
  dailyLimitKm: number | null;
  excessKmRateCents: number | null;
  bondCents: number | null;
  insuranceNotes: string | null;
  notes: string | null;
  extraKmChargeCents: number;
  fuelChargeCents: number;
  lateFeeCents: number;
  damageChargeCents: number;
  outstandingBalanceCents: number;
  vehicle: { title: string | null; make: string; model: string; year: number };
  drivers: Array<{
    id: string;
    isPrimary: boolean;
    firstName: string;
    lastName: string;
    licenceNumber: string | null;
  }>;
  documents: Array<{ id: string; pdfUrl: string; generatedAt: string | Date }>;
};

type Props = {
  booking: BookingDetail;
  availableFleet: FleetOption[];
  agreementUrl?: string | null;
};

export default function AdminBookingWorkflow({
  booking,
  availableFleet,
  agreementUrl: initialAgreementUrl = null,
}: Props) {
  const { toast } = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [agreementUrl, setAgreementUrl] = useState<string | null>(initialAgreementUrl);
  const display = getWorkflowDisplayStatus(booking.status);
  const timelineIndex = getWorkflowTimelineIndex(booking.status);
  const canSendAgreement =
    !booking.customerFormCompletedAt &&
    Boolean(booking.customerEmail) &&
    booking.status !== "CANCELLED" &&
    booking.status !== "COMPLETED" &&
    booking.status !== "ACTIVE" &&
    booking.status !== "RETURNED" &&
    booking.status !== "AWAITING_PAYMENT";

  const [fleetVehicleId, setFleetVehicleId] = useState(booking.fleetVehicleId ?? "");
  const selectedFleet = useMemo(
    () => availableFleet.find((unit) => unit.id === fleetVehicleId) ?? null,
    [availableFleet, fleetVehicleId]
  );

  const [kmOut, setKmOut] = useState(booking.kmOut ?? selectedFleet?.currentKm ?? selectedFleet?.odometer ?? 0);
  const [expectedKmIn, setExpectedKmIn] = useState(
    booking.expectedKmIn ??
      (booking.kmOut ?? selectedFleet?.currentKm ?? 0) +
        (booking.dailyLimitKm ?? 200) * Math.max(1, booking.rentalDays)
  );
  const [fuelOut, setFuelOut] = useState(booking.fuelOut ?? selectedFleet?.currentFuelLevel ?? "Full");
  const [timeOut, setTimeOut] = useState(
    format(new Date(booking.pickupAt), "yyyy-MM-dd'T'HH:mm")
  );
  const [expectedReturnAt, setExpectedReturnAt] = useState(
    format(new Date(booking.expectedReturnAt ?? booking.dropoffAt), "yyyy-MM-dd'T'HH:mm")
  );
  const [dailyRateCents, setDailyRateCents] = useState(
    booking.dailyRateCents ?? booking.baseAmountCents
  );
  const [dailyLimitKm, setDailyLimitKm] = useState(booking.dailyLimitKm ?? 200);
  const [excessKmRateCents, setExcessKmRateCents] = useState(
    booking.excessKmRateCents ?? DEFAULT_EXCESS_KM_RATE_CENTS
  );
  const [bondCents, setBondCents] = useState(booking.bondCents ?? 50000);
  const [insuranceNotes, setInsuranceNotes] = useState(booking.insuranceNotes ?? "");
  const [pickupNotes, setPickupNotes] = useState(booking.notes ?? "");
  const [adminPickupSig, setAdminPickupSig] = useState<string | null>(null);

  const [kmIn, setKmIn] = useState(booking.kmIn ?? booking.expectedKmIn ?? booking.kmOut ?? 0);
  const [fuelIn, setFuelIn] = useState(booking.fuelIn ?? booking.fuelOut ?? "Full");
  const [returnedAt, setReturnedAt] = useState(
    format(new Date(booking.returnedAt ?? new Date()), "yyyy-MM-dd'T'HH:mm")
  );
  const [damageNotes, setDamageNotes] = useState("");
  const [damageChargeCents, setDamageChargeCents] = useState(0);
  const [damagePhotoUrls, setDamagePhotoUrls] = useState<string[]>([]);
  const [adminReturnSig, setAdminReturnSig] = useState<string | null>(null);

  const liveCharges = useMemo(() => {
    if (booking.kmOut == null || !booking.fuelOut || !booking.expectedReturnAt) return null;
    return calculateReturnCharges({
      kmOut: booking.kmOut,
      expectedKmIn: booking.expectedKmIn ?? booking.kmOut,
      kmIn,
      fuelOut: booking.fuelOut,
      fuelIn,
      excessKmRateCents: booking.excessKmRateCents ?? DEFAULT_EXCESS_KM_RATE_CENTS,
      fuelChargeCents: DEFAULT_FUEL_CHARGE_CENTS,
      expectedReturnAt: new Date(booking.expectedReturnAt),
      returnedAt: new Date(returnedAt),
      damageChargeCents,
      rentalTotalCents: booking.totalAmountCents,
    });
  }, [booking, kmIn, fuelIn, returnedAt, damageChargeCents]);

  function onSelectFleet(id: string) {
    setFleetVehicleId(id);
    const unit = availableFleet.find((item) => item.id === id);
    if (!unit) return;
    const nextKm = unit.currentKm ?? unit.odometer ?? 0;
    setKmOut(nextKm);
    setExpectedKmIn(nextKm + dailyLimitKm * Math.max(1, booking.rentalDays));
    setFuelOut(unit.currentFuelLevel ?? "Full");
    if (!dailyRateCents) setDailyRateCents(unit.vehicle.price * 100);
  }

  async function uploadDamage(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/uploads/licence", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    setDamagePhotoUrls((prev) => [...prev, json.url]);
  }

  return (
    <div className="relative space-y-6">
      <LoadingOverlay show={pending} label="Updating booking..." />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Booking {booking.id}</p>
          <h1 className="text-2xl font-bold">
            {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
          </h1>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              WORKFLOW_STATUS_BADGE_CLASS[display]
            )}
          >
            {display}
          </span>
        </div>
        {booking.agreementPdfUrl && (
          <Button asChild variant="outline">
            <a href={booking.agreementPdfUrl} target="_blank" rel="noreferrer">
              Download Agreement PDF
            </a>
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Booking Timeline</h2>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {RENTAL_WORKFLOW_TIMELINE.map((step, index) => (
            <li
              key={step.status}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                index <= timelineIndex
                  ? "border-primary/40 bg-primary/5 font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              {step.label}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Customer</h2>
          <p>{booking.customerName}</p>
          <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
          <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
          <p className="text-sm">{booking.customerAddress}</p>
          <p className="text-sm">
            Form status:{" "}
            {booking.customerFormCompletedAt ? (
              <span className="text-emerald-700">Completed</span>
            ) : (
              <span className="text-amber-700">Pending</span>
            )}
          </p>
          {canSendAgreement && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const result = await sendAgreementEmailAction(booking.id);
                      setAgreementUrl(result.agreementUrl);
                      toast({
                        type: "success",
                        message: `Agreement email sent to ${booking.customerEmail}`,
                      });
                      window.location.reload();
                    } catch (err) {
                      toast({
                        type: "error",
                        message:
                          err instanceof Error ? err.message : "Failed to send agreement email",
                      });
                    }
                  });
                }}
              >
                {pending ? <LoadingLabel label="Sending..." /> : "Send Agreement Email"}
              </Button>
              {agreementUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Customer form link</p>
                  <a
                    href={agreementUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-xs text-primary hover:underline"
                  >
                    {agreementUrl}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(agreementUrl);
                        toast({ type: "success", message: "Link copied" });
                      } catch {
                        toast({ type: "error", message: "Could not copy link" });
                      }
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Drivers</h2>
          {booking.drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drivers submitted yet.</p>
          ) : (
            booking.drivers.map((driver) => (
              <p key={driver.id} className="text-sm">
                {driver.isPrimary ? "Primary: " : ""}
                {driver.firstName} {driver.lastName}
                {driver.licenceNumber ? ` · ${driver.licenceNumber}` : ""}
              </p>
            ))
          )}
        </div>
      </section>

      {(booking.status === "WAITING_FOR_VEHICLE_ASSIGNMENT" ||
        booking.status === "READY_FOR_PICKUP" ||
        booking.status === "CONFIRMED") &&
        booking.customerFormCompletedAt && (
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-semibold">Vehicle Assignment & Pickup</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Select fleet vehicle</Label>
                <Select value={fleetVehicleId} onValueChange={onSelectFleet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFleet.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.fleetNumber}
                        {unit.registrationNumber ? ` · ${unit.registrationNumber}` : ""} ({unit.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFleet && (
                <>
                  <ReadOnly label="Year" value={String(selectedFleet.year ?? selectedFleet.vehicle.year)} />
                  <ReadOnly label="Make" value={selectedFleet.vehicle.make} />
                  <ReadOnly label="Model" value={selectedFleet.vehicle.model} />
                  <ReadOnly label="Registration" value={selectedFleet.registrationNumber ?? "—"} />
                  <ReadOnly label="VIN" value={selectedFleet.vinNumber ?? "—"} />
                  <ReadOnly
                    label="Fuel Type"
                    value={selectedFleet.fuelType ?? selectedFleet.vehicle.fuelType}
                  />
                  <ReadOnly
                    label="Transmission"
                    value={selectedFleet.transmission ?? selectedFleet.vehicle.transmission}
                  />
                  <ReadOnly
                    label="Colour"
                    value={selectedFleet.color ?? selectedFleet.vehicle.color ?? "—"}
                  />
                  <ReadOnly
                    label="Current KM"
                    value={String(selectedFleet.currentKm ?? selectedFleet.odometer ?? "—")}
                  />
                  <ReadOnly
                    label="Current Fuel"
                    value={selectedFleet.currentFuelLevel ?? "—"}
                  />
                </>
              )}

              <div>
                <Label>KM Out</Label>
                <Input
                  type="number"
                  value={kmOut}
                  onChange={(e) => setKmOut(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Expected KM In</Label>
                <Input
                  type="number"
                  value={expectedKmIn}
                  onChange={(e) => setExpectedKmIn(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Fuel Level Out</Label>
                <Select value={fuelOut} onValueChange={setFuelOut}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time Out</Label>
                <Input type="datetime-local" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
              </div>
              <div>
                <Label>Expected Return</Label>
                <Input
                  type="datetime-local"
                  value={expectedReturnAt}
                  onChange={(e) => setExpectedReturnAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Daily Rate (cents)</Label>
                <Input
                  type="number"
                  value={dailyRateCents}
                  onChange={(e) => setDailyRateCents(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Daily Limit KM</Label>
                <Input
                  type="number"
                  value={dailyLimitKm}
                  onChange={(e) => setDailyLimitKm(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Excess KM Rate (cents)</Label>
                <Input
                  type="number"
                  value={excessKmRateCents}
                  onChange={(e) => setExcessKmRateCents(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Bond (cents)</Label>
                <Input
                  type="number"
                  value={bondCents}
                  onChange={(e) => setBondCents(Number(e.target.value))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Insurance</Label>
                <Input value={insuranceNotes} onChange={(e) => setInsuranceNotes(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} />
              </div>
            </div>
            <SignaturePad label="Admin signature" onChange={setAdminPickupSig} />
            <Button
              disabled={pending || !fleetVehicleId || !adminPickupSig}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await assignAndPickupAction(booking.id, {
                      fleetVehicleId,
                      kmOut,
                      expectedKmIn,
                      fuelOut,
                      timeOut: new Date(timeOut).toISOString(),
                      expectedReturnAt: new Date(expectedReturnAt).toISOString(),
                      dailyRateCents,
                      dailyLimitKm,
                      excessKmRateCents,
                      bondCents,
                      insuranceNotes,
                      notes: pickupNotes,
                      adminSignatureDataUrl: adminPickupSig,
                    });
                    toast({ type: "success", message: "Pickup completed. PDF sent to customer." });
                    window.location.reload();
                  } catch (err) {
                    toast({
                      type: "error",
                      message: err instanceof Error ? err.message : "Pickup failed",
                    });
                  }
                });
              }}
            >
              {pending ? (
                <LoadingLabel label="Completing pickup..." />
              ) : (
                "Complete Pickup & Generate PDF"
              )}
            </Button>
          </section>
        )}

      {booking.status === "ACTIVE" && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="font-semibold">Return Vehicle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label="KM Out" value={String(booking.kmOut ?? "—")} />
            <ReadOnly label="Expected KM In" value={String(booking.expectedKmIn ?? "—")} />
            <ReadOnly label="Fuel Out" value={booking.fuelOut ?? "—"} />
            <div>
              <Label>Actual KM In</Label>
              <Input type="number" value={kmIn} onChange={(e) => setKmIn(Number(e.target.value))} />
            </div>
            <div>
              <Label>Fuel In</Label>
              <Select value={fuelIn} onValueChange={setFuelIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Return Time</Label>
              <Input
                type="datetime-local"
                value={returnedAt}
                onChange={(e) => setReturnedAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Damage Charge (cents)</Label>
              <Input
                type="number"
                value={damageChargeCents}
                onChange={(e) => setDamageChargeCents(Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Damage Notes</Label>
              <Input value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Damage Photos</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await uploadDamage(file);
                  } catch (err) {
                    toast({
                      type: "error",
                      message: err instanceof Error ? err.message : "Upload failed",
                    });
                  }
                }}
              />
              {damagePhotoUrls.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {damagePhotoUrls.length} photo(s) uploaded
                </p>
              )}
            </div>
          </div>

          {liveCharges && (
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
              <p>Extra KM: {liveCharges.extraKm} · {formatPrice(liveCharges.extraKmChargeCents / 100)}</p>
              <p>Fuel charge: {formatPrice(liveCharges.fuelChargeCents / 100)}</p>
              <p>Late fee: {formatPrice(liveCharges.lateFeeCents / 100)} {liveCharges.lateReturn ? "(late)" : ""}</p>
              <p>Damage: {formatPrice(liveCharges.damageChargeCents / 100)}</p>
              <p className="font-semibold">
                Outstanding: {formatPrice(liveCharges.outstandingBalanceCents / 100)}
              </p>
            </div>
          )}

          <SignaturePad label="Admin return signature" onChange={setAdminReturnSig} />
          <Button
            disabled={pending || !adminReturnSig}
            onClick={() => {
              startTransition(async () => {
                try {
                  await returnVehicleAction(booking.id, {
                    kmIn,
                    fuelIn,
                    returnedAt: new Date(returnedAt).toISOString(),
                    damageNotes,
                    damagePhotoUrls,
                    damageChargeCents,
                    accessoriesChecklist: {
                      spareTyre: true,
                      jack: true,
                      floorMats: true,
                    },
                    adminSignatureDataUrl: adminReturnSig,
                  });
                  toast({ type: "success", message: "Vehicle returned" });
                  window.location.reload();
                } catch (err) {
                  toast({
                    type: "error",
                    message: err instanceof Error ? err.message : "Return failed",
                  });
                }
              });
            }}
          >
            {pending ? <LoadingLabel label="Processing return..." /> : "Return Vehicle"}
          </Button>
        </section>
      )}

      {(booking.status === "RETURNED" || booking.status === "AWAITING_PAYMENT") && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="font-semibold">Payment Summary</h2>
          <div className="text-sm space-y-1">
            <p>Extra KM: {formatPrice(booking.extraKmChargeCents / 100)}</p>
            <p>Fuel: {formatPrice(booking.fuelChargeCents / 100)}</p>
            <p>Late fee: {formatPrice(booking.lateFeeCents / 100)}</p>
            <p>Damage: {formatPrice(booking.damageChargeCents / 100)}</p>
            <p className="font-semibold">
              Outstanding: {formatPrice(booking.outstandingBalanceCents / 100)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {booking.outstandingBalanceCents > 0 && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await markSettlementPaidAction(booking.id);
                      toast({ type: "success", message: "Marked as paid" });
                      window.location.reload();
                    } catch (err) {
                      toast({
                        type: "error",
                        message: err instanceof Error ? err.message : "Update failed",
                      });
                    }
                  });
                }}
              >
                {pending ? <LoadingLabel label="Updating..." /> : "Mark Paid"}
              </Button>
            )}
            <Button
              disabled={pending || booking.outstandingBalanceCents > 0}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await completeRentalAction(booking.id);
                    toast({ type: "success", message: "Rental completed" });
                    window.location.reload();
                  } catch (err) {
                    toast({
                      type: "error",
                      message: err instanceof Error ? err.message : "Complete failed",
                    });
                  }
                });
              }}
            >
              {pending ? <LoadingLabel label="Completing..." /> : "Complete Rental"}
            </Button>
          </div>
        </section>
      )}

      <div>
        <Button asChild variant="ghost">
          <Link href="/admin/bookings">Back to bookings</Link>
        </Button>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} readOnly className="bg-muted/40" />
    </div>
  );
}
