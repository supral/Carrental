import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminFeatureNotice from "@/components/admin/AdminFeatureNotice";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [vehicleCount, dealerCount, userCount, soldVehicles, leads] = await Promise.all([
    prisma.vehicle.count(),
    prisma.dealer.count(),
    prisma.user.count(),
    prisma.vehicle.findMany({ where: { status: "SOLD" }, select: { price: true } }),
    prisma.lead.count(),
  ]);

  const revenue = soldVehicles.reduce((s, v) => s + v.price, 0);

  const reports = [
    { title: "Listing Report", description: `${vehicleCount} total listings across all categories`, icon: FileText },
    { title: "Dealer Report", description: `${dealerCount} registered dealers`, icon: FileSpreadsheet },
    { title: "User Report", description: `${userCount} platform users`, icon: FileText },
    { title: "Revenue Report", description: `${formatPrice(revenue)} total revenue from ${soldVehicles.length} sales`, icon: FileSpreadsheet },
    { title: "Leads Report", description: `${leads} total enquiries received`, icon: FileText },
  ];

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Reports" }]} />
      <h1 className="text-2xl font-bold mb-6">Reports & Exports</h1>
      <AdminFeatureNotice
        description="Summary stats are live below. CSV, Excel, and PDF export buttons will be enabled in the next release."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div key={report.title} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <report.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{report.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" disabled>
                    <FileText className="h-4 w-4" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <FileText className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
