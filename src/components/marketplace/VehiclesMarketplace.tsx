"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, Bookmark, SearchX } from "lucide-react";
import PageHero from "@/components/layout/PageHero";
import VideoPageShell from "@/components/layout/VideoPageShell";
import { useVehicleSearchParams, useVehiclesQuery, useFilterOptionsQuery } from "@/hooks/use-vehicles";
import { useSavedSearchStore } from "@/stores/saved-search";
import FilterSidebar, { FilterValues } from "@/components/marketplace/FilterSidebar";
import ActiveFilterChips from "@/components/marketplace/ActiveFilterChips";
import MarketplaceVehicleCard from "@/components/marketplace/MarketplaceVehicleCard";
import { VehicleGridSkeleton } from "@/components/marketplace/VehicleCardSkeleton";
import { PageLoader } from "@/components/ui/loading";
import Pagination from "@/components/marketplace/Pagination";
import CompareBar from "@/components/CompareBar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { VehicleSearchParams, VehicleCategory } from "@/types";

function paramsToFilterValues(params: VehicleSearchParams): FilterValues {
  return {
    make: params.make ? params.make.split(",") : [],
    model: params.model || "",
    minPrice: params.minPrice || "",
    maxPrice: params.maxPrice || "",
    minYear: params.minYear || "",
    maxYear: params.maxYear || "",
    minKm: params.minKm || "",
    maxKm: params.maxKm || "",
    transmission: params.transmission || "",
    condition: params.condition || "",
    color: params.color || "",
    driveType: params.driveType || "",
    doors: params.doors || "",
    seats: params.seats || "",
    fuelType: params.fuelType || "",
    bodyType: params.bodyType || "",
    features: params.features || "",
    offersOnly: params.offersOnly === "true" || params.offersOnly === true,
  };
}

function filterValuesToParams(values: Partial<FilterValues>): Partial<VehicleSearchParams> {
  const out: Partial<VehicleSearchParams> = {};
  if (values.make !== undefined) out.make = values.make.length ? values.make.join(",") : undefined;
  if (values.model !== undefined) out.model = values.model || undefined;
  if (values.minPrice !== undefined) out.minPrice = values.minPrice || undefined;
  if (values.maxPrice !== undefined) out.maxPrice = values.maxPrice || undefined;
  if (values.minYear !== undefined) out.minYear = values.minYear || undefined;
  if (values.maxYear !== undefined) out.maxYear = values.maxYear || undefined;
  if (values.minKm !== undefined) out.minKm = values.minKm || undefined;
  if (values.maxKm !== undefined) out.maxKm = values.maxKm || undefined;
  if (values.transmission !== undefined) out.transmission = values.transmission || undefined;
  if (values.condition !== undefined) out.condition = values.condition || undefined;
  if (values.color !== undefined) out.color = values.color || undefined;
  if (values.driveType !== undefined) out.driveType = values.driveType || undefined;
  if (values.doors !== undefined) out.doors = values.doors || undefined;
  if (values.seats !== undefined) out.seats = values.seats || undefined;
  if (values.fuelType !== undefined) out.fuelType = values.fuelType || undefined;
  if (values.bodyType !== undefined) out.bodyType = values.bodyType || undefined;
  if (values.features !== undefined) out.features = values.features || undefined;
  if (values.offersOnly !== undefined) out.offersOnly = values.offersOnly ? "true" : undefined;
  return out;
}

export default function VehiclesMarketplace() {
  const [params, setParams] = useVehicleSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { save: saveSearch } = useSavedSearchStore();

  const searchParams: VehicleSearchParams = useMemo(
    () => ({
      category: (params.category as VehicleCategory) || "cars",
      listingPurpose: "sale",
      search: params.search || undefined,
      make: params.make || undefined,
      model: params.model || undefined,
      minPrice: params.minPrice || undefined,
      maxPrice: params.maxPrice || undefined,
      minYear: params.minYear || undefined,
      maxYear: params.maxYear || undefined,
      minKm: params.minKm || undefined,
      maxKm: params.maxKm || undefined,
      fuelType: params.fuelType || undefined,
      transmission: params.transmission || undefined,
      bodyType: params.bodyType || undefined,
      condition: params.condition || undefined,
      color: params.color || undefined,
      driveType: params.driveType || undefined,
      doors: params.doors || undefined,
      seats: params.seats || undefined,
      features: params.features || undefined,
      location: params.location || undefined,
      offersOnly: params.offersOnly === "true" ? true : undefined,
      sort: (params.sort as VehicleSearchParams["sort"]) || "newest",
      page: params.page || 1,
      limit: params.limit || 9,
    }),
    [params]
  );

  const filterValues = paramsToFilterValues(searchParams);
  const { data, isLoading, isError } = useVehiclesQuery(searchParams);
  const { data: filterOptions } = useFilterOptionsQuery(searchParams.category);

  const updateFilters = (values: Partial<FilterValues>) => {
    setParams({ ...filterValuesToParams(values), page: 1 } as Record<string, string | number | null>);
  };

  const removeFilter = (key: string) => {
    setParams({ [key]: null, page: 1 });
  };

  const clearAllFilters = () => {
    setParams({
      category: params.category,
      search: null,
      make: null,
      model: null,
      minPrice: null,
      maxPrice: null,
      minYear: null,
      maxYear: null,
      minKm: null,
      maxKm: null,
      fuelType: null,
      transmission: null,
      bodyType: null,
      condition: null,
      color: null,
      driveType: null,
      doors: null,
      seats: null,
      features: null,
      location: null,
      offersOnly: null,
      sort: "newest",
      page: 1,
    });
  };

  const categoryLabel = "Used Cars";

  const sidebar = (
    <FilterSidebar
      options={filterOptions}
      values={filterValues}
      onChange={updateFilters}
    />
  );

  return (
    <VideoPageShell variant="sale">
      <PageHero
        padding="xlarge"
        className="flex min-h-[min(70vh,780px)] items-center"
        titleClassName="text-5xl sm:text-6xl lg:text-7xl"
        eyebrow="Everest Car Rental"
        title={`${categoryLabel} for Sale`}
        description={
          <>
            <span className="text-xl sm:text-2xl">
              {data ? `${data.total.toLocaleString()} vehicles found` : "Search our inventory"}
              {searchParams.location && ` in ${searchParams.location}`}
            </span>
          </>
        }
      />

      <section className="relative pb-12 pt-2 lg:pb-16 lg:pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
              {data && (
                <p className="text-sm text-muted-foreground">
                  Showing page {data.page} of {data.totalPages} ({data.total} results)
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = `${categoryLabel} search`;
                  saveSearch(name, searchParams);
                }}
              >
                <Bookmark className="h-4 w-4" />
                Save Search
              </Button>
              <Select
                value={searchParams.sort || "newest"}
                onValueChange={(sort) => setParams({ sort, page: 1 })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="discount-desc">Biggest Discount</SelectItem>
                  <SelectItem value="km-asc">Lowest Km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ActiveFilterChips
            params={searchParams}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
          />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24">{sidebar}</div>
            </aside>

            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="space-y-4">
                  <PageLoader label="Searching vehicles..." className="py-6" />
                  <VehicleGridSkeleton />
                </div>
              ) : isError || !data?.data.length ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white rounded-2xl border"
                >
                  <SearchX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No vehicles found</h3>
                  <p className="text-muted-foreground mb-6">Try adjusting your filters or search criteria.</p>
                  <Button onClick={clearAllFilters}>Clear all filters</Button>
                </motion.div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data.data.map((vehicle, i) => (
                      <MarketplaceVehicleCard key={vehicle.id} vehicle={vehicle} index={i} />
                    ))}
                  </div>
                  <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    onPageChange={(page) => setParams({ page })}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="flex flex-col max-h-[92vh]">
          <SheetHeader>
            <h2 className="text-lg font-bold">Filters</h2>
          </SheetHeader>
          <SheetBody>{sidebar}</SheetBody>
          <SheetFooter>
            <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
              Show Results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CompareBar />
    </VideoPageShell>
  );
}
