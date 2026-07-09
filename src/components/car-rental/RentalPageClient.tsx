"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import RentalSearchCard from "@/components/car-rental/search/RentalSearchCard";
import RentalResultsSkeleton from "@/components/car-rental/results/RentalResultsSkeleton";
import RentalEmptyState from "@/components/car-rental/results/RentalEmptyState";
import RentalResultCard from "@/components/car-rental/results/RentalResultCard";
import RentalResultFiltersBar from "@/components/car-rental/results/RentalResultFilters";
import { dealershipLocation } from "@/lib/rentals/locations";
import {
  buildFilterOptions,
  filterAndSortRentalResults,
  paginateResults,
} from "@/lib/rentals/filter-utils";
import { searchAvailableRentals } from "@/lib/rentals/rental-api";
import { toRentalSearchRequest, validateRentalSearchForm } from "@/lib/rentals/search-validation";
import { videoPanel } from "@/lib/video-page-styles";
import { cn } from "@/lib/utils";
import type {
  RentalBookingContext,
  RentalResultFilters,
  RentalSearchFormValues,
  RentalSearchRequest,
} from "@/types/rental";

const defaultFormValues: RentalSearchFormValues = {
  pickupAddress: dealershipLocation.address,
  pickupDate: "",
  pickupTime: "",
  dropoffAddress: dealershipLocation.address,
  dropoffDate: "",
  dropoffTime: "",
};

const RESULTS_PER_PAGE = 9;

export default function RentalPageClient() {
  const [formValues, setFormValues] = useState<RentalSearchFormValues>(defaultFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RentalSearchFormValues, string>>>({});
  const [searchRequest, setSearchRequest] = useState<RentalSearchRequest | null>(null);
  const [searchContext, setSearchContext] = useState<RentalBookingContext | null>(null);
  const [filters, setFilters] = useState<RentalResultFilters>({ sort: "price-asc", page: 1, limit: RESULTS_PER_PAGE });
  const resultsRef = useRef<HTMLElement>(null);

  const { data, isFetching, error, isSuccess } = useQuery({
    queryKey: ["rental-search", searchRequest],
    queryFn: () => searchAvailableRentals(searchRequest!, { limit: 100 }),
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
    setSearchRequest(toRentalSearchRequest(result.data));
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

  const allResults = data?.data ?? [];
  const filterOptions = useMemo(() => buildFilterOptions(allResults), [allResults]);
  const filteredResults = useMemo(
    () => filterAndSortRentalResults(allResults, filters),
    [allResults, filters]
  );
  const paginated = useMemo(
    () => paginateResults(filteredResults, filters.page || 1, filters.limit || RESULTS_PER_PAGE),
    [filteredResults, filters.page, filters.limit]
  );

  const hasSearched = !!searchRequest;
  const showResults = hasSearched && isSuccess && !isFetching;

  return (
    <div className="space-y-10">
      <RentalSearchCard
        values={formValues}
        errors={formErrors}
        loading={isFetching}
        onChange={handleFieldChange}
        onSubmit={handleSearch}
      />

      {hasSearched && (
        <section
          id="available-cars"
          ref={resultsRef}
          className="scroll-mt-24"
          aria-label="Available cars"
        >
          {isFetching && (
            <div className={cn(videoPanel, "border-gray-200 bg-white/95")}>
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
            <div className={cn(videoPanel, "border-gray-200 bg-white/95")}>
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

              {allResults.length > 0 && (
                <RentalResultFiltersBar
                  filters={filters}
                  options={filterOptions}
                  onChange={setFilters}
                />
              )}

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
  );
}
