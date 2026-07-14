import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalDashboardClient from "@/components/admin/RentalDashboardClient";
import RentalOpsDashboardCards from "@/components/admin/RentalOpsDashboardCards";
import {
  getRentalAnalyticsFilterOptions,
  getRentalDashboardAnalytics,
} from "@/lib/admin/rental-analytics";
import { getOpsDashboardStats } from "@/lib/admin/rental-agreement-actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [initialData, filterOptions, opsStats] = await Promise.all([
    getRentalDashboardAnalytics("category"),
    getRentalAnalyticsFilterOptions(),
    getOpsDashboardStats().catch(() => null),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Overview" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Rental operations and analytics by vehicle category, vehicle type, or fleet unit.
        </p>
      </div>
      {opsStats && <RentalOpsDashboardCards stats={opsStats} />}
      <RentalDashboardClient initialData={initialData} filterOptions={filterOptions} />
    </div>
  );
}
