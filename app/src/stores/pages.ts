import { create } from 'zustand';

type PagesState = {
  selectedSheet: string | null;
  setSelectedSheet: (v: string | null) => void;
};

export const usePagesStore = create<PagesState>((set) => ({
  selectedSheet: null,
  setSelectedSheet: (v) => set({ selectedSheet: v }),
}));
