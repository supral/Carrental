import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalDashboardClient from "@/components/admin/RentalDashboardClient";
import RentalReportsClient from "@/components/admin/RentalReportsClient";
import {
  getRentalAnalyticsFilterOptions,
  getRentalDashboardAnalytics,
  getRentalBreakdown,
} from "@/lib/admin/rental-analytics";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  // One analytics payload covers charts + metric cards (avoids duplicate metric queries).
  const [filterOptions, dashboardData, rows] = await Promise.all([
    getRentalAnalyticsFilterOptions(),
    getRentalDashboardAnalytics("category"),
    getRentalBreakdown("fleet"),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Reports" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Revenue, utilization, and exportable breakdowns by category, type, fleet, dealer, or
          customer. Day-to-day pickup/return lists stay on the Dashboard.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Performance charts</h2>
        <RentalDashboardClient initialData={dashboardData} filterOptions={filterOptions} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Detailed reports & exports</h2>
        <RentalReportsClient
          initialGroupBy="fleet"
          initialMetrics={dashboardData.metrics}
          initialRows={rows}
          filterOptions={filterOptions}
        />
      </section>
    </div>
  );
}
