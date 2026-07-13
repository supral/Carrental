"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import VehicleRentalOptionsChecklist, {
  type RentalOptionRow,
} from "@/components/admin/VehicleRentalOptionsChecklist";
import VehicleTemplateFieldsForm, {
  templateSelectionsToInputs,
  templateValuesToSelectionState,
  type TemplateFieldDefinition,
  type TemplateFieldValueState,
} from "@/components/admin/VehicleTemplateFieldsForm";
import VehicleCustomFieldsForm from "@/components/admin/VehicleCustomFieldsForm";
import VehicleDetailsEditor from "@/components/admin/VehicleDetailsEditor";
import { updateVehicleRentalOptions } from "@/lib/admin/actions";
import { getVehicleTypeWithTemplate } from "@/lib/admin/vehicle-type-actions";
import type { FleetAvailability } from "@/lib/rentals/fleet-inventory";
import type { VehicleDetailsDocument } from "@/lib/vehicles/vehicle-details";
import type { CustomFieldInput } from "@/lib/vehicles/vehicle-specs-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RentalBookingCalendar from "@/components/admin/RentalBookingCalendar";

interface VehicleTypeOption {
  id: string;
  name: string;
}

interface EditRentalVehicleClientProps {
  vehicle: {
    id: string;
    title: string;
    bodyType: string;
    vehicleTypeId: string | null;
    totalUnits: number;
    listedSince: string | null;
    selectedRentalOptionIds: string[];
    vehicleDetails: VehicleDetailsDocument;
    fleetSnapshot: FleetAvailability;
    templateValues: TemplateFieldValueState;
    customFields: CustomFieldInput[];
  };
  vehicleTypes: VehicleTypeOption[];
  rentalOptions: RentalOptionRow[];
}

export default function EditRentalVehicleClient({
  vehicle,
  vehicleTypes,
  rentalOptions,
}: EditRentalVehicleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedRentalOptionIds, setSelectedRentalOptionIds] = useState(vehicle.selectedRentalOptionIds);
  const [vehicleDetails, setVehicleDetails] = useState(vehicle.vehicleDetails);
  const [vehicleTypeId, setVehicleTypeId] = useState(vehicle.vehicleTypeId ?? "");
  const [selectedTemplateFieldIds, setSelectedTemplateFieldIds] = useState<string[]>([]);
  const [templateValueOverrides, setTemplateValueOverrides] = useState<TemplateFieldValueState>({});
  const [templateFields, setTemplateFields] = useState<TemplateFieldDefinition[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>(vehicle.customFields);

  const listedSinceLabel = vehicle.listedSince
    ? new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(vehicle.listedSince))
    : null;

  useEffect(() => {
    if (!vehicleTypeId) {
      setTemplateFields([]);
      return;
    }

    let cancelled = false;
    getVehicleTypeWithTemplate(vehicleTypeId).then((type) => {
      if (cancelled || !type) return;
      const fields = type.templateFields.map((field) => ({
        id: field.id,
        name: field.name,
        inputType: field.inputType,
        required: field.required,
        sortOrder: field.sortOrder,
        group: field.group,
        defaultValue: field.defaultValue,
      }));
      setTemplateFields(fields);
      if (vehicleTypeId === vehicle.vehicleTypeId) {
        const { selectedIds, valueOverrides } = templateValuesToSelectionState(
          vehicle.templateValues,
          fields
        );
        setSelectedTemplateFieldIds(selectedIds);
        setTemplateValueOverrides(valueOverrides);
      } else {
        setSelectedTemplateFieldIds([]);
        setTemplateValueOverrides({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [vehicleTypeId, vehicle.vehicleTypeId, vehicle.templateValues]);

  const handleSave = () => {
    setError("");

    startTransition(async () => {
      try {
        await updateVehicleRentalOptions(
          vehicle.id,
          selectedRentalOptionIds,
          vehicle.fleetSnapshot.totalUnits,
          vehicleDetails,
          templateSelectionsToInputs(templateFields, selectedTemplateFieldIds, templateValueOverrides),
          customFields,
          vehicleTypeId || null
        );
        router.push("/admin/vehicles");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save vehicle type");
      }
    });
  };

  const bookedUnits = vehicle.fleetSnapshot.totalUnits - vehicle.fleetSnapshot.availableUnits;

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Vehicle Types", href: "/admin/vehicles" },
          { label: vehicle.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit Vehicle Type</h1>
          <p className="text-muted-foreground">{vehicle.title}</p>
          {listedSinceLabel && (
            <p className="mt-1 text-sm text-muted-foreground">Listed for rental since {listedSinceLabel}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/admin/fleet/new?vehicleId=${vehicle.id}`}>Add Fleet Unit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/bookings/new?vehicleId=${vehicle.id}`}>Create Booking</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/vehicles">Back to Vehicle Types</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Fleet Inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counts come from physical units in Rental Fleet. Availability for dates uses those units.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Units</p>
              <p className="mt-1 text-2xl font-bold">{vehicle.fleetSnapshot.totalUnits}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Units</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{vehicle.fleetSnapshot.availableUnits}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booked Units</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{bookedUnits}</p>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={`/admin/fleet?vehicleId=${vehicle.id}`}>Manage fleet units</Link>
            </Button>
          </div>
        </section>

        <RentalBookingCalendar lockedVehicleId={vehicle.id} />

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Vehicle Type & Specifications</h2>
          <div className="max-w-md">
            <Label className="mb-1.5 block">Vehicle Type</Label>
            <Select value={vehicleTypeId || "none"} onValueChange={(value) => setVehicleTypeId(value === "none" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No type (legacy)</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5">
            <VehicleTemplateFieldsForm
              fields={templateFields}
              selectedIds={selectedTemplateFieldIds}
              valueOverrides={templateValueOverrides}
              onChangeSelected={setSelectedTemplateFieldIds}
              onChangeOverrides={setTemplateValueOverrides}
            />
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Custom Fields</h3>
            <VehicleCustomFieldsForm fields={customFields} onChange={setCustomFields} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Vehicle Details</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Detail sections shown on the rental vehicle page.
          </p>
          <VehicleDetailsEditor
            value={vehicleDetails}
            onChange={setVehicleDetails}
            bodyType={vehicle.bodyType}
            listingPurpose="rental"
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Rental Options</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Select options available during customer checkout.
          </p>
          <VehicleRentalOptionsChecklist
            options={rentalOptions}
            selectedIds={selectedRentalOptionIds}
            onChange={setSelectedRentalOptionIds}
          />
        </section>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/vehicles">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Rental Fleet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
