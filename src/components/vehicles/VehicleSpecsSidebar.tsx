import type { Vehicle } from "@/types";
import { getVehicleSidebarSpecs } from "@/lib/vehicles/vehicle-details";
import { formatVehicleNumberLabel } from "@/lib/vehicles/display";

interface VehicleSpecsSidebarProps {
  vehicle: Vehicle;
  children?: React.ReactNode;
  title?: string;
  className?: string;
}

export default function VehicleSpecsSidebar({
  vehicle,
  children,
  title = "Specifications",
  className = "",
}: VehicleSpecsSidebarProps) {
  const legacySpecs = getVehicleSidebarSpecs(vehicle);
  const vehicleNumber =
    vehicle.listingPurpose !== "rental"
      ? formatVehicleNumberLabel(vehicle.vehicleNumber)
      : null;
  const dynamicGroups = vehicle.specGroups ?? [];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>

      {vehicleNumber && (
        <p className="mt-3 text-sm font-medium text-gray-700">
          Vehicle No: <span className="font-mono font-bold text-gray-900">{vehicleNumber}</span>
        </p>
      )}

      {dynamicGroups.length > 0 ? (
        <div className="mt-5 space-y-6">
          {dynamicGroups.map((group) => (
            <div key={group.group}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {group.group}
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                {group.fields.map((field) => (
                  <div key={`${group.group}-${field.name}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-gray-500">{field.name}</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {legacySpecs.map((spec) => (
            <div key={spec.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-gray-500">{spec.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}
    </div>
  );
}
