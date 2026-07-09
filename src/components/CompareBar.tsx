"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompareStore } from "@/stores/compare";
import { fetchVehiclesByIds } from "@/lib/api";
import { Vehicle } from "@/types";
import { formatVehicleName } from "@/lib/vehicles/display";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CompareBar() {
  const { ids, remove, clear } = useCompareStore();
  const [compareVehicles, setCompareVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (ids.length === 0) {
      setCompareVehicles([]);
      return;
    }
    fetchVehiclesByIds(ids).then(setCompareVehicles).catch(() => setCompareVehicles([]));
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 text-white shadow-2xl border-t border-gray-700"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-300">Compare ({ids.length}/3):</span>
            {compareVehicles.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 text-sm"
              >
                {formatVehicleName(v)}
                <button
                  type="button"
                  onClick={() => remove(v.id)}
                  className="text-gray-400 hover:text-red-400"
                  aria-label={`Remove ${v.make} ${v.model}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={clear} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white">
              Clear
            </button>
            {ids.length >= 2 && (
              <Button asChild size="sm">
                <Link href={`/compare?ids=${ids.join(",")}`}>Compare Now</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
