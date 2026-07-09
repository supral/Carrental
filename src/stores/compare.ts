"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompareState {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  isComparing: (id: string) => boolean;
}

const MAX_COMPARE = 3;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) =>
        set((state) => {
          if (state.ids.includes(id)) return state;
          if (state.ids.length >= MAX_COMPARE) return state;
          return { ids: [...state.ids, id] };
        }),
      remove: (id) =>
        set((state) => ({ ids: state.ids.filter((i) => i !== id) })),
      toggle: (id) => {
        const { ids, add, remove } = get();
        if (ids.includes(id)) remove(id);
        else add(id);
      },
      clear: () => set({ ids: [] }),
      isComparing: (id) => get().ids.includes(id),
    }),
    { name: "nb-compare" }
  )
);
