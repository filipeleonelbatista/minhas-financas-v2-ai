import { create } from 'zustand';
import { marketRepo } from '../repositories/market';

type MarketState = {
  stockList: any[];
  search: string;
  selectedCategory: string;
  load: () => Promise<void>;
  add: (dto: any) => Promise<void>;
  update: (id: string, dto: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setSearch: (v: string) => void;
  getFiltered: () => any[];
};

export const useMarketStore = create<MarketState>((set, get) => ({
  stockList: [],
  search: '',
  selectedCategory: 'Todos',
  load: async () => set({ stockList: await marketRepo.getAll() }),
  add: async (dto) => {
    await marketRepo.add(dto);
    await get().load();
  },
  update: async (id, dto) => {
    await marketRepo.update(id, dto);
    await get().load();
  },
  remove: async (id) => {
    await marketRepo.delete(id);
    await get().load();
  },
  setSearch: (v) => set({ search: v }),
  getFiltered: () => {
    const { stockList, search, selectedCategory } = get();
    let f = stockList;
    if (selectedCategory !== 'Todos') f = f.filter((i) => i.category === selectedCategory);
    if (search) f = f.filter((i) => i.description.includes(search));
    return f;
  },
}));
