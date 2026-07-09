interface FleetAvailabilityPanelProps {
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  className?: string;
}

export default function FleetAvailabilityPanel({
  availableUnits,
  className = "",
}: FleetAvailabilityPanelProps) {
  const soldOut = availableUnits <= 0;

  if (!soldOut) return null;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Availability</h3>
      <p className="mt-3 text-lg font-bold text-gray-600">Fully Booked</p>
      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        This vehicle is currently fully booked. You can still view details or try different dates.
      </p>
    </div>
  );
}
