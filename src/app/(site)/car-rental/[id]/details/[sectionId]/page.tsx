import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRentalVehicleById } from "@/lib/vehicles/public-vehicle-service";
import { formatVehicleName } from "@/lib/vehicles/display";
import VehicleDetailSectionPage, {
  requireVehicleDetailSection,
} from "@/components/vehicles/VehicleDetailSectionPage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; sectionId: string }>;
}

export default async function RentalDetailSectionRoute({ params }: PageProps) {
  const { id, sectionId } = await params;
  const vehicle = await getPublicRentalVehicleById(id);

  if (!vehicle) notFound();

  const sections = vehicle.details?.sections ?? [];
  const section = requireVehicleDetailSection(sections, sectionId);
  const vehicleTitle = formatVehicleName(vehicle);

  return (
    <VehicleDetailSectionPage
      vehicle={vehicle}
      section={section}
      basePath={`/car-rental/${id}`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Car Rental", href: "/car-rental" },
        { label: vehicleTitle, href: `/car-rental/${id}` },
        { label: "Details", href: `/car-rental/${id}/details` },
        { label: section.title },
      ]}
    />
  );
}
