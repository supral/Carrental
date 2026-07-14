import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalOpsDashboardCards from "@/components/admin/RentalOpsDashboardCards";
import { Button } from "@/components/ui/button";
import { getOpsDashboardStats } from "@/lib/admin/rental-agreement-actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const opsStats = await getOpsDashboardStats().catch(() => null);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Overview" }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Today&apos;s rental movements and live operations snapshot.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/reports">Open Reports</Link>
        </Button>
      </div>
      {opsStats ? (
        <RentalOpsDashboardCards stats={opsStats} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          Could not load operations stats. Check your permissions or try again.
        </div>
      )}
    </div>
  );
}
