"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuditAction, VehicleStatus } from "@prisma/client";
import { hasPermission } from "@/lib/admin/permissions";
import { parseSpreadsheet, getDetectedColumns } from "@/lib/admin/vehicle-import/parse-file";
import { mapImportRow } from "@/lib/admin/vehicle-import/map-row";
import {
  mappedImportToVehicleData,
  mappedImportToVehicleUpdateData,
} from "@/lib/admin/vehicle-import/persist";
import { assignSeasonOfferToVehicle } from "@/lib/vehicles/vehicle-offers-server";
import type { ImportPreviewResult, ImportRunResult, MappedImportVehicle } from "@/lib/admin/vehicle-import/types";

const EXISTING_IMPORT_VEHICLE_SELECT = { id: true, status: true } as const;

type ExistingImportVehicle = { id: string; status: VehicleStatus };

async function findExistingImportVehicle(
  dealerId: string,
  data: MappedImportVehicle
): Promise<ExistingImportVehicle | null> {
  const byVehicleNumber = await prisma.vehicle.findFirst({
    where: {
      dealerId,
      vehicleNumber: data.vehicleNumber,
      listingPurpose: "SALE",
    },
    select: EXISTING_IMPORT_VEHICLE_SELECT,
  });
  if (byVehicleNumber) return byVehicleNumber;

  if (data.stockId) {
    const byLegacyStockNumber = await prisma.vehicle.findFirst({
      where: {
        dealerId,
        vehicleNumber: data.stockId,
        listingPurpose: "SALE",
      },
      select: EXISTING_IMPORT_VEHICLE_SELECT,
    });
    if (byLegacyStockNumber) return byLegacyStockNumber;

    const byStockCustomField = await prisma.vehicle.findFirst({
      where: {
        dealerId,
        listingPurpose: "SALE",
        customFields: { some: { name: "Stock ID", value: data.stockId } },
      },
      select: EXISTING_IMPORT_VEHICLE_SELECT,
    });
    if (byStockCustomField) return byStockCustomField;
  }

  return null;
}

const SOLD_ALREADY_IMPORTED_MESSAGE =
  "Previously imported and already sold — filtered out.";

function resolveExistingImportVehicle(
  data: MappedImportVehicle,
  lookup: Map<string, ExistingImportVehicle>
): ExistingImportVehicle | null {
  const byVehicleNumber = lookup.get(`vin:${data.vehicleNumber}`);
  if (byVehicleNumber) return byVehicleNumber;

  if (data.stockId) {
    const byLegacyStockNumber = lookup.get(`vin:${data.stockId}`);
    if (byLegacyStockNumber) return byLegacyStockNumber;

    const byStockCustomField = lookup.get(`stock:${data.stockId}`);
    if (byStockCustomField) return byStockCustomField;
  }

  return null;
}

async function buildExistingImportVehicleLookup(
  dealerId: string,
  rows: MappedImportVehicle[]
): Promise<Map<string, ExistingImportVehicle>> {
  const vehicleNumbers = new Set<string>();
  const stockIds = new Set<string>();

  for (const row of rows) {
    if (row.vehicleNumber) vehicleNumbers.add(row.vehicleNumber);
    if (row.stockId) {
      stockIds.add(row.stockId);
      vehicleNumbers.add(row.stockId);
    }
  }

  if (vehicleNumbers.size === 0 && stockIds.size === 0) {
    return new Map();
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      dealerId,
      listingPurpose: "SALE",
      OR: [
        ...(vehicleNumbers.size > 0
          ? [{ vehicleNumber: { in: [...vehicleNumbers] } }]
          : []),
        ...(stockIds.size > 0
          ? [{ customFields: { some: { name: "Stock ID", value: { in: [...stockIds] } } } }]
          : []),
      ],
    },
    select: {
      ...EXISTING_IMPORT_VEHICLE_SELECT,
      vehicleNumber: true,
      customFields: {
        where: { name: "Stock ID" },
        select: { value: true },
      },
    },
  });

  const lookup = new Map<string, ExistingImportVehicle>();
  for (const vehicle of vehicles) {
    const entry = { id: vehicle.id, status: vehicle.status };
    lookup.set(`vin:${vehicle.vehicleNumber}`, entry);
    for (const field of vehicle.customFields) {
      lookup.set(`stock:${field.value}`, entry);
    }
  }

  return lookup;
}

async function requireImportAccess() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, "vehicles:manage")) throw new Error("Forbidden");
  return session.user;
}

async function readUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a CSV or Excel file to import.");
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("Only .csv, .xlsx, and .xls files are supported.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("File is too large. Maximum size is 15 MB.");
  }

  return file;
}

export async function previewVehicleImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireImportAccess();

  const dealerId = (formData.get("dealerId") as string | null)?.trim() ?? "";

  const file = await readUploadFile(formData);
  const buffer = await file.arrayBuffer();
  const rows = parseSpreadsheet(buffer);

  if (rows.length === 0) {
    throw new Error("No data rows found in the uploaded file.");
  }

  const defaultStatus =
    (formData.get("defaultStatus") as VehicleStatus | null) ?? VehicleStatus.ACTIVE;
  const defaultLocation = (formData.get("defaultLocation") as string | null)?.trim() || "Darwin, NT";

  const mapped = rows.map((row, index) =>
    mapImportRow(row, index + 2, { defaultStatus, defaultLocation })
  );

  const invalid = mapped.filter((result) => !result.ok);
  const mappedValid = mapped.filter((result) => result.ok).map((result) => result.data);

  const soldSkipped: { rowNumber: number; vehicleNumber?: string; errors: string[] }[] = [];
  let importable = mappedValid;

  if (dealerId) {
    const existingLookup = await buildExistingImportVehicleLookup(dealerId, mappedValid);
    importable = [];

    for (const data of mappedValid) {
      const existing = resolveExistingImportVehicle(data, existingLookup);
      if (existing?.status === VehicleStatus.SOLD) {
        soldSkipped.push({
          rowNumber: data.rowNumber,
          vehicleNumber: data.vehicleNumber,
          errors: [SOLD_ALREADY_IMPORTED_MESSAGE],
        });
        continue;
      }
      importable.push(data);
    }
  }

  return {
    totalRows: rows.length,
    validCount: importable.length,
    invalidCount: invalid.length,
    soldSkippedCount: soldSkipped.length,
    preview: importable.slice(0, 8),
    sampleErrors: invalid.slice(0, 8).map((result) => ({
      rowNumber: result.rowNumber,
      vehicleNumber: result.vehicleNumber,
      errors: result.errors,
    })),
    sampleSoldSkipped: soldSkipped.slice(0, 8),
    detectedColumns: getDetectedColumns(rows),
  };
}

export async function importVehiclesFromFile(
  formData: FormData,
  options: { updateExisting?: boolean } = {}
): Promise<ImportRunResult> {
  const user = await requireImportAccess();

  const dealerId = (formData.get("dealerId") as string | null)?.trim();
  if (!dealerId) throw new Error("Dealer is required.");

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, status: "APPROVED" },
    select: { id: true },
  });
  if (!dealer) throw new Error("Selected dealer was not found or is not approved.");

  const updateExisting =
    options.updateExisting ??
    ["true", "on", "1"].includes(String(formData.get("updateExisting") ?? "").toLowerCase());
  const defaultStatus =
    (formData.get("defaultStatus") as VehicleStatus | null) ?? VehicleStatus.ACTIVE;
  const defaultLocation = (formData.get("defaultLocation") as string | null)?.trim() || "Darwin, NT";
  const seasonOfferId = (formData.get("seasonOfferId") as string | null)?.trim() || null;

  if (seasonOfferId) {
    const offer = await prisma.seasonOffer.findFirst({
      where: { id: seasonOfferId, isEnabled: true },
      select: { id: true },
    });
    if (!offer) throw new Error("Selected offer was not found or is disabled.");
  }

  const file = await readUploadFile(formData);
  const buffer = await file.arrayBuffer();
  const rows = parseSpreadsheet(buffer);

  const result: ImportRunResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    soldSkipped: 0,
    errors: [],
  };

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const mapped = mapImportRow(rows[index], rowNumber, { defaultStatus, defaultLocation });

    if (!mapped.ok) {
      result.skipped += 1;
      result.errors.push({
        rowNumber,
        vehicleNumber: mapped.vehicleNumber,
        message: mapped.errors.join("; "),
      });
      continue;
    }

    const data = mapped.data;
    // Bulk dealer inventory imports use the status chosen in the import form so
    // listings appear on the marketplace when "Active" is selected.
    const status = defaultStatus ?? data.status;

    try {
      const existing = await findExistingImportVehicle(dealerId, data);

      if (existing?.status === VehicleStatus.SOLD) {
        result.skipped += 1;
        result.soldSkipped += 1;
        result.errors.push({
          rowNumber,
          vehicleNumber: data.vehicleNumber,
          message: SOLD_ALREADY_IMPORTED_MESSAGE,
        });
        continue;
      }

      if (existing && !updateExisting) {
        result.skipped += 1;
        result.errors.push({
          rowNumber,
          vehicleNumber: data.vehicleNumber,
          message: "Vehicle number already exists (enable update to overwrite).",
        });
        continue;
      }

      if (existing && updateExisting) {
        await prisma.$transaction(async (tx) => {
          await tx.vehicleImage.deleteMany({ where: { vehicleId: existing.id } });
          await tx.vehicleCustomField.deleteMany({ where: { vehicleId: existing.id } });

          await tx.vehicle.update({
            where: { id: existing.id },
            data: {
              ...mappedImportToVehicleUpdateData(data, status),
              vehicleNumber: data.vehicleNumber,
            },
          });
        });
        if (seasonOfferId) {
          await assignSeasonOfferToVehicle(existing.id, seasonOfferId);
        }
        result.updated += 1;
        continue;
      }

      const vehicle = await prisma.vehicle.create({
        data: mappedImportToVehicleData(data, dealerId, user.id, status),
      });

      if (seasonOfferId) {
        await assignSeasonOfferToVehicle(vehicle.id, seasonOfferId);
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.CREATE,
          entity: "Vehicle",
          entityId: vehicle.id,
          details: { source: "import", vehicleNumber: data.vehicleNumber, title: data.title },
        },
      });

      result.created += 1;
    } catch (error) {
      result.skipped += 1;
      result.errors.push({
        rowNumber,
        vehicleNumber: data.vehicleNumber,
        message: error instanceof Error ? error.message : "Import failed for this row.",
      });
    }
  }

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  revalidatePath("/admin/marketing/offers");
  revalidatePath("/vehicles");
  revalidatePath("/");

  return result;
}
