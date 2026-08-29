import { create } from 'zustand';
import dayjs from 'dayjs';
import { financeRepo, filterFinances, FinanceRow } from '../repositories/finance';

type FinanceState = {
  transactionsList: FinanceRow[];
  search: string;
  selectedtypeofpayment: string; // 0 todos 1 entradas 2 saidas
  selectedPaymentCategory: string;
  selectedPaymentStatus: string; // Todos|Pago|Não Pago
  selectedFavoritedFilter: string;
  selectedDateOrderFilter: string; // Vencimento|Pagamento
  startDate: string; // DD/MM/YYYY
  endDate: string;
  // actions
  load: () => Promise<void>;
  add: (dto: any) => Promise<void>;
  update: (id: string, dto: any) => Promise<void>;
  remove: (dto: any) => Promise<void>;
  handleFavorite: (dto: any) => Promise<void>;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedStatus: (v: string) => void;
  setSelectedFavorited: (v: string) => void;
  setSelectedType: (v: string) => void;
  setSelectedOrder: (v: string) => void;
  setPeriod: (start: string, end: string) => void;
  getFilteredList: () => FinanceRow[];
  getListTotal: () => number;
  getSaldo: () => number;
  getIncomings: () => number;
  getExpenses: () => number;
  getTithe: (opts: { percent?: number; categories?: string[]; prefix?: string; willUsePrefix?: boolean }) => number;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactionsList: [],
  search: '',
  selectedtypeofpayment: '0',
  selectedPaymentCategory: 'Todos',
  selectedPaymentStatus: 'Todos',
  selectedFavoritedFilter: 'Todos',
  selectedDateOrderFilter: 'Vencimento',
  startDate: dayjs().startOf('month').format('DD/MM/YYYY'),
  endDate: dayjs().endOf('month').format('DD/MM/YYYY'),
  load: async () => {
    const list = await financeRepo.getAll();
    set({ transactionsList: list });
  },
  add: async (dto) => {
    await financeRepo.add(dto);
    await get().load();
  },
  update: async (id, dto) => {
    await financeRepo.update(id, dto);
    await get().load();
  },
  remove: async (dto) => {
    await financeRepo.delete(dto.id);
    await get().load();
  },
  handleFavorite: async (dto) => {
    await financeRepo.update(dto.id, { isFavorited: dto.isFavorited === 1 ? 0 : 1 });
    await get().load();
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
    return filtered.reduce((acc, it) => (it.isEnabled ? acc - Number(it.amount) : acc + Number(it.amount)), 0);
  },
  getSaldo: () => get().transactionsList.reduce((acc, it) => (it.isEnabled ? acc - Number(it.amount) : acc + Number(it.amount)), 0),
  getIncomings: () => get().getFilteredList().filter((it) => !it.isEnabled).reduce((acc, it) => acc + Number(it.amount), 0),
  getExpenses: () => get().getFilteredList().filter((it) => it.isEnabled).reduce((acc, it) => acc + Number(it.amount), 0),
  getTithe: (opts) => {
    const filtered = get().getFilteredList();
    let soma = 0;
    for (const it of filtered) {
      if (!it.isEnabled && (!opts.categories || opts.categories?.includes(it.category))) soma += Number(it.amount);
      if (it.isEnabled && opts.willUsePrefix && opts.prefix && it.description.includes(opts.prefix)) soma -= Number(it.amount);
    }
    if (soma < 0) soma = 0;
    return (soma * (opts.percent ?? 10)) / 100;
  },
}));
