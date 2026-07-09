import { Car } from "lucide-react";

export default function RentalEmptyState() {
  return (
    <div className="rounded-[20px] border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <Car className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">No rental cars are available for your selected dates.</h3>
      <p className="mx-auto mt-3 max-w-md text-gray-600">
        Try changing your pickup or drop-off time.
      </p>
    </div>
  );
}
