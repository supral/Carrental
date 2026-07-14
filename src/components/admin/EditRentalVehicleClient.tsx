"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import VehicleTemplateFieldsForm, {
  templateSelectionsToInputs,
  templateValuesToSelectionState,
  type TemplateFieldDefinition,
  type TemplateFieldValueState,
} from "@/components/admin/VehicleTemplateFieldsForm";
import VehicleCustomFieldsForm from "@/components/admin/VehicleCustomFieldsForm";
import VehicleImageUpload from "@/components/admin/VehicleImageUpload";
import RentalCardFeaturesForm from "@/components/admin/RentalCardFeaturesForm";
import { updateRentalVehicleType } from "@/lib/admin/actions";
import { getVehicleTypeWithTemplate } from "@/lib/admin/vehicle-type-actions";
import type { FleetAvailability } from "@/lib/rentals/fleet-inventory";
import type { CustomFieldInput } from "@/lib/vehicles/vehicle-specs-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingLabel } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleTypeOption {
  id: string;
  name: string;
}

interface EditRentalVehicleClientProps {
  vehicle: {
    id: string;
    title: string;
    price: number;
    features: string[];
    imageUrls: string[];
    vehicleTypeId: string | null;
    fleetSnapshot: FleetAvailability;
    templateValues: TemplateFieldValueState;
    customFields: CustomFieldInput[];
  };
  vehicleTypes: VehicleTypeOption[];
}

export default function EditRentalVehicleClient({
  vehicle,
  vehicleTypes,
}: EditRentalVehicleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState(vehicle.title);
  const [price, setPrice] = useState(vehicle.price);
  const [features, setFeatures] = useState<string[]>(vehicle.features);
  const [images, setImages] = useState<string[]>(vehicle.imageUrls);
  const [imageError, setImageError] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [vehicleTypeId, setVehicleTypeId] = useState(vehicle.vehicleTypeId ?? "");
  const [selectedTemplateFieldIds, setSelectedTemplateFieldIds] = useState<string[]>([]);
  const [templateValueOverrides, setTemplateValueOverrides] = useState<TemplateFieldValueState>({});
  const [templateFields, setTemplateFields] = useState<TemplateFieldDefinition[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>(vehicle.customFields);

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
    setImageError("");

    if (images.length === 0) {
      setImageError("Add at least one image");
      return;
    }

    startTransition(async () => {
      try {
        await updateRentalVehicleType(vehicle.id, {
          title,
          price,
          imageUrls: images,
          features,
          vehicleTypeId: vehicleTypeId || null,
          templateValues: templateSelectionsToInputs(
            templateFields,
            selectedTemplateFieldIds,
            templateValueOverrides
          ),
          customFields,
        });
        router.push("/admin/vehicles");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save vehicle type");
      }
    });
  };

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
          <p className="text-muted-foreground">
            {vehicle.fleetSnapshot.totalUnits} fleet unit
            {vehicle.fleetSnapshot.totalUnits === 1 ? "" : "s"} · manage cars in Rental Fleet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/admin/fleet/new?vehicleId=${vehicle.id}`}>Add Fleet Unit</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/vehicles">Back</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Listing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Listing title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Daily rate (AUD)</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Type image</h2>
          <VehicleImageUpload
            images={images}
            onChange={setImages}
            onUploadingChange={setUploadingImages}
            error={imageError}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <RentalCardFeaturesForm features={features} onChange={setFeatures} />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Specifications</h2>
          <div className="max-w-md">
            <Label className="mb-1.5 block">Specification template</Label>
            <Select
              value={vehicleTypeId || "none"}
              onValueChange={(value) => setVehicleTypeId(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
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
            <h3 className="mb-3 text-sm font-semibold">Custom fields</h3>
            <VehicleCustomFieldsForm fields={customFields} onChange={setCustomFields} />
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/vehicles">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={isPending || uploadingImages}>
            {isPending ? <LoadingLabel label="Saving..." /> : "Save Vehicle Type"}
          </Button>
        </div>
      </div>
    </div>
  );
}
