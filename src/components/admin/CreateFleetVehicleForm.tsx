"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FleetVehicleStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
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
  createFleetVehicle,
  getVehicleTypePreview,
  type FleetVehicleFormInput,
} from "@/lib/admin/fleet-vehicle-actions";
import { formatPrice } from "@/lib/utils";

type VehicleTypeOption = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  fuelType: string;
  transmission: string;
  seats: number | null;
  doors: number | null;
  driveType: string | null;
  color: string | null;
  bodyType: string;
  location: string;
  features: string[];
  description: string;
  imageUrls: string[];
  fleetCount: number;
};

type TypePreview = Awaited<ReturnType<typeof getVehicleTypePreview>>;

const STATUS_OPTIONS: FleetVehicleStatus[] = [
  FleetVehicleStatus.AVAILABLE,
  FleetVehicleStatus.RENTED,
  FleetVehicleStatus.MAINTENANCE,
  FleetVehicleStatus.RESERVED,
  FleetVehicleStatus.INACTIVE,
];

export default function CreateFleetVehicleForm({
  vehicleTypes,
  initialVehicleId,
}: {
  vehicleTypes: VehicleTypeOption[];
  initialVehicleId?: string;
}) {
  const { toast } = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [preview, setPreview] = useState<TypePreview>(null);
  const [status, setStatus] = useState<FleetVehicleStatus>(FleetVehicleStatus.AVAILABLE);

  const selectedType = useMemo(
    () => vehicleTypes.find((type) => type.id === vehicleId) ?? null,
    [vehicleId, vehicleTypes]
  );

  useEffect(() => {
    if (!vehicleId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    void getVehicleTypePreview(vehicleId).then((data) => {
      if (!cancelled) setPreview(data);
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

    const payload: FleetVehicleFormInput = {
      vehicleId,
      fleetNumber: String(form.get("fleetNumber") ?? ""),
      registrationNumber: String(form.get("registrationNumber") ?? "") || undefined,
      vinNumber: String(form.get("vinNumber") ?? "") || undefined,
      engineNumber: String(form.get("engineNumber") ?? "") || undefined,
      odometer: form.get("odometer") ? Number(form.get("odometer")) : null,
      color: String(form.get("color") ?? "") || undefined,
      branch: String(form.get("branch") ?? "") || undefined,
      status,
      notes: String(form.get("notes") ?? "") || undefined,
    };

    startTransition(async () => {
      try {
        const created = await createFleetVehicle(payload);
        toast({ type: "success", message: `Fleet unit ${created.fleetNumber} created` });
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
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Step 1 — Select vehicle type</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared specs, pricing, images, and options come from the type and are not edited here.
          </p>
          <div className="mt-4">
            <Label>Vehicle type</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose a vehicle type" />
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
        </div>

        <div>
          <h2 className="text-lg font-semibold">Step 2 — Fleet unit details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fleetNumber">Fleet number *</Label>
              <Input
                id="fleetNumber"
                name="fleetNumber"
                required
                placeholder="e.g. MGZS-001"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="registrationNumber">Registration / plate</Label>
              <Input id="registrationNumber" name="registrationNumber" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="vinNumber">VIN</Label>
              <Input id="vinNumber" name="vinNumber" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="engineNumber">Engine number</Label>
              <Input id="engineNumber" name="engineNumber" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="odometer">Odometer</Label>
              <Input id="odometer" name="odometer" type="number" min={0} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="color">Current color</Label>
              <Input
                id="color"
                name="color"
                defaultValue={selectedType?.color ?? ""}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="branch">Current branch</Label>
              <Input
                id="branch"
                name="branch"
                defaultValue={selectedType?.location ?? "Darwin, NT"}
                className="mt-1.5"
              />
            </div>
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
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending || !vehicleId}>
            {pending ? "Saving..." : "Create fleet unit"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/fleet">Cancel</Link>
          </Button>
        </div>
      </div>

      <aside className="h-fit rounded-xl border border-border bg-muted/20 p-5">
        <h3 className="font-semibold">From vehicle type</h3>
        <p className="mt-1 text-sm text-muted-foreground">Read-only template details</p>

        {!preview ? (
          <p className="mt-6 text-sm text-muted-foreground">Select a vehicle type to preview shared details.</p>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {preview.imageUrls[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.imageUrls[0]}
                alt={preview.title}
                className="h-36 w-full rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-base font-semibold">{preview.title}</p>
              <p className="text-muted-foreground">
                {preview.make} {preview.model} · {preview.year}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <span className="text-muted-foreground">Daily</span>
                <br />
                <span className="font-medium">{formatPrice(preview.price)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Body</span>
                <br />
                <span className="font-medium">{preview.bodyType}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Seats</span>
                <br />
                <span className="font-medium">{preview.seats ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Transmission</span>
                <br />
                <span className="font-medium">{preview.transmission}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Fuel</span>
                <br />
                <span className="font-medium">{preview.fuelType}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Drive</span>
                <br />
                <span className="font-medium">{preview.driveType ?? "—"}</span>
              </p>
            </div>
            {preview.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.features.slice(0, 8).map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            )}
            {preview.rentalOptions.length > 0 && (
              <div>
                <p className="font-medium">Rental options</p>
                <p className="mt-1 text-muted-foreground">{preview.rentalOptions.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
