import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRentalVehicleById } from "@/lib/vehicles/public-vehicle-service";
import { formatVehicleName } from "@/lib/vehicles/display";
import VehicleDetailsPanel from "@/components/vehicles/VehicleDetailsPanel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RentalDetailsIndexPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await getPublicRentalVehicleById(id);

  if (!vehicle) notFound();

  const vehicleTitle = formatVehicleName(vehicle);
  const sections = vehicle.details?.sections ?? [];

  return (
    <section className="bg-gray-50 py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/car-rental" className="hover:text-primary">Car Rental</Link>
          <span className="mx-2">/</span>
          <Link href={`/car-rental/${id}`} className="hover:text-primary">{vehicleTitle}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Details</span>
        </nav>

        <VehicleDetailsPanel sections={sections} basePath={`/car-rental/${id}`} />
      </div>
    </section>
  );
}
