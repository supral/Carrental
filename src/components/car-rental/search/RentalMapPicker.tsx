"use client";

import SiteMapEmbed from "@/components/shared/SiteMapEmbed";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface RentalMapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
}

export default function RentalMapPicker({
  open,
  onOpenChange,
  fieldLabel,
}: RentalMapPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden border-0 p-0 sm:rounded-2xl [&>button]:z-10 [&>button]:bg-white/90 [&>button]:shadow-sm">
        <DialogTitle className="sr-only">Map for {fieldLabel}</DialogTitle>
        <SiteMapEmbed heightClassName="h-[min(75vh,560px)] min-h-[300px]" className="grayscale-0" />
      </DialogContent>
    </Dialog>
  );
}
