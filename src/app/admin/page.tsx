import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalDashboardClient from "@/components/admin/RentalDashboardClient";
import {
  getRentalAnalyticsFilterOptions,
  getRentalDashboardAnalytics,
} from "@/lib/admin/rental-analytics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [initialData, filterOptions] = await Promise.all([
    getRentalDashboardAnalytics("category"),
    getRentalAnalyticsFilterOptions(),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Overview" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Rental analytics by vehicle category, vehicle type, or fleet unit.
        </p>
      </div>
      <RentalDashboardClient initialData={initialData} filterOptions={filterOptions} />
    </div>
  );
}
