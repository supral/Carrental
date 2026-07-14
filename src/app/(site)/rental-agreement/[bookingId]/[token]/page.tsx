import { notFound } from "next/navigation";
import CustomerRentalAgreementForm from "@/components/rentals/CustomerRentalAgreementForm";
import { getAgreementBookingByToken } from "@/lib/rentals/rental-agreement-service";
import { formatVehicleName } from "@/lib/vehicles/display";

export const dynamic = "force-dynamic";

export default async function RentalAgreementPage({
  params,
}: {
  params: Promise<{ bookingId: string; token: string }>;
}) {
  const { bookingId, token } = await params;
  const booking = await getAgreementBookingByToken(bookingId, token);
  if (!booking) notFound();

  const nameParts = (booking.customerName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <CustomerRentalAgreementForm
          bookingId={booking.id}
          token={token}
          vehicleLabel={formatVehicleName(booking.vehicle)}
          alreadyCompleted={Boolean(booking.customerFormCompletedAt)}
          defaults={{
            firstName,
            lastName,
            email: booking.customerEmail ?? "",
            phone: booking.customerPhone ?? "",
          }}
        />
      </div>
    </main>
  );
}
