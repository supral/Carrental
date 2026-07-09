"use client";

import { TemplateFieldInputType } from "@prisma/client";
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
import { Plus, Trash2 } from "lucide-react";
import type { CustomFieldInput } from "@/lib/vehicles/vehicle-specs-service";

const INPUT_TYPES = [
  { value: TemplateFieldInputType.TEXT, label: "Text" },
  { value: TemplateFieldInputType.NUMBER, label: "Number" },
  { value: TemplateFieldInputType.TEXTAREA, label: "Textarea" },
  { value: TemplateFieldInputType.BOOLEAN, label: "Boolean" },
];

const textareaClass =
  "flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface VehicleCustomFieldsFormProps {
  fields: CustomFieldInput[];
  onChange: (fields: CustomFieldInput[]) => void;
}

export default function VehicleCustomFieldsForm({ fields, onChange }: VehicleCustomFieldsFormProps) {
  const addField = () => {
    onChange([
      ...fields,
      {
        name: "",
        inputType: TemplateFieldInputType.TEXT,
        value: "",
        sortOrder: fields.length,
        group: "Vehicle Details",
      },
    ]);
  };

  const updateField = (index: number, patch: Partial<CustomFieldInput>) => {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id ?? `new-${index}`} className="rounded-lg border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Field Name</Label>
              <Input
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                placeholder="e.g. Bull Bar"
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
            <div>
              <Label className="mb-1.5 block">Value</Label>
              {field.inputType === TemplateFieldInputType.TEXTAREA ? (
                <textarea
                  className={textareaClass}
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                />
              ) : field.inputType === TemplateFieldInputType.BOOLEAN ? (
                <Select
                  value={field.value || "false"}
                  onValueChange={(value) => updateField(index, { value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.inputType === TemplateFieldInputType.NUMBER ? "number" : "text"}
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                />
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => removeField(index)}>
              <Trash2 className="mr-1 h-4 w-4 text-red-600" />
              Remove
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addField}>
        <Plus className="mr-1 h-4 w-4" />
        Add Custom Field
      </Button>
    </div>
  );
}
