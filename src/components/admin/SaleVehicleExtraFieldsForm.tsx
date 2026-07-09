"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SaleExtraFields } from "@/lib/vehicles/sale-vehicle-fields";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SaleVehicleExtraFieldsForm({
  value,
  onChange,
}: {
  value: SaleExtraFields;
  onChange: (next: SaleExtraFields) => void;
}) {
  function update<K extends keyof SaleExtraFields>(key: K, next: SaleExtraFields[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Variant">
          <Input
            placeholder="e.g. RX"
            value={value.variant ?? ""}
            onChange={(event) => update("variant", event.target.value)}
          />
        </Field>
        <Field label="Series">
          <Input
            placeholder="e.g. ZH MY10"
            value={value.series ?? ""}
            onChange={(event) => update("series", event.target.value)}
          />
        </Field>
      </div>

      <Field label="VIN">
        <Input
          placeholder="e.g. JMFXTCW5WAZ004353"
          value={value.vin ?? ""}
          onChange={(event) => update("vin", event.target.value.toUpperCase())}
          className="uppercase"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Transmission speeds (optional)">
          <Input
            placeholder="e.g. 6"
            value={value.transmissionSpeeds ?? ""}
            onChange={(event) => update("transmissionSpeeds", event.target.value)}
          />
        </Field>
        <Field label="Engine capacity – litres (optional)">
          <Input
            placeholder="e.g. 2.359"
            value={value.engineCapacityLitres ?? ""}
            onChange={(event) => update("engineCapacityLitres", event.target.value)}
          />
        </Field>
        <Field label="Engine cylinders (optional)">
          <Input
            placeholder="e.g. 4"
            value={value.engineCylinders ?? ""}
            onChange={(event) => update("engineCylinders", event.target.value)}
          />
        </Field>
        <Field label="Interior colour (optional)">
          <Input
            placeholder="e.g. Black"
            value={value.interiorColor ?? ""}
            onChange={(event) => update("interiorColor", event.target.value)}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold mb-4">Registration</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registered">
            <Select
              value={value.registered ?? ""}
              onValueChange={(next) => update("registered", next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Registration number (optional)">
            <Input
              placeholder="e.g. CG57VM"
              value={value.registrationNumber ?? ""}
              onChange={(event) => update("registrationNumber", event.target.value.toUpperCase())}
              className="uppercase"
            />
          </Field>
          <Field label="Registration expiry (optional)" className="sm:col-span-2 sm:max-w-xs">
            <Input
              type="date"
              value={value.registrationExpiry ?? ""}
              onChange={(event) => update("registrationExpiry", event.target.value)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
