"use client";

import { useMemo, useState, useTransition } from "react";
import { RentalBookingStatus, RentalPaymentStatus } from "@prisma/client";
import { FileSpreadsheet, FileText } from "lucide-react";
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
import { formatPrice } from "@/lib/utils";
import {
  getRentalBreakdown,
  getRentalMetricSummary,
  type AnalyticsGroupBy,
  type RentalAnalyticsFilters,
  type RentalBreakdownRow,
  type RentalMetricSummary,
} from "@/lib/admin/rental-analytics";
import {
  breakdownToExportRows,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToPdf,
} from "@/lib/admin/rental-analytics-export";

type FilterOptions = {
  categories: string[];
  vehicles: { id: string; label: string }[];
  fleet: { id: string; label: string }[];
  dealers: { id: string; name: string }[];
};

const GROUP_OPTIONS: { value: AnalyticsGroupBy; label: string }[] = [
  { value: "category", label: "Vehicle Category" },
  { value: "type", label: "Vehicle Type" },
  { value: "fleet", label: "Fleet Vehicle" },
  { value: "dealer", label: "Dealer" },
  { value: "customer", label: "Customer" },
];

const BOOKING_STATUSES: Array<RentalBookingStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "RESERVED",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

const PAYMENT_STATUSES: Array<RentalPaymentStatus | "ALL"> = [
  "ALL",
  "UNPAID",
  "PAID",
  "FAILED",
  "REFUNDED",
];

export default function RentalReportsClient({
  initialGroupBy,
  initialMetrics,
  initialRows,
  filterOptions,
}: {
  initialGroupBy: AnalyticsGroupBy;
  initialMetrics: RentalMetricSummary;
  initialRows: RentalBreakdownRow[];
  filterOptions: FilterOptions;
}) {
  const [pending, startTransition] = useTransition();
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(initialGroupBy);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [rows, setRows] = useState(initialRows);
  const [filters, setFilters] = useState<RentalAnalyticsFilters>({});

  const exportRows = useMemo(() => breakdownToExportRows(groupBy, rows), [groupBy, rows]);
  const primaryColumn = GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ?? "Group";

  function runReport(nextGroup: AnalyticsGroupBy, nextFilters: RentalAnalyticsFilters) {
    startTransition(async () => {
      const [nextMetrics, nextRows] = await Promise.all([
        getRentalMetricSummary(nextFilters),
        getRentalBreakdown(nextGroup, nextFilters),
      ]);
      setGroupBy(nextGroup);
      setMetrics(nextMetrics);
      setRows(nextRows);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold">Group By</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GROUP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={groupBy === option.value ? "default" : "outline"}
              disabled={pending}
              onClick={() => runReport(option.value, filters)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="From">
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || null }))}
            />
          </FilterField>
          <FilterField label="To">
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || null }))}
            />
          </FilterField>
          <FilterField label="Booking status">
            <Select
              value={filters.bookingStatus ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  bookingStatus: value as RentalBookingStatus | "ALL",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Payment status">
            <Select
              value={filters.paymentStatus ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentStatus: value as RentalPaymentStatus | "ALL",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Vehicle category">
            <Select
              value={filters.category ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, category: value === "ALL" ? null : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {filterOptions.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Vehicle type">
            <Select
              value={filters.vehicleId ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, vehicleId: value === "ALL" ? null : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {filterOptions.vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Fleet vehicle">
            <Select
              value={filters.fleetVehicleId ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  fleetVehicleId: value === "ALL" ? null : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {filterOptions.fleet.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Dealer">
            <Select
              value={filters.dealerId ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, dealerId: value === "ALL" ? null : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {filterOptions.dealers.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id}>
                    {dealer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Customer email">
            <Input
              type="email"
              placeholder="customer@email.com"
              value={filters.customerEmail ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, customerEmail: e.target.value || null }))
              }
            />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => runReport(groupBy, filters)}>
            {pending ? "Generating..." : "Generate report"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || exportRows.length === 0}
            onClick={() => exportRowsToCsv(exportRows, `rental-report-${groupBy}.csv`)}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || exportRows.length === 0}
            onClick={() => exportRowsToExcel(exportRows, `rental-report-${groupBy}.xlsx`)}
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || exportRows.length === 0}
            onClick={() =>
              exportRowsToPdf(`Rental Report — ${primaryColumn}`, metrics, exportRows)
            }
          >
            <FileText className="mr-1.5 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryChip label="Revenue" value={formatPrice(metrics.totalRevenueCents / 100)} />
        <SummaryChip label="Bookings" value={String(metrics.totalBookings)} />
        <SummaryChip label="Utilization" value={`${metrics.utilizationRate}%`} />
        <SummaryChip
          label="Avg booking"
          value={formatPrice(metrics.averageRevenuePerBookingCents / 100)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">{primaryColumn}</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
              <th className="px-4 py-3 font-semibold">Bookings</th>
              <th className="px-4 py-3 font-semibold">Rental Days</th>
              <th className="px-4 py-3 font-semibold">Avg Booking Value</th>
              <th className="px-4 py-3 font-semibold">Occupancy</th>
              <th className="px-4 py-3 font-semibold">Cancel Rate</th>
              {(groupBy === "type" || groupBy === "category") && (
                <th className="px-4 py-3 font-semibold">Units</th>
              )}
              {groupBy === "fleet" && <th className="px-4 py-3 font-semibold">Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No booking data for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">{formatPrice(row.revenueCents / 100)}</td>
                  <td className="px-4 py-3">{row.bookings}</td>
                  <td className="px-4 py-3">{row.rentalDays}</td>
                  <td className="px-4 py-3">{formatPrice(row.averageBookingValueCents / 100)}</td>
                  <td className="px-4 py-3">{row.occupancyRate}%</td>
                  <td className="px-4 py-3">{row.cancellationRate}%</td>
                  {(groupBy === "type" || groupBy === "category") && (
                    <td className="px-4 py-3">{row.units ?? "—"}</td>
                  )}
                  {groupBy === "fleet" && <td className="px-4 py-3">{row.status ?? "—"}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
