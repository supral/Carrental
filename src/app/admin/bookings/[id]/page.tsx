import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminBookingWorkflow from "@/components/admin/AdminBookingWorkflow";
import { getAdminBookingDetail } from "@/lib/admin/rental-agreement-actions";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  let data: Awaited<ReturnType<typeof getAdminBookingDetail>>;
  try {
    data = await getAdminBookingDetail(id);
  } catch {
    notFound();
  }

  const booking = {
    ...data.booking,
    pickupAt: data.booking.pickupAt.toISOString(),
    dropoffAt: data.booking.dropoffAt.toISOString(),
    customerFormCompletedAt: data.booking.customerFormCompletedAt?.toISOString() ?? null,
    expectedReturnAt: data.booking.expectedReturnAt?.toISOString() ?? null,
    returnedAt: data.booking.returnedAt?.toISOString() ?? null,
    documents: data.booking.documents.map((doc) => ({
      ...doc,
      generatedAt: doc.generatedAt.toISOString(),
    })),
  };

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Rental Bookings", href: "/admin/bookings" },
          { label: "Booking detail" },
        ]}
      />
      <AdminBookingWorkflow
        booking={booking}
        availableFleet={data.availableFleet}
        agreementUrl={data.agreementUrl}
      />
    </div>
  );
}
