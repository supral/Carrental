import Link from "next/link";
import { notFound } from "next/navigation";
import type { Vehicle } from "@/types";
import type { VehicleDetailSection } from "@/lib/vehicles/vehicle-details";
import { formatVehicleName } from "@/lib/vehicles/display";

interface VehicleDetailSectionPageProps {
  vehicle: Vehicle;
  section: VehicleDetailSection;
  basePath: string;
  breadcrumbs: { label: string; href?: string }[];
}

export default function VehicleDetailSectionPage({
  vehicle,
  section,
  basePath,
  breadcrumbs,
}: VehicleDetailSectionPageProps) {
  const vehicleTitle = formatVehicleName(vehicle);

  return (
    <>
      <section className="bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 && <span className="mx-2">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-red-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <p className="text-sm font-medium text-red-600">{vehicleTitle}</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{section.title}</h1>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">
            <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
              {section.content || "No content has been added for this section yet."}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={basePath}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Back to vehicle
            </Link>
            <Link
              href={`${basePath}/details`}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              All details
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function findVehicleDetailSection(
  sections: VehicleDetailSection[],
  sectionId: string
): VehicleDetailSection | null {
  return sections.find((section) => section.id === sectionId) ?? null;
}

export function requireVehicleDetailSection(
  sections: VehicleDetailSection[],
  sectionId: string
): VehicleDetailSection {
  const section = findVehicleDetailSection(sections, sectionId);
  if (!section) notFound();
  return section;
}
