/** Store de listas de compra (2 níveis) — espelha `app/src/stores/lists.ts`. */
import { create } from "zustand";
import {
  listItemSchema,
  listSchema,
  type ListItemZod,
  type ListZod,
} from "../schemas/list.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";

export type ListRow = ListZod & { id: string };
export type ListItemRow = ListItemZod & { id: string };

type ListsState = {
  lists: ListRow[];
  selectedList: ListRow | null;
  selectedListItems: ListItemRow[];
  search: string;
  selectedCategory: string;
  filteredList: ListItemRow[];
  load: () => Promise<void>;
  addList: (dto: unknown) => Promise<string>;
  updateList: (id: string, dto: unknown) => Promise<ListRow | null>;
  addItem: (dto: unknown) => Promise<ListItemRow>;
  handleSelect: (id: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  updateQuantity: (item: ListItemRow, isAdd: boolean) => Promise<void>;
  deleteItem: (id: string, listId: string) => Promise<void>;
  updateItem: (id: string, dto: unknown) => Promise<void>;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  getFilteredList: () => ListItemRow[];
  getListTotal: () => number;
};

function computeFiltered(
  items: ListItemRow[],
  search: string,
  selectedCategory: string
): ListItemRow[] {
  let f = items;
  if (selectedCategory !== "Todos os itens") {
    f = f.filter((i) => i.category === selectedCategory);
  }
  if (search) {
    f = f.filter((i) => String(i.description).includes(search));
  }
  return f;
}

function withFiltered(
  partial: Partial<Pick<ListsState, "selectedListItems" | "search" | "selectedCategory">>,
  current: ListsState
): Partial<ListsState> {
  const items = partial.selectedListItems ?? current.selectedListItems;
  const search = partial.search ?? current.search;
  const category = partial.selectedCategory ?? current.selectedCategory;
  return { ...partial, filteredList: computeFiltered(items, search, category) };
}

function coerceLists(raw: unknown): ListRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ListRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = listSchema.safeParse(rest);
    if (parsed.success) out.push({ ...parsed.data, id });
  }
  return out;
}

function coerceItems(raw: unknown): ListItemRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ListItemRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = listItemSchema.safeParse(rest);
    if (parsed.success) out.push({ ...parsed.data, id });
  }
  return out;
}

function readLists(): ListRow[] {
  return coerceLists(readJSON(STORAGE_KEYS.lists, []));
}

function readItems(): ListItemRow[] {
  return coerceItems(readJSON(STORAGE_KEYS.items, []));
}

function recalcListTotals(lists: ListRow[], items: ListItemRow[], listId: string): ListRow[] {
  const owned = items.filter((i) => i.list_id === listId);
  const totalAmount = owned.reduce((acc, it) => acc + Number(it.amount) * Number(it.quantity), 0);
  const totalQuantity = owned.reduce((acc, it) => acc + Number(it.quantity), 0);
  return lists.map((l) =>
    l.id === listId ? { ...l, amount: totalAmount, quantity: totalQuantity } : l
  );
}

export const useListsStore = create<ListsState>((set, get) => ({
  lists: [],
  selectedList: null,
  selectedListItems: [],
  search: "",
  selectedCategory: "Todos os itens",
  filteredList: [],

  load: async () => {
    set({ lists: readLists() });
  },

  addList: async (dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const parsed = listSchema.parse(data);
    const row: ListRow = {
      ...parsed,
      id: typeof data.id === "string" && data.id ? data.id : newId(),
    };
    const lists = [row, ...readLists()];
    writeJSON(STORAGE_KEYS.lists, lists);
    set({ lists });
    return row.id;
  },

  updateList: async (id: string, dto: unknown) => {
    const lists = readLists();
    const found = lists.find((l) => l.id === id);
    if (!found) return null;
    const data = (dto ?? {}) as Record<string, unknown>;
    const merged = { ...data };
    delete merged.id;
    const parsed = listSchema.parse({ ...found, ...merged });
    const next = lists.map((l) => (l.id === id ? { ...parsed, id } : l));
    writeJSON(STORAGE_KEYS.lists, next);
    const s = get();
    set({
      lists: next,
      selectedList: s.selectedList?.id === id ? { ...parsed, id } : s.selectedList,
    });
    return { ...parsed, id };
  },

  addItem: async (dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const parsed = listItemSchema.parse(data);
    const row: ListItemRow = {
      ...parsed,
      id: typeof data.id === "string" && data.id ? data.id : newId(),
    };
    const items = [row, ...readItems()];
    writeJSON(STORAGE_KEYS.items, items);
    const lists = recalcListTotals(readLists(), items, row.list_id);
    writeJSON(STORAGE_KEYS.lists, lists);
    const s = get();
    set({
      lists,
      selectedList: lists.find((l) => l.id === row.list_id) ?? s.selectedList,
      ...withFiltered({ selectedListItems: items.filter((i) => i.list_id === row.list_id) }, s),
    });
    return row;
  },

  handleSelect: async (id: string) => {
    const lists = readLists();
    const items = readItems().filter((i) => i.list_id === id);
    const list = lists.find((l) => l.id === id) ?? null;
    set({ lists, selectedList: list, ...withFiltered({ selectedListItems: items }, get()) });
  },

  deleteList: async (id: string) => {
    // cascade: apaga header + todos os items com list_id
    const lists = readLists().filter((l) => l.id !== id);
    const items = readItems().filter((i) => i.list_id !== id);
    writeJSON(STORAGE_KEYS.lists, lists);
    writeJSON(STORAGE_KEYS.items, items);
    set({ lists, selectedList: null, ...withFiltered({ selectedListItems: [] }, get()) });
  },

  updateQuantity: async (item: ListItemRow, isAdd: boolean) => {
    const newQty = isAdd ? Number(item.quantity) + 1 : Number(item.quantity) - 1;
    const clamped = newQty < 0 ? 0 : newQty;
    const items = readItems().map((i) => (i.id === item.id ? { ...i, quantity: clamped } : i));
    writeJSON(STORAGE_KEYS.items, items);
    const lists = recalcListTotals(readLists(), items, item.list_id);
    writeJSON(STORAGE_KEYS.lists, lists);
    const s = get();
    set({
      lists,
      ...withFiltered({ selectedListItems: items.filter((i) => i.list_id === item.list_id) }, s),
    });
  },

  deleteItem: async (id: string, listId: string) => {
    const items = readItems().filter((i) => i.id !== id);
    writeJSON(STORAGE_KEYS.items, items);
    const s = get();
    if (listId) {
      const lists = recalcListTotals(readLists(), items, listId);
      writeJSON(STORAGE_KEYS.lists, lists);
      set({
        lists,
        ...withFiltered({ selectedListItems: items.filter((i) => i.list_id === listId) }, s),
      });
    } else {
      set({ ...withFiltered({ selectedListItems: [] }, s) });
    }
  },

  updateItem: async (id: string, dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const items = readItems();
    const found = items.find((i) => i.id === id);
    if (!found) return;
    const merged = { ...data };
    delete merged.id;
    const parsed = listItemSchema.parse({ ...found, ...merged });
    const next = items.map((i) => (i.id === id ? { ...parsed, id } : i));
    writeJSON(STORAGE_KEYS.items, next);
    const targetListId =
      typeof data.list_id === "string" && data.list_id
        ? data.list_id
        : (get().selectedList?.id ?? null);
    const s = get();
    if (targetListId) {
      const lists = recalcListTotals(readLists(), next, targetListId);
      writeJSON(STORAGE_KEYS.lists, lists);
      set({
        lists,
        ...withFiltered(
          { selectedListItems: next.filter((i) => i.list_id === targetListId) },
          s
        ),
      });
    }
  },

  setSearch: (v) => set((s) => ({ ...withFiltered({ search: v }, s) }) as Partial<ListsState>),
  setSelectedCategory: (v) =>
    set((s) => ({ ...withFiltered({ selectedCategory: v }, s) }) as Partial<ListsState>),

  getFilteredList: () => {
    const { selectedListItems, search, selectedCategory } = get();
    return computeFiltered(selectedListItems, search, selectedCategory);
  },

  getListTotal: () => {
    const filtered = get().getFilteredList();
    return filtered.reduce((acc, it) => acc + Number(it.amount) * Number(it.quantity), 0);
  },
}));
