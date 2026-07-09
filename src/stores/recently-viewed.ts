"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentlyViewedState {
  ids: string[];
  add: (id: string) => void;
  clear: () => void;
}

const MAX_RECENT = 12;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) =>
        set((state) => {
          const filtered = state.ids.filter((i) => i !== id);
          return { ids: [id, ...filtered].slice(0, MAX_RECENT) };
        }),
      clear: () => set({ ids: [] }),
    }),
    { name: "nb-recently-viewed" }
  )
);
