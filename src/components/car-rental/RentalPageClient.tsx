"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import HeroVideoBackground from "@/components/HeroVideoBackground";
import RentalSearchCard from "@/components/car-rental/search/RentalSearchCard";
import OurCarsSection from "@/components/car-rental/our-cars/OurCarsSection";
import RentalResultsSkeleton from "@/components/car-rental/results/RentalResultsSkeleton";
import RentalEmptyState from "@/components/car-rental/results/RentalEmptyState";
import RentalResultCard from "@/components/car-rental/results/RentalResultCard";
import { VideoPageContext } from "@/components/layout/VideoPageContext";
import { DEFAULT_RENTAL_ADDRESS } from "@/lib/rentals/locations";
import {
  filterAndSortRentalResults,
  paginateResults,
} from "@/lib/rentals/filter-utils";
import { filterFleetForInstantSearch } from "@/lib/rentals/instant-search";
import { searchRentalVehiclesAction } from "@/lib/rentals/search-actions";
import { toRentalSearchRequest, validateRentalSearchForm } from "@/lib/rentals/search-validation";
import { videoPanel } from "@/lib/video-page-styles";
import { cn } from "@/lib/utils";
import type {
  RentalBookingContext,
  RentalResultFilters,
  RentalSearchFormValues,
  RentalSearchRequest,
  RentalVehicleResult,
} from "@/types/rental";
import type { Vehicle } from "@/types";

const defaultFormValues: RentalSearchFormValues = {
  pickupAddress: DEFAULT_RENTAL_ADDRESS,
  pickupDate: "",
  pickupTime: "",
  dropoffAddress: DEFAULT_RENTAL_ADDRESS,
  dropoffDate: "",
  dropoffTime: "",
};

const RESULTS_PER_PAGE = 9;

interface RentalPageClientProps {
  hero: ReactNode;
  fleetVehicles: Vehicle[];
}

export default function RentalPageClient({ hero, fleetVehicles }: RentalPageClientProps) {
  const [formValues, setFormValues] = useState<RentalSearchFormValues>(defaultFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RentalSearchFormValues, string>>>({});
  const [searchRequest, setSearchRequest] = useState<RentalSearchRequest | null>(null);
  const [searchContext, setSearchContext] = useState<RentalBookingContext | null>(null);
  const [instantResults, setInstantResults] = useState<RentalVehicleResult[] | null>(null);
  const [filters, setFilters] = useState<RentalResultFilters>({ sort: "price-asc", page: 1, limit: RESULTS_PER_PAGE });
  const resultsRef = useRef<HTMLElement>(null);

  const { data, isFetching, error, isSuccess } = useQuery({
    queryKey: ["rental-search", searchRequest],
    queryFn: () =>
      searchRentalVehiclesAction({
        ...searchRequest!,
        limit: 100,
      }),
    enabled: !!searchRequest,
    staleTime: 5 * 60 * 1000,
  });

  const handleFieldChange = (field: keyof RentalSearchFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSearch = () => {
    const result = validateRentalSearchForm(formValues);
    if (!result.success) {
      const nextErrors: Partial<Record<keyof RentalSearchFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RentalSearchFormValues;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      });
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    const request = toRentalSearchRequest(result.data);
    setInstantResults(
      filterFleetForInstantSearch(
        fleetVehicles,
        request.pickupDateTime,
        request.dropoffDateTime
      )
    );
    setSearchRequest(request);
    setSearchContext(result.data);
    setFilters({ sort: "price-asc", page: 1, limit: RESULTS_PER_PAGE });
  };

  useEffect(() => {
    if (!searchRequest) return;

    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [searchRequest]);

  const allResults = data?.data ?? instantResults ?? [];
  const filteredResults = useMemo(
    () => filterAndSortRentalResults(allResults, filters),
    [allResults, filters]
  );
  const paginated = useMemo(
    () => paginateResults(filteredResults, filters.page || 1, filters.limit || RESULTS_PER_PAGE),
    [filteredResults, filters.page, filters.limit]
  );

  const hasSearched = !!searchRequest;
  const showResults = hasSearched && (instantResults !== null || isSuccess);
  const showLoading = isFetching && instantResults === null;

  return (
    <>
      <VideoPageContext.Provider value={{ onVideo: true }}>
        <div className="relative isolate">
          <div className="pointer-events-none absolute inset-0 z-0">
            <HeroVideoBackground variant="rental" fullPage />
          </div>

          <div className="relative z-10">
            {hero}

            <section className="relative z-10 -mt-10 pb-16 lg:-mt-14 lg:pb-20">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <RentalSearchCard
                  values={formValues}
                  errors={formErrors}
                  loading={isFetching && instantResults === null}
                  onChange={handleFieldChange}
                  onSubmit={handleSearch}
                />
              </div>
            </section>
          </div>
        </div>
      </VideoPageContext.Provider>

      <section className="bg-white py-10 lg:py-14">
        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
          {!hasSearched ? (
            <OurCarsSection vehicles={fleetVehicles} />
          ) : (
            <section
              id="available-cars"
              ref={resultsRef}
              className="scroll-mt-24"
              aria-label="Available cars"
            >
              {showLoading && (
                <div className={cn(videoPanel, "border-gray-200 bg-white")}>
                  <p className="mb-6 text-center text-sm font-medium text-gray-600">Searching available cars...</p>
                  <RentalResultsSkeleton />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
                  {error instanceof Error ? error.message : "Search failed. Please try again."}
                </div>
              )}

              {showResults && (
                <div className={cn(videoPanel, "border-gray-200 bg-white")}>
                  <div className="space-y-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Available Cars</h2>
                      {searchContext && searchRequest && (
                        <p className="mt-1 text-sm text-gray-600">
                          {format(new Date(searchRequest.pickupDateTime), "dd MMM yyyy, HH:mm")} →{" "}
                          {format(new Date(searchRequest.dropoffDateTime), "dd MMM yyyy, HH:mm")}
                          {" · "}
                          {paginated.total} car{paginated.total !== 1 ? "s" : ""} available
                        </p>
                      )}
                    </div>
                  </div>

                  {paginated.total === 0 ? (
                    <RentalEmptyState />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {paginated.data.map((vehicle) => (
                          <RentalResultCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            searchContext={searchContext!}
                          />
                        ))}
                      </div>

                      {paginated.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            disabled={paginated.page <= 1}
                            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {paginated.page} of {paginated.totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={paginated.page >= paginated.totalPages}
                            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </>
  );
}
