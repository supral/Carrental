"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterOptions } from "@/types";
import FilterMakeModal from "./FilterMakeModal";
import { Checkbox } from "@/components/ui/checkbox";

export interface FilterValues {
  make: string[];
  model: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  minKm: string;
  maxKm: string;
  transmission: string;
  condition: string;
  color: string;
  driveType: string;
  doors: string;
  seats: string;
  fuelType: string;
  bodyType: string;
  features: string;
  offersOnly: boolean;
}

interface FilterSidebarProps {
  options: FilterOptions | undefined;
  values: FilterValues;
  onChange: (values: Partial<FilterValues>) => void;
}

export default function FilterSidebar({ options, values, onChange }: FilterSidebarProps) {
  const [makeModalOpen, setMakeModalOpen] = useState(false);

  if (!options) {
    return <div className="bg-white rounded-2xl border p-6 animate-pulse h-96" />;
  }

  const selectedMakeLabel =
    values.make.length === 0
      ? "Any make"
      : values.make.length === 1
        ? values.make[0]
        : `${values.make.length} makes`;

  const availableModels = useMemo(() => {
    if (!options) return [];
    if (values.make.length > 0) {
      const set = new Set<string>();
      for (const make of values.make) {
        for (const model of options.models[make] ?? []) {
          set.add(model);
        }
      }
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    return [...new Set(Object.values(options.models).flat())].sort((a, b) => a.localeCompare(b));
  }, [options, values.make]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Filters</h2>

        <label className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Checkbox
            checked={values.offersOnly}
            onCheckedChange={(checked) => onChange({ offersOnly: checked === true })}
          />
          <span className="text-sm font-medium">Offers Only</span>
        </label>

        <div>
          <Label>Make</Label>
          <Button
            variant="outline"
            className="w-full mt-1.5 justify-between font-normal"
            onClick={() => setMakeModalOpen(true)}
          >
            {selectedMakeLabel}
          </Button>
        </div>

        {availableModels.length > 0 && (
          <div>
            <Label>Model</Label>
            <Select
              value={values.model || "all"}
              onValueChange={(v) => onChange({ model: v === "all" ? "" : v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Any model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any model</SelectItem>
                {availableModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Min Price</Label>
            <Input type="number" value={values.minPrice} onChange={(e) => onChange({ minPrice: e.target.value })} className="mt-1.5" placeholder="Min" />
          </div>
          <div>
            <Label>Max Price</Label>
            <Input type="number" value={values.maxPrice} onChange={(e) => onChange({ maxPrice: e.target.value })} className="mt-1.5" placeholder="Max" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>From Year</Label>
            <Input type="number" value={values.minYear} onChange={(e) => onChange({ minYear: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>To Year</Label>
            <Input type="number" value={values.maxYear} onChange={(e) => onChange({ maxYear: e.target.value })} className="mt-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Min Km</Label>
            <Input type="number" value={values.minKm} onChange={(e) => onChange({ minKm: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Max Km</Label>
            <Input type="number" value={values.maxKm} onChange={(e) => onChange({ maxKm: e.target.value })} className="mt-1.5" />
          </div>
        </div>

        {[
          { key: "transmission" as const, label: "Transmission", opts: options.transmissions },
          { key: "condition" as const, label: "Condition", opts: options.conditions },
          { key: "color" as const, label: "Color", opts: options.colors },
          { key: "driveType" as const, label: "Drive Type", opts: options.driveTypes },
          { key: "fuelType" as const, label: "Fuel Type", opts: options.fuelTypes },
          { key: "bodyType" as const, label: "Body Type", opts: options.bodyTypes },
        ].map(({ key, label, opts }) => (
          <div key={key}>
            <Label>{label}</Label>
            <Select value={values[key] || "all"} onValueChange={(v) => onChange({ [key]: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={`Any ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {opts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Doors</Label>
            <Select value={values.doors || "all"} onValueChange={(v) => onChange({ doors: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {options.doors.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Seats</Label>
            <Select value={values.seats || "all"} onValueChange={(v) => onChange({ seats: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {options.seats.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {options.features.length > 0 && (
          <div>
            <Label>Features</Label>
            <Select
              value={values.features || "all"}
              onValueChange={(v) => onChange({ features: v === "all" ? "" : v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Any feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {options.features.map((feature) => (
                  <SelectItem key={feature} value={feature}>
                    {feature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <FilterMakeModal
        open={makeModalOpen}
        onOpenChange={setMakeModalOpen}
        makes={options.makes}
        selected={values.make}
        onApply={(make) => onChange({ make, model: "" })}
      />
    </>
  );
}
