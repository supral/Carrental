"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateFieldInputType } from "@prisma/client";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  saveVehicleTypeTemplateFields,
  updateVehicleType,
  type TemplateFieldInput,
} from "@/lib/admin/vehicle-type-actions";

type VehicleTypeWithTemplate = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  templateFields: {
    id: string;
    name: string;
    inputType: TemplateFieldInputType;
    required: boolean;
    sortOrder: number;
    group: string;
    defaultValue: string | null;
  }[];
};

const INPUT_TYPES = [
  { value: TemplateFieldInputType.TEXT, label: "Text" },
  { value: TemplateFieldInputType.NUMBER, label: "Number" },
  { value: TemplateFieldInputType.TEXTAREA, label: "Textarea" },
  { value: TemplateFieldInputType.BOOLEAN, label: "Boolean" },
];

export default function VehicleTypeEditorClient({ vehicleType }: { vehicleType: VehicleTypeWithTemplate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState(vehicleType.name);
  const [description, setDescription] = useState(vehicleType.description ?? "");
  const [icon, setIcon] = useState(vehicleType.icon ?? "");
  const [fields, setFields] = useState<TemplateFieldInput[]>(
    vehicleType.templateFields.map((field) => ({
      id: field.id,
      name: field.name,
      inputType: field.inputType,
      required: field.required,
      sortOrder: field.sortOrder,
      group: field.group,
      defaultValue: field.defaultValue,
    }))
  );

  const addField = () => {
    setFields((current) => [
      ...current,
      {
        name: "",
        inputType: TemplateFieldInputType.TEXT,
        required: false,
        sortOrder: current.length,
        group: "Specifications",
        defaultValue: null,
      },
    ]);
  };

  const updateField = (index: number, patch: Partial<TemplateFieldInput>) => {
    setFields((current) =>
      current.map((field, i) => (i === index ? { ...field, ...patch } : field))
    );
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const copy = [...fields];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    setFields(copy.map((field, sortOrder) => ({ ...field, sortOrder })));
  };

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      try {
        await updateVehicleType(vehicleType.id, {
          name,
          description: description || null,
          icon: icon || null,
        });
        await saveVehicleTypeTemplateFields(
          vehicleType.id,
          fields.map((field, index) => ({ ...field, sortOrder: index }))
        );
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
          { label: "Vehicle Types", href: "/admin/vehicle-types" },
          { label: vehicleType.name },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit Vehicle Type</h1>
          <p className="text-muted-foreground">Manage template fields for {vehicleType.name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/vehicle-types">Back</Link>
        </Button>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Type Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Detail Template Fields</h2>
              <p className="text-sm text-muted-foreground">
                Fields auto-loaded when this type is selected on a vehicle.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addField}>
              <Plus className="mr-1 h-4 w-4" />
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id ?? `new-${index}`} className="rounded-lg border border-border p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <Label className="mb-1.5 block">Field Name</Label>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Default Value</Label>
                    <Input
                      value={field.defaultValue ?? ""}
                      onChange={(e) => updateField(index, { defaultValue: e.target.value || null })}
                      placeholder="e.g. 200mm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Input Type</Label>
                    <Select
                      value={field.inputType}
                      onValueChange={(value) =>
                        updateField(index, { inputType: value as TemplateFieldInputType })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INPUT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Group</Label>
                    <Input
                      value={field.group}
                      onChange={(e) => updateField(index, { group: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateField(index, { required: checked === true })
                        }
                      />
                      Required
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveField(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveField(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeField(index)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Vehicle Type"}
          </Button>
        </div>
      </div>
    </div>
  );
}
