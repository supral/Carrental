import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RentalBookingFlow from "@/components/car-rental/RentalBookingFlow";
import FleetAvailabilityPanel from "@/components/car-rental/FleetAvailabilityPanel";
import { getPublicRentalVehicleById } from "@/lib/vehicles/public-vehicle-service";
import { parseVehicleRentalOptions } from "@/lib/rentals/option-catalog";
import { prisma } from "@/lib/prisma";
import { ListingPurpose, VehicleStatus } from "@prisma/client";
import { combineDateAndTime } from "@/lib/rentals/search-validation";
import { getFleetAvailability } from "@/lib/rentals/fleet-inventory";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseBookingContext(params: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const pickupAddress = get("pickupAddress");
  const dropoffAddress = get("dropoffAddress");
  const pickupDate = get("pickupDate");
  const pickupTime = get("pickupTime");
  const dropoffDate = get("dropoffDate");
  const dropoffTime = get("dropoffTime");

  if (!pickupAddress || !dropoffAddress || !pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
    return null;
  }

  return {
    pickupAddress,
    dropoffAddress,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
  };
}

export default async function RentalBookPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const bookingContext = parseBookingContext(query);

  if (!bookingContext) {
    redirect(`/car-rental/${id}`);
  }

  const vehicle = await getPublicRentalVehicleById(id);
  if (!vehicle) notFound();

  const pickupAt = combineDateAndTime(bookingContext.pickupDate, bookingContext.pickupTime);
  const dropoffAt = combineDateAndTime(bookingContext.dropoffDate, bookingContext.dropoffTime);
  const fleetAvailability = await getFleetAvailability(id, { pickupAt, dropoffAt });

  if (fleetAvailability.availableUnits <= 0) {
    return (
      <div className="bg-gray-50 py-10 lg:py-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <FleetAvailabilityPanel
            totalUnits={fleetAvailability.totalUnits}
            reservedUnits={fleetAvailability.reservedUnits}
            availableUnits={fleetAvailability.availableUnits}
          />
          <div className="mt-6 text-center">
            <Link href={`/car-rental/${id}`} className="text-sm font-medium text-primary hover:text-primary/80">
              ← Back to vehicle details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dbVehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    select: { rentalOptions: true },
  });

  const vehicleOptions = parseVehicleRentalOptions(dbVehicle?.rentalOptions);

  return (
    <div className="bg-gray-50 py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RentalBookingFlow
          vehicle={vehicle}
          bookingContext={bookingContext}
          vehicleOptions={vehicleOptions}
          fleetAvailability={fleetAvailability}
        />
      </div>
    </div>
  );
}
