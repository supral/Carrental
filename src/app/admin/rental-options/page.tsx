import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/admin/permissions";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalOptionsClient from "@/components/admin/RentalOptionsClient";
import { listRentalOptions } from "@/lib/admin/rental-option-actions";

export const dynamic = "force-dynamic";

export default async function AdminRentalOptionsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  if (!hasPermission(session.user.role, "vehicles:view")) redirect("/admin");

  const options = await listRentalOptions();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Rental Options" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rental Options</h1>
        <p className="text-muted-foreground">
          Manage insurance, extras, and accessories available during rental checkout.
        </p>
      </div>
      <RentalOptionsClient initialOptions={options} />
    </div>
  );
}
