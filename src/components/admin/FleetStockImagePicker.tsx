"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FLEET_STOCK_IMAGES } from "@/lib/rentals/fleet-stock-images";

interface FleetStockImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  selectedUrls?: string[];
}

export default function FleetStockImagePicker({
  open,
  onOpenChange,
  onSelect,
  selectedUrls = [],
}: FleetStockImagePickerProps) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setPicked([]);
  }, [open]);

  const toggle = (url: string) => {
    setPicked((current) =>
      current.includes(url) ? current.filter((item) => item !== url) : [...current, url]
    );
  };

  const handleConfirm = () => {
    const existing = new Set(selectedUrls);
    const unique = picked.filter((url) => !existing.has(url));
    onSelect(unique);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Browse fleet photos</DialogTitle>
          <DialogDescription>
            Choose from Everest rental fleet photos. The first selected image becomes the cover
            photo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FLEET_STOCK_IMAGES.map((image) => {
            const isSelected = picked.includes(image.url);
            const alreadyUsed = selectedUrls.includes(image.url);

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => !alreadyUsed && toggle(image.url)}
                disabled={alreadyUsed}
                className={cn(
                  "group relative overflow-hidden rounded-lg border text-left transition",
                  isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
                  alreadyUsed && "opacity-50"
                )}
              >
                <div className="relative aspect-[4/3] bg-white">
                  <Image
                    src={image.url}
                    alt={image.label}
                    fill
                    className="object-contain p-2"
                  />
                  {isSelected && (
                    <span className="absolute left-2 top-2 inline-flex rounded-full bg-primary p-1 text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-xs font-medium" title={image.label}>
                  {image.label}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={picked.length === 0}>
            Add {picked.length || ""} image{picked.length === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
