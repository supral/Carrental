import * as XLSX from "xlsx";
import type { AnalyticsGroupBy, RentalBreakdownRow, RentalMetricSummary } from "@/lib/admin/rental-analytics";
import { formatPrice } from "@/lib/utils";

export function breakdownToExportRows(groupBy: AnalyticsGroupBy, rows: RentalBreakdownRow[]) {
  return rows.map((row) => {
    const base: Record<string, string | number> = {
      [groupLabel(groupBy)]: row.label,
      Revenue: Number((row.revenueCents / 100).toFixed(2)),
      Bookings: row.bookings,
      "Rental Days": row.rentalDays,
      "Average Booking Value": Number((row.averageBookingValueCents / 100).toFixed(2)),
      "Occupancy Rate %": row.occupancyRate,
      "Cancellation Rate %": row.cancellationRate,
    };
    if (row.units != null) base.Units = row.units;
    if (row.status) base.Status = row.status;
    return base;
  });
}

function groupLabel(groupBy: AnalyticsGroupBy) {
  switch (groupBy) {
    case "category":
      return "Vehicle Category";
    case "type":
      return "Vehicle Type";
    case "fleet":
      return "Fleet No";
    case "dealer":
      return "Dealer";
    case "customer":
      return "Customer";
  }
}

export function exportRowsToCsv(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = String(value ?? "");
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportRowsToExcel(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Report");
  XLSX.writeFile(book, filename);
}

export function exportRowsToPdf(
  title: string,
  metrics: RentalMetricSummary,
  rows: Record<string, string | number>[]
) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .meta { color: #555; margin-bottom: 16px; font-size: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .metric { border: 1px solid #ddd; padding: 8px; border-radius: 6px; }
    .metric strong { display: block; font-size: 14px; }
    .metric span { font-size: 11px; color: #666; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated ${new Date().toLocaleString("en-AU")}</p>
  <div class="metrics">
    <div class="metric"><span>Total Revenue</span><strong>${escapeHtml(formatPrice(metrics.totalRevenueCents / 100))}</strong></div>
    <div class="metric"><span>Total Bookings</span><strong>${metrics.totalBookings}</strong></div>
    <div class="metric"><span>Utilization</span><strong>${metrics.utilizationRate}%</strong></div>
  </div>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td>${escapeHtml(String(row[h] ?? ""))}</td>`).join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
