import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { VehicleDetailSection } from "@/lib/vehicles/vehicle-details";

interface VehicleDetailsPanelProps {
  sections: VehicleDetailSection[];
  basePath: string;
  className?: string;
}

export default function VehicleDetailsPanel({
  sections,
  basePath,
  className = "",
}: VehicleDetailsPanelProps) {
  if (sections.length === 0) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-6 ${className}`}>
        <h2 className="text-2xl font-bold text-gray-900">Details</h2>
        <p className="mt-2 text-sm text-gray-600">Detailed information for this vehicle will appear here soon.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Details</h2>
      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`${basePath}/details/${section.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
          >
            <div>
              <p className="font-semibold text-gray-900">{section.title}</p>
              {section.content && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{section.content}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
