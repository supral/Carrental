"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RENTAL_OPTION_CATALOG,
  type RentalOptionType,
  type VehicleRentalOptionConfig,
} from "@/lib/rentals/option-catalog";
import { cn } from "@/lib/utils";

interface RentalOptionsEditorProps {
  value: VehicleRentalOptionConfig[];
  onChange: (value: VehicleRentalOptionConfig[]) => void;
}

export default function RentalOptionsEditor({ value, onChange }: RentalOptionsEditorProps) {
  const optionsByType = Object.fromEntries(value.map((option) => [option.type, option])) as Record<
    RentalOptionType,
    VehicleRentalOptionConfig
  >;

  const updateOption = (type: RentalOptionType, patch: Partial<VehicleRentalOptionConfig>) => {
    onChange(
      value.map((option) => (option.type === type ? { ...option, ...patch } : option))
    );
  };

  return (
    <div className="space-y-4">
      {RENTAL_OPTION_CATALOG.map((catalog) => {
        const option = optionsByType[catalog.type];
        if (!option) return null;

        return (
          <div key={catalog.type} className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{catalog.label}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {catalog.category === "insurance" ? "Insurance" : "Extra"}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={option.enabled}
                  onCheckedChange={(checked) => updateOption(catalog.type, { enabled: checked === true })}
                />
                Enable
              </label>
            </div>

            {option.enabled && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="mb-1.5 block">Description</Label>
                  <Input
                    value={option.description ?? ""}
                    onChange={(e) => updateOption(catalog.type, { description: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block">Price (AUD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={option.price ?? ""}
                    onChange={(e) =>
                      updateOption(catalog.type, {
                        price: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {catalog.supportsQuantity && (
                  <div>
                    <Label className="mb-1.5 block">Maximum Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={option.maxQuantity ?? catalog.defaultMaxQuantity ?? 1}
                      onChange={(e) =>
                        updateOption(catalog.type, { maxQuantity: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label className="mb-2 block">Price Type</Label>
                  <div className="flex flex-wrap gap-4">
                    {(["per_rental", "per_day"] as const).map((priceType) => (
                      <label
                        key={priceType}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm",
                          option.priceType === priceType
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        <input
                          type="radio"
                          name={`${catalog.type}-price-type`}
                          checked={option.priceType === priceType}
                          onChange={() => updateOption(catalog.type, { priceType })}
                        />
                        {priceType === "per_rental" ? "Per Rental" : "Per Day"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
