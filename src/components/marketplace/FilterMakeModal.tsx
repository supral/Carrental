"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterMakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  makes: string[];
  selected: string[];
  onApply: (selected: string[]) => void;
}

export default function FilterMakeModal({
  open,
  onOpenChange,
  makes,
  selected,
  onApply,
}: FilterMakeModalProps) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const filtered = useMemo(
    () => makes.filter((m) => m.toLowerCase().includes(search.toLowerCase())),
    [makes, search]
  );

  const toggle = (make: string) => {
    setLocalSelected((prev) =>
      prev.includes(make) ? prev.filter((m) => m !== make) : [...prev, make]
    );
  };

  const handleApply = () => {
    onApply(localSelected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setLocalSelected(selected); }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Make</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search makes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-1 py-2">
          <AnimatePresence>
            {filtered.map((make) => (
              <motion.label
                key={make}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={localSelected.includes(make)}
                  onCheckedChange={() => toggle(make)}
                />
                <Label className="cursor-pointer flex-1">{make}</Label>
              </motion.label>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No makes found</p>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocalSelected([])}
          >
            Clear
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply {localSelected.length > 0 && `(${localSelected.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
