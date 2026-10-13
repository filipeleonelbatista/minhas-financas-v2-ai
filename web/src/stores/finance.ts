/** Store de finanças — espelha `app/src/stores/finance.ts` (flags 0/1 viram boolean). */
import { create } from "zustand";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { financeSchema, type FinanceZod } from "../schemas/finance.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";
import { calcTithe, filterFinances, type TitheOpts } from "../lib/finance";

export type FinanceItem = FinanceZod & { id: string };

type FinanceState = {
  transactionsList: FinanceItem[];
  search: string;
  selectedtypeofpayment: string; // 0 todos 1 entradas 2 saidas
  selectedPaymentCategory: string;
  selectedPaymentStatus: string; // Todos|Pago|Não Pago
  selectedFavoritedFilter: string;
  selectedDateOrderFilter: string; // Vencimento|Pagamento
  startDate: string; // DD/MM/YYYY
  endDate: string;
  load: () => Promise<void>;
  add: (dto: unknown) => Promise<FinanceItem>;
  update: (id: string, dto: unknown) => Promise<FinanceItem | null>;
  remove: (idOrDto: string | { id: string }) => Promise<void>;
  clear: () => Promise<void>;
  handleFavorite: (idOrDto: string | { id: string }) => Promise<void>;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedStatus: (v: string) => void;
  setSelectedFavorited: (v: string) => void;
  setSelectedType: (v: string) => void;
  setSelectedOrder: (v: string) => void;
  setPeriod: (start: string, end: string) => void;
  getFilteredList: () => FinanceItem[];
  getListTotal: () => number;
  getSaldo: () => number;
  getIncomings: () => number;
  getExpenses: () => number;
  getTithe: (opts: TitheOpts) => number;
};

function resolveId(idOrDto: string | { id: string }): string {
  return typeof idOrDto === "string" ? idOrDto : idOrDto.id;
}

function persist(list: FinanceItem[]): void {
  writeJSON(STORAGE_KEYS.finances, list);
}

function coerceList(raw: unknown): FinanceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FinanceItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = financeSchema.safeParse(rest);
    if (parsed.success) out.push({ ...parsed.data, id });
  }
  return out;
}

const now = new Date();

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactionsList: [],
  search: "",
  selectedtypeofpayment: "0",
  selectedPaymentCategory: "Todos",
  selectedPaymentStatus: "Todos",
  selectedFavoritedFilter: "Todos",
  selectedDateOrderFilter: "Vencimento",
  startDate: format(startOfMonth(now), "dd/MM/yyyy"),
  endDate: format(endOfMonth(now), "dd/MM/yyyy"),

  load: async () => {
    set({ transactionsList: coerceList(readJSON(STORAGE_KEYS.finances, [])) });
  },

  clear: async () => {
    persist([]);
    set({ transactionsList: [] });
  },

  add: async (dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const parsed = financeSchema.parse(data);
    const item: FinanceItem = { ...parsed, id: typeof data.id === "string" && data.id ? data.id : newId() };
    const list = [item, ...get().transactionsList];
    persist(list);
    set({ transactionsList: list });
    return item;
  },

  update: async (id: string, dto: unknown) => {
    const current = get().transactionsList;
    const found = current.find((t) => t.id === id);
    if (!found) return null;
    const merged = { ...(dto as Record<string, unknown>) };
    delete merged.id;
    const parsed = financeSchema.parse({ ...found, ...merged });
    const next = current.map((t) => (t.id === id ? { ...parsed, id } : t));
    persist(next);
    set({ transactionsList: next });
    return { ...parsed, id };
  },

  remove: async (idOrDto: string | { id: string }) => {
    const id = resolveId(idOrDto);
    const next = get().transactionsList.filter((t) => t.id !== id);
    persist(next);
    set({ transactionsList: next });
  },

  handleFavorite: async (idOrDto: string | { id: string }) => {
    const id = resolveId(idOrDto);
    const next = get().transactionsList.map((t) =>
      t.id === id ? { ...t, isFavorited: !t.isFavorited } : t
    );
    persist(next);
    set({ transactionsList: next });
  },

  setSearch: (v) => set({ search: v }),
  setSelectedCategory: (v) => set({ selectedPaymentCategory: v }),
  setSelectedStatus: (v) => set({ selectedPaymentStatus: v }),
  setSelectedFavorited: (v) => set({ selectedFavoritedFilter: v }),
  setSelectedType: (v) => set({ selectedtypeofpayment: v }),
  setSelectedOrder: (v) => set({ selectedDateOrderFilter: v }),
  setPeriod: (start, end) => set({ startDate: start, endDate: end }),

  getFilteredList: () => {
    const s = get();
    return filterFinances(s.transactionsList, {
      selectedtypeofpayment: s.selectedtypeofpayment,
      search: s.search,
      selectedPaymentCategory: s.selectedPaymentCategory,
      selectedPaymentStatus: s.selectedPaymentStatus,
      selectedFavoritedFilter: s.selectedFavoritedFilter,
      selectedDateOrderFilter: s.selectedDateOrderFilter,
      startDate: s.startDate,
      endDate: s.endDate,
    });
  },

  getListTotal: () => {
    const filtered = get().getFilteredList();
    return filtered.reduce(
      (acc, it) => (it.isEnabled ? acc - Number(it.amount) : acc + Number(it.amount)),
      0
    );
  },

  getSaldo: () =>
    get().transactionsList.reduce(
      (acc, it) => (it.isEnabled ? acc - Number(it.amount) : acc + Number(it.amount)),
      0
    ),

  getIncomings: () =>
    get()
      .getFilteredList()
      .filter((it) => !it.isEnabled)
      .reduce((acc, it) => acc + Number(it.amount), 0),

  getExpenses: () =>
    get()
      .getFilteredList()
      .filter((it) => it.isEnabled)
      .reduce((acc, it) => acc + Number(it.amount), 0),

  getTithe: (opts) => calcTithe(get().getFilteredList(), opts),
}));
