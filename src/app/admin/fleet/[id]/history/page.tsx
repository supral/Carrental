import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FleetVehicleHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const unit = await prisma.fleetVehicle.findUnique({
    where: { id },
    include: {
      vehicle: { select: { make: true, model: true, year: true } },
      rentalHistory: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!unit) notFound();

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Rental Fleet", href: "/admin/fleet" },
          { label: "History" },
        ]}
      />
      <div className="mb-6">
          <h1 className="text-2xl font-bold">
          Rental History — {unit.fleetNumber}
        </h1>
        <p className="text-muted-foreground">
          Completed rentals for this physical unit.{" "}
          <Link
            href={`/admin/fleet/type/${unit.vehicleId}`}
            className="text-primary hover:underline"
          >
            View all units of this type
          </Link>
        </p>
      </div>

      {unit.rentalHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed rentals yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Pickup</th>
                <th className="px-3 py-2">Return</th>
                <th className="px-3 py-2">KM</th>
                <th className="px-3 py-2">Charges</th>
                <th className="px-3 py-2">Damage</th>
                <th className="px-3 py-2">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {unit.rentalHistory.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/bookings/${row.bookingId}`}
                      className="text-primary hover:underline"
                    >
                      {row.customerName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {row.pickupAt ? format(row.pickupAt, "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.returnAt ? format(row.returnAt, "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.kmOut ?? "—"} → {row.kmIn ?? "—"}
                  </td>
                  <td className="px-3 py-2">{formatPrice(row.totalChargesCents / 100)}</td>
                  <td className="px-3 py-2 max-w-[12rem] truncate">{row.damageNotes ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.agreementPdfUrl ? (
                      <a href={row.agreementPdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
