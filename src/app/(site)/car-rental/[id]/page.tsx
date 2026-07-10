import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRentalVehicleById } from "@/lib/vehicles/public-vehicle-service";
import { formatVehicleName } from "@/lib/vehicles/display";
import VehicleGallery from "@/components/VehicleGallery";
import RentalDetailBooking from "@/components/car-rental/RentalDetailBooking";
import FleetAvailabilityPanel from "@/components/car-rental/FleetAvailabilityPanel";
import VehicleSpecsSidebar from "@/components/vehicles/VehicleSpecsSidebar";
import VehicleDetailsPanel from "@/components/vehicles/VehicleDetailsPanel";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";
import { formatPrice } from "@/lib/utils";
import { buildRentalDetailUrl } from "@/lib/rentals/filter-utils";
import { formatRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import { combineDateAndTime } from "@/lib/rentals/search-validation";
import { getFleetAvailability } from "@/lib/rentals/fleet-inventory";
import { getDynamicVehicleRentalOptions } from "@/lib/rentals/dynamic-rental-options";
import RentalOptionsPreview from "@/components/car-rental/RentalOptionsPreview";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getPublicRentalVehicleById(id);
  if (!vehicle) return { title: "Rental Vehicle Not Found" };

  const title = formatVehicleName(vehicle);
  const overview = vehicle.details?.sections[0]?.content;
  return {
    title: `Rent ${title}`,
    description: overview?.slice(0, 160) || `Book ${title} for rental at Everest Car Rental.`,
  };
}

export default async function RentalVehicleDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const bookingContext =
    typeof query.pickupAddress === "string" &&
    typeof query.dropoffAddress === "string" &&
    typeof query.pickupDate === "string" &&
    typeof query.pickupTime === "string" &&
    typeof query.dropoffDate === "string" &&
    typeof query.dropoffTime === "string"
      ? {
          pickupAddress: query.pickupAddress,
          dropoffAddress: query.dropoffAddress,
          pickupDate: query.pickupDate,
          pickupTime: query.pickupTime,
          dropoffDate: query.dropoffDate,
          dropoffTime: query.dropoffTime,
        }
      : null;

  const pickupAt = bookingContext
    ? combineDateAndTime(bookingContext.pickupDate, bookingContext.pickupTime)
    : null;
  const dropoffAt = bookingContext
    ? combineDateAndTime(bookingContext.dropoffDate, bookingContext.dropoffTime)
    : null;

  const [vehicle, fleetAvailability, vehicleOptions] = await Promise.all([
    getPublicRentalVehicleById(id),
    pickupAt && dropoffAt
      ? getFleetAvailability(id, { pickupAt, dropoffAt })
      : Promise.resolve(null),
    getDynamicVehicleRentalOptions(id),
  ]);

  if (!vehicle) {
    notFound();
  }

  const vehicleTitle = formatVehicleName(vehicle);
  const rentalWindow = formatRentalAvailabilityWindow(vehicle.rentalAvailableFrom);
  const detailSections = vehicle.details?.sections ?? [];

  const bookUrl = bookingContext
    ? buildRentalDetailUrl(id, bookingContext, "rent")
    : "#book";

  const canBook = !fleetAvailability || fleetAvailability.availableUnits > 0;

  return (
    <>
      <section className="bg-brand-dark py-10 text-white lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-gray-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/car-rental" className="hover:text-white">Car Rental</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{vehicleTitle}</span>
          </nav>
          <h1 className="text-3xl font-bold sm:text-4xl">{vehicleTitle}</h1>
          <p className="mt-3 text-lg text-gray-300">
            {formatPrice(vehicle.price)}
            <span className="text-base font-normal text-gray-400"> /day</span>
          </p>
          {rentalWindow && (
            <p className="mt-2 text-sm text-gray-400">Available for rent {rentalWindow.toLowerCase()}</p>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="lg:col-span-3">
              <VehicleGallery vehicle={vehicle} />
            </div>

            <div className="lg:col-span-2">
              <VehicleSpecsSidebar vehicle={vehicle} title="Vehicle Overview">
                {fleetAvailability && (
                  <FleetAvailabilityPanel
                    className="mt-6"
                    totalUnits={fleetAvailability.totalUnits}
                    reservedUnits={fleetAvailability.reservedUnits}
                    availableUnits={fleetAvailability.availableUnits}
                  />
                )}

                <Link
                  href={canBook ? bookUrl : "#"}
                  aria-disabled={!canBook}
                  className={`mt-8 block w-full rounded-lg px-6 py-3.5 text-center text-base font-semibold text-white transition-colors ${
                    canBook ? "bg-primary hover:opacity-90" : "pointer-events-none bg-gray-400"
                  }`}
                >
                  {canBook ? (bookingContext ? "Rent Now" : "Book This Vehicle") : "Unavailable for Selected Dates"}
                </Link>

                <p className="mt-4 text-center text-sm text-gray-500">
                  Or call{" "}
                  <ContactPhoneTrigger
                    phone={vehicle.dealer.phone}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {vehicle.dealer.phone}
                  </ContactPhoneTrigger>
                </p>
              </VehicleSpecsSidebar>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RentalOptionsPreview options={vehicleOptions} />
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <VehicleDetailsPanel
            sections={detailSections}
            basePath={`/car-rental/${id}`}
          />
        </div>
      </section>

      {bookingContext ? (
        <section className="scroll-mt-24 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Ready to book?</h2>
              <p className="mt-2 text-gray-600">
                Continue to choose protection, extras, and complete your secure payment.
              </p>
              <Link
                href={canBook ? bookUrl : "#"}
                aria-disabled={!canBook}
                className={`mt-6 inline-flex rounded-2xl px-8 py-3.5 font-semibold text-white ${
                  canBook ? "bg-primary hover:opacity-90" : "pointer-events-none bg-gray-400"
                }`}
              >
                {canBook ? "Continue to Rental Options" : "Unavailable for Selected Dates"}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="scroll-mt-24 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
                <RentalDetailBooking vehicle={vehicle} searchParams={query} vehicleOptions={vehicleOptions} />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
