"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FleetVehicleStatus } from "@prisma/client";
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
import VehicleRentalOptionsChecklist, {
  type RentalOptionRow,
} from "@/components/admin/VehicleRentalOptionsChecklist";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  createFleetVehicle,
  getVehicleTypePreview,
  type FleetVehicleFormInput,
} from "@/lib/admin/fleet-vehicle-actions";
import { LoadingLabel } from "@/components/ui/loading";

type VehicleTypeOption = {
  id: string;
  title: string;
  fleetCount: number;
};

type TypePreview = NonNullable<Awaited<ReturnType<typeof getVehicleTypePreview>>>;

const STATUS_OPTIONS: FleetVehicleStatus[] = [
  FleetVehicleStatus.AVAILABLE,
  FleetVehicleStatus.RENTED,
  FleetVehicleStatus.MAINTENANCE,
  FleetVehicleStatus.RESERVED,
  FleetVehicleStatus.INACTIVE,
];

function yearOptions() {
  const current = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let y = current; y >= 1980; y -= 1) years.push(y);
  return years;
}

export default function CreateFleetVehicleForm({
  vehicleTypes,
  rentalOptions,
  initialVehicleId,
  canOverrideFleetNumber = false,
}: {
  vehicleTypes: VehicleTypeOption[];
  rentalOptions: RentalOptionRow[];
  initialVehicleId?: string;
  canOverrideFleetNumber?: boolean;
}) {
  const { toast } = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [preview, setPreview] = useState<TypePreview | null>(null);
  const [status, setStatus] = useState<FleetVehicleStatus>(FleetVehicleStatus.AVAILABLE);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [unitCount, setUnitCount] = useState("1");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [fleetNumberOverride, setFleetNumberOverride] = useState("");
  const [selectedRentalOptionIds, setSelectedRentalOptionIds] = useState<string[]>([]);
  const years = useMemo(() => yearOptions(), []);

  const units = Math.max(1, Math.min(500, Number.parseInt(unitCount, 10) || 1));
  const firstFleetNumber = preview?.nextFleetNumber ?? null;

  useEffect(() => {
    if (!vehicleId) {
      setPreview(null);
      setSelectedRentalOptionIds([]);
      setFleetNumberOverride("");
      return;
    }
    let cancelled = false;
    void getVehicleTypePreview(vehicleId).then((data) => {
      if (cancelled || !data) return;
      setPreview(data);
      if (data.year && data.year >= 1980) {
        setYear(String(data.year));
      }
      // Prefer make/model from type; allow override when type used placeholders
      if (data.make && data.make !== "Rental") setMake(data.make);
      if (data.model && data.model !== "Type") setModel(data.model);
      // Try to parse year from title e.g. "2024 Toyota Prado"
      const titleYear = data.title.match(/\b(19|20)\d{2}\b/);
      if (titleYear && (!data.year || data.make === "Rental")) {
        setYear(titleYear[0]);
      }
      setSelectedRentalOptionIds(data.rentalOptionIds);
      setFleetNumberOverride("");
    });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!vehicleId) {
      toast({ type: "error", message: "Select a vehicle type" });
      return;
    }

    if (!year) {
      toast({ type: "error", message: "Year is required" });
      return;
    }

    if (!make.trim() || !model.trim()) {
      toast({ type: "error", message: "Make and model are required" });
      return;
    }

    if (units < 1 || units > 500) {
      toast({ type: "error", message: "Number of units must be between 1 and 500" });
      return;
    }

    const payload: FleetVehicleFormInput = {
      vehicleId,
      unitCount: units,
      year: Number(year),
      make: make.trim(),
      model: model.trim(),
      registrationNumber: String(form.get("registrationNumber") ?? "") || undefined,
      vinNumber: String(form.get("vinNumber") ?? "") || undefined,
      odometer: form.get("odometer") ? Number(form.get("odometer")) : null,
      status,
      rentalOptionIds: selectedRentalOptionIds,
    };

    if (canOverrideFleetNumber && units === 1 && fleetNumberOverride.trim()) {
      payload.fleetNumber = fleetNumberOverride.trim();
    }

    startTransition(async () => {
      try {
        const created = await createFleetVehicle(payload);
        toast({
          type: "success",
          message:
            created.count === 1
              ? `Fleet unit ${created.fleetNumber} created`
              : `Created ${created.count} units (${created.fleetNumbers[0]} → ${created.fleetNumbers[created.fleetNumbers.length - 1]})`,
        });
        window.location.href = "/admin/fleet";
      } catch (error) {
        toast({
          type: "error",
          message: error instanceof Error ? error.message : "Could not create fleet unit",
        });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Vehicle type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Links physical cars to a rental listing. Customers book the type — not a Fleet #.
        </p>
        <div className="mt-4">
          <Label>Type</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choose vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.title} ({type.fleetCount} units)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vehicleTypes.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              No vehicle types yet.{" "}
              <Link href="/admin/vehicles/new" className="font-medium text-primary hover:underline">
                Create a vehicle type
              </Link>{" "}
              first.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Year &amp; units</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the car year and how many physical vehicles to add. Each gets its own Fleet #.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="year">Year of car *</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year" className="mt-1.5">
                <SelectValue placeholder="e.g. 2024" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unitCount">Number of units *</Label>
            <Input
              id="unitCount"
              type="number"
              min={1}
              max={500}
              value={unitCount}
              onChange={(e) => setUnitCount(e.target.value)}
              className="mt-1.5"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              e.g. enter 55 to create MGZS-001 through MGZS-055 in one step.
            </p>
          </div>
          <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Will create: </span>
            <span className="font-medium">
              {units} × {year || "—"} {make || "Make"} {model || "Model"}
            </span>
            {firstFleetNumber && (
              <>
                <span className="text-muted-foreground"> · Fleet # starts at </span>
                <span className="font-mono font-semibold">{firstFleetNumber}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Fleet details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Fleet number</Label>
            <div className="mt-1.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-sm font-semibold">
              {firstFleetNumber
                ? units === 1
                  ? firstFleetNumber
                  : `${firstFleetNumber} … (+${units - 1} more)`
                : vehicleId
                  ? "…"
                  : "Select a type"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-assigned per unit. Not the same as “number of units”.
            </p>
          </div>
          {canOverrideFleetNumber && units === 1 && (
            <div>
              <Label htmlFor="fleetNumberOverride">Override (Super Admin)</Label>
              <Input
                id="fleetNumberOverride"
                value={fleetNumberOverride}
                onChange={(e) => setFleetNumberOverride(e.target.value.toUpperCase())}
                placeholder={firstFleetNumber ?? "MGZS-001"}
                className="mt-1.5 font-mono"
              />
            </div>
          )}
          <div>
            <Label htmlFor="make">Make *</Label>
            <Input
              id="make"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Toyota"
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Prado"
              className="mt-1.5"
              required
            />
          </div>
          {units === 1 && (
            <>
              <div>
                <Label htmlFor="registrationNumber">Registration / Rego</Label>
                <Input id="registrationNumber" name="registrationNumber" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="vinNumber">VIN</Label>
                <Input id="vinNumber" name="vinNumber" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="odometer">Current KM (odometer)</Label>
                <Input id="odometer" name="odometer" type="number" min={0} className="mt-1.5" />
              </div>
            </>
          )}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as FleetVehicleStatus)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {units > 1 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Adding multiple units: rego / VIN / odometer can be set later per vehicle. Each unit shares
            year, make, model, and status.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Rental options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Options available at checkout for this vehicle type.
        </p>
        <div className="mt-4">
          {vehicleId ? (
            <VehicleRentalOptionsChecklist
              options={rentalOptions}
              selectedIds={selectedRentalOptionIds}
              onChange={setSelectedRentalOptionIds}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a vehicle type first.</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || !vehicleId}>
          {pending ? (
            <LoadingLabel label={units > 1 ? `Creating ${units} units...` : "Saving..."} />
          ) : units > 1 ? (
            `Create ${units} fleet units`
          ) : (
            "Create fleet unit"
          )}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/fleet">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
