import { create } from 'zustand';
import { listRepo } from '../repositories/list';

type ListsState = {
  lists: any[];
  selectedList: any | null;
  selectedListItems: any[];
  search: string;
  selectedCategory: string;
  load: () => Promise<void>;
  addList: (dto: any) => Promise<string>;
  addItem: (dto: any) => Promise<void>;
  handleSelect: (id: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  updateQuantity: (item: any, isAdd: boolean) => Promise<void>;
  deleteItem: (id: string, listId: string) => Promise<void>;
  updateItem: (id: string, dto: any) => Promise<void>;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  getFilteredList: () => any[];
  getListTotal: () => number;
  filteredList: any[];
};

function computeFiltered(selectedListItems: any[], search: string, selectedCategory: string) {
  let f = selectedListItems;
  if (selectedCategory !== 'Todos os itens') {
    f = f.filter((i) => i.category === selectedCategory);
  }
  if (search) {
    f = f.filter((i) => String(i.description).includes(search));
  }
  return f;
}

async function recalcListTotals(listId: string) {
  try {
    const items = await listRepo.getItems(listId);
    const totalAmount = items.reduce((acc: number, it: any) => acc + Number(it.amount) * Number(it.quantity), 0);
    const totalQuantity = items.reduce((acc: number, it: any) => acc + Number(it.quantity), 0);
    await listRepo.update(listId, { amount: totalAmount, quantity: totalQuantity });
  } catch {}
}

export const useListsStore = create<ListsState>((set, get) => ({
  lists: [],
  selectedList: null,
  selectedListItems: [],
  search: '',
  selectedCategory: 'Todos os itens',

  load: async () => {
    const lists = await listRepo.getAll();
    set({ lists });
  },

  addList: async (dto: any) => {
    const row = await listRepo.add(dto);
    await get().load();
    return row.id as string;
  },

  addItem: async (dto: any) => {
    await listRepo.addItem(dto);
    await get().handleSelect(dto.list_id);
    await recalcListTotals(dto.list_id);
    await get().load();
  },

  handleSelect: async (id: string) => {
    const items = await listRepo.getItems(id);
    const all = await listRepo.getAll();
    const list = all.find((l: any) => l.id === id) ?? null;
    set({ selectedList: list, selectedListItems: items });
  },

  deleteList: async (id: string) => {
    await listRepo.delete(id);
    set({ selectedList: null, selectedListItems: [] });
    await get().load();
  },

  updateQuantity: async (item: any, isAdd: boolean) => {
    const newQty = isAdd ? Number(item.quantity) + 1 : Number(item.quantity) - 1;
    const clamped = newQty < 0 ? 0 : newQty;
    await listRepo.updateItem(item.id, { quantity: clamped });
    await recalcListTotals(item.list_id);
    await get().handleSelect(item.list_id);
    await get().load();
  },
  deleteItem: async (id: string, listId: string) => {
    await listRepo.deleteItem(id);
    if (listId) {
      await recalcListTotals(listId);
      await get().handleSelect(listId);
    }
    await get().load();
  },
  updateItem: async (id: string, dto: any) => {
    await listRepo.updateItem(id, dto);
    const listId = dto.list_id ?? (await listRepo.getItems(dto.list_id).then(() => dto.list_id).catch(() => null));
    // Try to get listId from dto or from current selectedList
    const targetListId = dto.list_id ?? get().selectedList?.id ?? null;
    if (targetListId) {
      await recalcListTotals(targetListId);
      await get().handleSelect(targetListId);
    }
    await get().load();
  },

  setSearch: (v: string) => set({ search: v }),
  setSelectedCategory: (v: string) => set({ selectedCategory: v }),

  getFilteredList: () => {
    const { selectedListItems, search, selectedCategory } = get();
    return computeFiltered(selectedListItems, search, selectedCategory);
  },

  getListTotal: () => {
    const filtered = get().getFilteredList();
    return filtered.reduce((acc: number, it: any) => acc + Number(it.amount) * Number(it.quantity), 0);
  },

  // placeholder, will be overridden by patched getState to stay live
  filteredList: [],
}));

// Ensure filteredList behaves as a derived getter: patch getState to inject live computed value
const _store: any = useListsStore;
if (_store && typeof _store.getState === 'function') {
  const originalGetState = _store.getState.bind(_store);
  (_store as any).getState = () => {
    const state = originalGetState();
    const filtered = computeFiltered(state.selectedListItems ?? [], state.search ?? '', state.selectedCategory ?? 'Todos os itens');
    // Return proxy-like object where filteredList is always up-to-date
    return Object.defineProperty({ ...state }, 'filteredList', {
      get() {
        // recompute from latest state snapshot's fields (captured)
        return computeFiltered(state.selectedListItems ?? [], state.search ?? '', state.selectedCategory ?? 'Todos os itens');
      },
      enumerable: true,
      configurable: true,
    }) as any;
  };
  // Also keep base state shape in sync for Zustand's subscribe: update filteredList value on every set
  // Subscribe to keep underlying state's filteredList field updated (optional, for selectors using shallow)
  _store.subscribe((s: any) => {
    // no-op, patch is via getState
  });
}
