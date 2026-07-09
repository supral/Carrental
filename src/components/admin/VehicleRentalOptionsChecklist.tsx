"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { RentalOptionCategory } from "@prisma/client";

export type RentalOptionRow = {
  id: string;
  name: string;
  category: RentalOptionCategory;
  price: number;
  description: string | null;
  active: boolean;
  assigned?: boolean;
};

const categoryLabels: Record<RentalOptionCategory, string> = {
  INSURANCE: "Insurance",
  EXTRA: "Extra",
  PROTECTION: "Protection",
  ACCESSORY: "Accessory",
};

interface VehicleRentalOptionsChecklistProps {
  options: RentalOptionRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function VehicleRentalOptionsChecklist({
  options,
  selectedIds,
  onChange,
}: VehicleRentalOptionsChecklistProps) {
  const activeOptions = options.filter((option) => option.active);

  if (activeOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rental options configured yet. Add options under Rental Options in the admin sidebar.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((rowId) => rowId !== id));
    }
  };

  return (
    <div className="space-y-2">
      {activeOptions.map((option) => {
        const checked = selectedIds.includes(option.id);
        return (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => toggle(option.id, value === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{option.name}</span>
                <Badge variant="outline">{categoryLabels[option.category]}</Badge>
                <span className="text-sm text-muted-foreground">{formatPrice(option.price)}/day</span>
              </div>
              {option.description && (
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
