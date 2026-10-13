/** Store de estoque — espelha `app/src/stores/market.ts`. */
import { create } from "zustand";
import { stockSchema, type StockZod } from "../schemas/stock.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";

export type StockRow = StockZod & { id: string };

type MarketState = {
  stockList: StockRow[];
  search: string;
  selectedCategory: string;
  load: () => Promise<void>;
  add: (dto: unknown) => Promise<StockRow>;
  update: (id: string, dto: unknown) => Promise<StockRow | null>;
  remove: (id: string) => Promise<void>;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  getFiltered: () => StockRow[];
};

function coerceList(raw: unknown): StockRow[] {
  if (!Array.isArray(raw)) return [];
  const out: StockRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = stockSchema.safeParse(rest);
    if (parsed.success) out.push({ ...parsed.data, id });
  }
  return out;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  stockList: [],
  search: "",
  selectedCategory: "Todos",

  load: async () => {
    set({ stockList: coerceList(readJSON(STORAGE_KEYS.stock, [])) });
  },

  add: async (dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const parsed = stockSchema.parse(data);
    const row: StockRow = {
      ...parsed,
      id: typeof data.id === "string" && data.id ? data.id : newId(),
    };
    const list = [row, ...get().stockList];
    writeJSON(STORAGE_KEYS.stock, list);
    set({ stockList: list });
    return row;
  },

  update: async (id: string, dto: unknown) => {
    const current = get().stockList;
    const found = current.find((s) => s.id === id);
    if (!found) return null;
    const merged = { ...(dto as Record<string, unknown>) };
    delete merged.id;
    const parsed = stockSchema.parse({ ...found, ...merged });
    const next = current.map((s) => (s.id === id ? { ...parsed, id } : s));
    writeJSON(STORAGE_KEYS.stock, next);
    set({ stockList: next });
    return { ...parsed, id };
  },

  remove: async (id: string) => {
    const next = get().stockList.filter((s) => s.id !== id);
    writeJSON(STORAGE_KEYS.stock, next);
    set({ stockList: next });
  },

  setSearch: (v) => set({ search: v }),
  setSelectedCategory: (v: string) => set({ selectedCategory: v }),

  getFiltered: () => {
    const { stockList, search, selectedCategory } = get();
    let f = stockList;
    if (selectedCategory !== "Todos" && selectedCategory !== "Todos os itens") {
      f = f.filter((i) => i.category === selectedCategory);
    }
    if (search) f = f.filter((i) => i.description.includes(search));
    return f;
  },
}));
