"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateFieldInputType } from "@prisma/client";

export type TemplateFieldDefinition = {
  id: string;
  name: string;
  inputType: TemplateFieldInputType;
  required: boolean;
  sortOrder: number;
  group: string;
  defaultValue?: string | null;
};

export type TemplateFieldValueState = Record<string, string>;

interface VehicleTemplateFieldsFormProps {
  fields: TemplateFieldDefinition[];
  selectedIds: string[];
  valueOverrides: TemplateFieldValueState;
  onChangeSelected: (ids: string[]) => void;
  onChangeOverrides: (values: TemplateFieldValueState) => void;
}

export default function VehicleTemplateFieldsForm({
  fields,
  selectedIds,
  valueOverrides,
  onChangeSelected,
  onChangeOverrides,
}: VehicleTemplateFieldsFormProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a vehicle type to load specification fields, or add fields under Vehicle Types.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean, field: TemplateFieldDefinition) => {
    if (checked) {
      onChangeSelected([...selectedIds, id]);
      if (!valueOverrides[id] && field.defaultValue) {
        onChangeOverrides({ ...valueOverrides, [id]: field.defaultValue });
      }
    } else {
      onChangeSelected(selectedIds.filter((rowId) => rowId !== id));
      const next = { ...valueOverrides };
      delete next[id];
      onChangeOverrides(next);
    }
  };

  const groups = [...new Set(fields.map((field) => field.group || "Specifications"))];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tick the specifications to include on this vehicle&apos;s details page. Default values come from the vehicle type template — override only when this unit differs.
      </p>

      {groups.map((group) => {
        const groupFields = fields
          .filter((field) => (field.group || "Specifications") === group)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <div key={group}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h3>
            <div className="space-y-2">
              {groupFields.map((field) => {
                const checked = selectedIds.includes(field.id);
                const override = valueOverrides[field.id] ?? "";
                const effectiveValue = override || field.defaultValue || "";

                return (
                  <div
                    key={field.id}
                    className="rounded-lg border border-border p-3 hover:bg-muted/40"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggle(field.id, value === true, field)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{field.name}</span>
                          {field.defaultValue && (
                            <Badge variant="outline" className="font-normal">
                              Default: {field.defaultValue}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>

                    {checked && (
                      <div className="mt-3 ml-7">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Value for this vehicle {field.defaultValue ? "(optional override)" : ""}
                        </Label>
                        <Input
                          value={override}
                          placeholder={field.defaultValue ?? `e.g. ${field.name}`}
                          onChange={(e) =>
                            onChangeOverrides({ ...valueOverrides, [field.id]: e.target.value })
                          }
                        />
                        {field.defaultValue && !override && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Will display as: {field.defaultValue}
                          </p>
                        )}
                        {!field.defaultValue && !effectiveValue && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Listed as an included feature without a specific value.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function templateSelectionsToInputs(
  fields: TemplateFieldDefinition[],
  selectedIds: string[],
  valueOverrides: TemplateFieldValueState
): { templateFieldId: string; value: string }[] {
  const byId = new Map(fields.map((field) => [field.id, field]));

  return selectedIds.map((templateFieldId) => {
    const field = byId.get(templateFieldId);
    const override = valueOverrides[templateFieldId]?.trim();
    const value = override || field?.defaultValue?.trim() || "";
    return { templateFieldId, value };
  });
}

/** Build selection state when editing an existing vehicle. */
export function templateValuesToSelectionState(
  storedValues: TemplateFieldValueState,
  fields: TemplateFieldDefinition[]
): { selectedIds: string[]; valueOverrides: TemplateFieldValueState } {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const selectedIds = Object.keys(storedValues);
  const valueOverrides: TemplateFieldValueState = {};

  for (const id of selectedIds) {
    const stored = storedValues[id]?.trim() ?? "";
    const field = byId.get(id);
    const defaultVal = field?.defaultValue?.trim() ?? "";
    if (stored && stored !== defaultVal) {
      valueOverrides[id] = stored;
    }
  }

  return { selectedIds, valueOverrides };
}
