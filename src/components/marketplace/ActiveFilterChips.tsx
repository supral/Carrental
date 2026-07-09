"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveFilterChips } from "@/lib/search-params";
import { VehicleSearchParams } from "@/types";

interface ActiveFilterChipsProps {
  params: VehicleSearchParams;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilterChips({ params, onRemove, onClearAll }: ActiveFilterChipsProps) {
  const chips = getActiveFilterChips(params);

  if (chips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex flex-wrap items-center gap-2 mb-6"
    >
      <span className="text-sm text-muted-foreground mr-1">Active filters:</span>
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => (
          <motion.div
            key={chip.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge className="gap-1 pl-3 pr-1 py-1.5 bg-accent text-accent-foreground border-red-200">
              <span className="text-gray-500">{chip.label}:</span> {chip.value}
              <button
                type="button"
                onClick={() => onRemove(chip.key)}
                className="ml-1 rounded-full p-0.5 hover:bg-red-200"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button variant="ghost" size="sm" onClick={onClearAll} className="text-primary">
        Clear all
      </Button>
    </motion.div>
  );
}
