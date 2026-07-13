import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalReportsClient from "@/components/admin/RentalReportsClient";
import {
  getRentalAnalyticsFilterOptions,
  getRentalBreakdown,
  getRentalMetricSummary,
} from "@/lib/admin/rental-analytics";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [filterOptions, metrics, rows] = await Promise.all([
    getRentalAnalyticsFilterOptions(),
    getRentalMetricSummary(),
    getRentalBreakdown("fleet"),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Reports" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
        <p className="text-muted-foreground">
          Group rental performance by category, vehicle type, fleet unit, dealer, or customer.
        </p>
      </div>
      <RentalReportsClient
        initialGroupBy="fleet"
        initialMetrics={metrics}
        initialRows={rows}
        filterOptions={filterOptions}
      />
    </div>
  );
}
