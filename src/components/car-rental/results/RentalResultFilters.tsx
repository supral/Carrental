"use client";

import type { RentalResultFilters, RentalResultSort } from "@/types/rental";

interface FilterOptions {
  makes: string[];
  bodyTypes: string[];
  transmissions: string[];
  fuelTypes: string[];
  seats: number[];
  priceRange: { min: number; max: number };
}

interface RentalResultFiltersProps {
  filters: RentalResultFilters;
  options: FilterOptions;
  onChange: (filters: RentalResultFilters) => void;
}

export default function RentalResultFiltersBar({
  filters,
  options,
  onChange,
}: RentalResultFiltersProps) {
  const update = (patch: Partial<RentalResultFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  const selectClass =
    "rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Min Price</label>
          <input
            type="number"
            min={options.priceRange.min}
            max={options.priceRange.max}
            value={filters.minPrice ?? ""}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            className={selectClass + " w-full"}
            placeholder={`${options.priceRange.min}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Max Price</label>
          <input
            type="number"
            min={options.priceRange.min}
            max={options.priceRange.max}
            value={filters.maxPrice ?? ""}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            className={selectClass + " w-full"}
            placeholder={`${options.priceRange.max}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Brand</label>
          <select
            value={filters.make ?? ""}
            onChange={(e) => update({ make: e.target.value || undefined })}
            className={selectClass + " w-full"}
          >
            <option value="">All brands</option>
            {options.makes.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Vehicle Type</label>
          <select
            value={filters.bodyType ?? ""}
            onChange={(e) => update({ bodyType: e.target.value || undefined })}
            className={selectClass + " w-full"}
          >
            <option value="">All types</option>
            {options.bodyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Transmission</label>
          <select
            value={filters.transmission ?? ""}
            onChange={(e) => update({ transmission: e.target.value || undefined })}
            className={selectClass + " w-full"}
          >
            <option value="">All</option>
            {options.transmissions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Fuel</label>
          <select
            value={filters.fuelType ?? ""}
            onChange={(e) => update({ fuelType: e.target.value || undefined })}
            className={selectClass + " w-full"}
          >
            <option value="">All</option>
            {options.fuelTypes.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Sort by</label>
          <select
            value={filters.sort ?? "price-asc"}
            onChange={(e) => update({ sort: e.target.value as RentalResultSort })}
            className={selectClass + " w-full"}
          >
            <option value="price-asc">Lowest Price</option>
            <option value="price-desc">Highest Price</option>
            <option value="newest">Newest</option>
            <option value="rating">Best Rated</option>
          </select>
        </div>
      </div>
      <div className="mt-3 max-w-xs">
        <label className="mb-1 block text-xs font-medium text-gray-500">Min Seats</label>
        <select
          value={filters.seats ?? ""}
          onChange={(e) => update({ seats: e.target.value ? Number(e.target.value) : undefined })}
          className={selectClass + " w-full"}
        >
          <option value="">Any</option>
          {options.seats.map((seat) => (
            <option key={seat} value={seat}>{seat}+ seats</option>
          ))}
        </select>
      </div>
    </div>
  );
}
