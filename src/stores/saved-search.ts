"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SavedSearch, VehicleSearchParams } from "@/types";

interface SavedSearchState {
  searches: SavedSearch[];
  save: (name: string, params: VehicleSearchParams) => void;
  remove: (id: string) => void;
}

export const useSavedSearchStore = create<SavedSearchState>()(
  persist(
    (set) => ({
      searches: [],
      save: (name, params) =>
        set((state) => ({
          searches: [
            {
              id: crypto.randomUUID(),
              name,
              params,
              createdAt: new Date().toISOString(),
            },
            ...state.searches,
          ].slice(0, 10),
        })),
      remove: (id) =>
        set((state) => ({
          searches: state.searches.filter((s) => s.id !== id),
        })),
    }),
    { name: "nb-saved-searches" }
  )
);
