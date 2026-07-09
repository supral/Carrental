"use client";

import { useState, useTransition } from "react";
import { VehicleStatus } from "@prisma/client";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  importVehiclesFromFile,
  previewVehicleImport,
} from "@/lib/admin/vehicle-import-actions";
import type { ImportPreviewResult, ImportRunResult } from "@/lib/admin/vehicle-import/types";
import type { AssignableOfferOption } from "@/lib/admin/offer-actions";
import Link from "next/link";

type DealerOption = { id: string; name: string };

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: VehicleStatus.ACTIVE, label: "Active (live listings)" },
  { value: VehicleStatus.PENDING, label: "Pending review" },
  { value: VehicleStatus.DRAFT, label: "Draft" },
];

export default function VehicleImportPanel({
  dealers,
  assignableOffers = [],
  canPublishLive,
}: {
  dealers: DealerOption[];
  assignableOffers?: AssignableOfferOption[];
  canPublishLive: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dealerId, setDealerId] = useState(dealers[0]?.id ?? "");
  const [defaultStatus, setDefaultStatus] = useState<VehicleStatus>(
    canPublishLive ? VehicleStatus.ACTIVE : VehicleStatus.PENDING
  );
  const [defaultLocation, setDefaultLocation] = useState("Darwin, NT");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [seasonOfferId, setSeasonOfferId] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildFormData() {
    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("dealerId", dealerId);
    formData.append("defaultStatus", defaultStatus);
    formData.append("defaultLocation", defaultLocation);
    formData.append("updateExisting", String(updateExisting));
    if (seasonOfferId) formData.append("seasonOfferId", seasonOfferId);
    return formData;
  }

  function handlePreview() {
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const data = await previewVehicleImport(buildFormData());
        setPreview(data);
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : "Preview failed.");
      }
    });
  }

  function handleImport() {
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }
    if (!dealerId) {
      setError("Select a dealer for imported listings.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const data = await importVehiclesFromFile(buildFormData(), { updateExisting });
        setResult(data);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  if (dealers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an approved dealer before importing vehicle inventory.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="import-file">Inventory file (.csv, .xlsx)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="mt-1.5"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setFile(next);
                setPreview(null);
                setResult(null);
                setError(null);
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Supports dealer exports with listing title, VIN (vehicle number), stock ID, make/model/year, variant,
              series, transmission, fuel, drivetrain, body type, seats, doors, colours, odometer,
              registration, description, and image URLs.
            </p>
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {file.name}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Dealer</Label>
          <Select value={dealerId} onValueChange={setDealerId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select dealer" />
            </SelectTrigger>
            <SelectContent>
              {dealers.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Default listing status</Label>
          <Select
            value={defaultStatus}
            onValueChange={(value) => setDefaultStatus(value as VehicleStatus)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canPublishLive && (
            <p className="mt-1 text-xs text-muted-foreground">
              Imports will be saved as pending until a moderator approves them.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="default-location">Default location</Label>
          <Input
            id="default-location"
            className="mt-1.5"
            value={defaultLocation}
            onChange={(event) => setDefaultLocation(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={updateExisting}
              onCheckedChange={(checked) => setUpdateExisting(checked === true)}
            />
            Update existing stock numbers
          </label>
        </div>
        <div>
          <Label>Assign offer (optional)</Label>
          {assignableOffers.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              No offers yet.{" "}
              <Link href="/admin/marketing/offers" className="text-primary hover:underline">
                Create one
              </Link>{" "}
              to apply to imported vehicles.
            </p>
          ) : (
            <Select
              value={seasonOfferId || "_none"}
              onValueChange={(value) => setSeasonOfferId(value === "_none" ? "" : value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="No offer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No offer</SelectItem>
                {assignableOffers.map((offer) => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.label} · {offer.offerType} · {offer.discountLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Applies to every vehicle created or updated in this import.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={handlePreview} disabled={isPending || !file}>
          Preview mapping
        </Button>
        <Button type="button" onClick={handleImport} disabled={isPending || !file}>
          <Upload className="h-4 w-4" />
          {isPending ? "Importing..." : "Import vehicles"}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold">Import preview</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {preview.validCount} rows ready to import, {preview.invalidCount} invalid rows
              {preview.soldSkippedCount > 0
                ? `, ${preview.soldSkippedCount} already sold (filtered out)`
                : ""}{" "}
              out of {preview.totalRows} total.
            </p>
          </div>

          {preview.detectedColumns.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Detected columns: {preview.detectedColumns.slice(0, 12).join(", ")}
              {preview.detectedColumns.length > 12 ? "…" : ""}
            </p>
          )}

          {preview.preview.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">VIN</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Year</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3">Body</th>
                    <th className="py-2 pr-3">Fuel</th>
                    <th className="py-2 pr-3">Trans.</th>
                    <th className="py-2">Km</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{row.vehicleNumber}</td>
                      <td className="py-2 pr-3">{row.title}</td>
                      <td className="py-2 pr-3">{row.year}</td>
                      <td className="py-2 pr-3">${row.price.toLocaleString()}</td>
                      <td className="py-2 pr-3">{row.bodyType}</td>
                      <td className="py-2 pr-3">{row.fuelType}</td>
                      <td className="py-2 pr-3">{row.transmission}</td>
                      <td className="py-2">{row.mileage.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.sampleSoldSkipped.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Already sold (filtered out)</p>
              {preview.sampleSoldSkipped.map((item) => (
                <p key={`sold-${item.rowNumber}`} className="text-xs text-muted-foreground">
                  Row {item.rowNumber}
                  {item.vehicleNumber ? ` (${item.vehicleNumber})` : ""}: {item.errors.join("; ")}
                </p>
              ))}
              {preview.soldSkippedCount > preview.sampleSoldSkipped.length && (
                <p className="text-xs text-muted-foreground">
                  …and {preview.soldSkippedCount - preview.sampleSoldSkipped.length} more sold
                  vehicles filtered out
                </p>
              )}
            </div>
          )}

          {preview.sampleErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sample row issues</p>
              {preview.sampleErrors.map((item) => (
                <p key={item.rowNumber} className="text-xs text-muted-foreground">
                  Row {item.rowNumber}
                  {item.vehicleNumber ? ` (${item.vehicleNumber})` : ""}: {item.errors.join("; ")}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 text-green-900">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-semibold">Import complete</h3>
          </div>
          <p className="text-sm text-green-900/90">
            Created {result.created}, updated {result.updated}, skipped {result.skipped}
            {result.soldSkipped > 0 ? ` (${result.soldSkipped} already sold)` : ""}.
            {(result.created > 0 || result.updated > 0) && defaultStatus === VehicleStatus.ACTIVE && (
              <span> Active listings are now visible on Buy Cars and dealer sites.</span>
            )}
            {(result.created > 0 || result.updated > 0) && defaultStatus === VehicleStatus.PENDING && (
              <span> Pending listings need approval in Listing Verification before going live.</span>
            )}
          </p>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-900">Skipped rows</p>
              {result.errors.slice(0, 10).map((item) => (
                <p key={`${item.rowNumber}-${item.vehicleNumber}`} className="text-xs text-green-900/80">
                  Row {item.rowNumber}
                  {item.vehicleNumber ? ` (${item.vehicleNumber})` : ""}: {item.message}
                </p>
              ))}
              {result.errors.length > 10 && (
                <p className="text-xs text-green-900/80">
                  …and {result.errors.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
