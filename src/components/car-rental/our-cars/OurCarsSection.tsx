"use client";

import { useState } from "react";
import OurCarsCarousel from "@/components/car-rental/our-cars/OurCarsCarousel";
import RentalDateRangeDialog from "@/components/car-rental/our-cars/RentalDateRangeDialog";
import type { Vehicle } from "@/types";

interface OurCarsSectionProps {
  vehicles: Vehicle[];
}

export default function OurCarsSection({ vehicles }: OurCarsSectionProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleContinue = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDialogOpen(true);
  };

  return (
    <section aria-label="Our cars">
      <h2 className="mb-6 text-2xl font-bold text-primary">Our Cars</h2>

      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">No cars available right now</p>
          <p className="mt-2 text-sm text-gray-600">
            Fully booked vehicles are hidden. Check back soon or try different dates in the search above.
          </p>
        </div>
      ) : (
        <OurCarsCarousel vehicles={vehicles} onContinue={handleContinue} />
      )}

      <RentalDateRangeDialog
        vehicle={selectedVehicle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
