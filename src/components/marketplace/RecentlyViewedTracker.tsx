"use client";

import { useEffect } from "react";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";

export default function RecentlyViewedTracker({ vehicleId }: { vehicleId: string }) {
  const add = useRecentlyViewedStore((s) => s.add);

  useEffect(() => {
    add(vehicleId);
  }, [vehicleId, add]);

  return null;
}
