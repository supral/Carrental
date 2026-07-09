import { TemplateFieldInputType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type VehicleSpecField = {
  name: string;
  value: string;
  inputType: TemplateFieldInputType;
  sortOrder: number;
  group?: string;
};

export type VehicleSpecGroup = {
  group: string;
  fields: VehicleSpecField[];
};

export type TemplateFieldValueInput = {
  templateFieldId: string;
  value: string;
};

export type CustomFieldInput = {
  id?: string;
  name: string;
  inputType: TemplateFieldInputType;
  value: string;
  sortOrder: number;
  group: string;
};

function formatSpecValue(value: string | null | undefined, inputType: TemplateFieldInputType): string {
  if (value == null || value === "") return "—";
  if (inputType === TemplateFieldInputType.BOOLEAN) {
    return value === "true" ? "Yes" : value === "false" ? "No" : value;
  }
  return value;
}

export function groupSpecFields(fields: VehicleSpecField[]): VehicleSpecGroup[] {
  const byGroup = new Map<string, VehicleSpecField[]>();

  for (const field of fields) {
    const group = field.group ?? "Specifications";
    const list = byGroup.get(group) ?? [];
    list.push(field);
    byGroup.set(group, list);
  }

  return [...byGroup.entries()]
    .map(([group, groupFields]) => ({
      group,
      fields: groupFields.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

export async function getVehicleSpecGroups(vehicleId: string): Promise<VehicleSpecGroup[]> {
  const [templateValues, customFields] = await Promise.all([
    prisma.vehicleTemplateValue.findMany({
      where: { vehicleId },
      include: { templateField: true },
    }),
    prisma.vehicleCustomField.findMany({
      where: { vehicleId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const fields: (VehicleSpecField & { group: string })[] = [
    ...templateValues.map((row) => {
      const raw = row.value?.trim() || row.templateField.defaultValue?.trim() || "";
      return {
        name: row.templateField.name,
        value: raw
          ? formatSpecValue(raw, row.templateField.inputType)
          : "Included",
        inputType: row.templateField.inputType,
        sortOrder: row.templateField.sortOrder,
        group: row.templateField.group,
      };
    }),
    ...customFields.map((row) => ({
      name: row.name,
      value: formatSpecValue(row.value, row.inputType),
      inputType: row.inputType,
      sortOrder: row.sortOrder,
      group: row.group,
    })),
  ].filter((field) => field.value !== "—");

  return groupSpecFields(fields);
}

export async function saveVehicleTemplateValues(
  vehicleId: string,
  values: TemplateFieldValueInput[]
) {
  const incomingIds = values.map((entry) => entry.templateFieldId);

  if (incomingIds.length === 0) {
    await prisma.vehicleTemplateValue.deleteMany({ where: { vehicleId } });
  } else {
    await prisma.vehicleTemplateValue.deleteMany({
      where: { vehicleId, templateFieldId: { notIn: incomingIds } },
    });
  }

  for (const entry of values) {
    if (!entry.templateFieldId) continue;
    await prisma.vehicleTemplateValue.upsert({
      where: {
        vehicleId_templateFieldId: {
          vehicleId,
          templateFieldId: entry.templateFieldId,
        },
      },
      create: {
        vehicleId,
        templateFieldId: entry.templateFieldId,
        value: entry.value,
      },
      update: { value: entry.value },
    });
  }
}

export async function saveVehicleCustomFields(vehicleId: string, fields: CustomFieldInput[]) {
  const existing = await prisma.vehicleCustomField.findMany({
    where: { vehicleId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((f) => f.id));
  const incomingIds = new Set(fields.filter((f) => f.id).map((f) => f.id!));

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.vehicleCustomField.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const field of fields) {
    if (!field.name.trim()) continue;
    if (field.id && existingIds.has(field.id)) {
      await prisma.vehicleCustomField.update({
        where: { id: field.id },
        data: {
          name: field.name.trim(),
          inputType: field.inputType,
          value: field.value,
          sortOrder: field.sortOrder,
          group: field.group.trim() || "Vehicle Details",
        },
      });
    } else {
      await prisma.vehicleCustomField.create({
        data: {
          vehicleId,
          name: field.name.trim(),
          inputType: field.inputType,
          value: field.value,
          sortOrder: field.sortOrder,
          group: field.group.trim() || "Vehicle Details",
        },
      });
    }
  }
}
