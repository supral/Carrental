"use client";

import { VehicleFilters as Filters } from "@/types";

interface VehicleFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
}

const fuelTypes = ["", "Petrol", "Diesel", "Hybrid", "Electric"];
const transmissions = ["", "Automatic", "Manual"];
const bodyTypes = ["", "Sedan", "SUV", "Ute", "Hatchback", "Wagon", "Coupe"];
const years = ["", "2024", "2023", "2022", "2021", "2020"];

export default function VehicleFilters({ filters, onChange, resultCount }: VehicleFiltersProps) {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({
      search: "",
      minPrice: "",
      maxPrice: "",
      year: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      sort: filters.sort,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">Filter Vehicles</h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Make / Model
          </label>
          <input
            id="search"
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="e.g. Toyota Hilux"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Min Price
            </label>
            <input
              id="minPrice"
              type="number"
              value={filters.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
              placeholder="$0"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Max Price
            </label>
            <input
              id="maxPrice"
              type="number"
              value={filters.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
              placeholder="$100,000"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            id="year"
            value={filters.year}
            onChange={(e) => update("year", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none bg-white"
          >
            <option value="">All Years</option>
            {years.filter(Boolean).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-1">
            Fuel Type
          </label>
          <select
            id="fuelType"
            value={filters.fuelType}
            onChange={(e) => update("fuelType", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none bg-white"
          >
            <option value="">All Fuel Types</option>
            {fuelTypes.filter(Boolean).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transmission" className="block text-sm font-medium text-gray-700 mb-1">
            Transmission
          </label>
          <select
            id="transmission"
            value={filters.transmission}
            onChange={(e) => update("transmission", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none bg-white"
          >
            <option value="">All Transmissions</option>
            {transmissions.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bodyType" className="block text-sm font-medium text-gray-700 mb-1">
            Body Type
          </label>
          <select
            id="bodyType"
            value={filters.bodyType}
            onChange={(e) => update("bodyType", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none bg-white"
          >
            <option value="">All Body Types</option>
            {bodyTypes.filter(Boolean).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <p className="mt-5 text-sm text-gray-500 text-center">
        {resultCount} vehicle{resultCount !== 1 ? "s" : ""} found
      </p>
    </div>
  );
}
