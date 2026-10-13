/**
 * Tipos da borda legada (pages/components antigos) sobre as novas stores.
 * Os providers em `src/context/*` são adapters finos: mesma API de antes,
 * dados vindos de `src/stores/*` (zustand + mf-db-v1).
 */

/** Transação no formato legado: datas como Date, flags boolean. */
export type LegacyTransaction = {
  id: string;
  description: string;
  about?: string;
  amount: number;
  category: string;
  date: Date;
  paymentDate: Date | "" | null;
  paymentStatus: boolean;
  isEnabled: boolean;
  isFavorited: boolean;
  _status?: string;
  _changed?: string;
};

export type PaymentsContextValue = {
  transactionsList: LegacyTransaction[];
  setTransactionsList: (list: LegacyTransaction[]) => Promise<void>;
  Incomings: number;
  Expenses: number;
  Total: number;
  Tithe: number;
  Saldo: number;
  listTotal: number;
  filteredList: LegacyTransaction[];
  selectedtypeofpayment: string;
  setselectedtypeofpayment: (v: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (v: string) => void;
  filterLabels: string[];
  pamentStatusLabel: string[];
  selectedPaymentStatus: string;
  setSelectedPaymentStatus: (v: string) => void;
  selectedDateOrderFilter: string;
  setSelectedDateOrderFilter: (v: string) => void;
  dateOrderOptions: string[];
  selectedFavoritedFilter: string;
  setSelectedFavoritedFilter: (v: string) => void;
  favoritedFilterLabel: string[];
  categoriesList: string[];
  selectedPaymentCategory: string;
  setSelectedPaymentCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  startDate: Date;
  setStartDate: (d: Date) => void;
  endDate: Date;
  setEndDate: (d: Date) => void;
  selectedTransaction: LegacyTransaction | undefined;
  setSelectedTransaction: (t: LegacyTransaction | undefined) => void;
  addTransaction: (dto: unknown) => Promise<void>;
  updateTransaction: (dto: LegacyTransaction) => Promise<void>;
  deleteTransaction: (dto: { id: string }) => Promise<void>;
  deleteAllTransaction: () => Promise<void>;
  importTransactions: (list: unknown[]) => Promise<void>;
  handleFavorite: (dto: { id: string }) => Promise<void>;
  loadTransactions: () => Promise<void>;
};

/** Item de estoque legado. */
export type LegacyStockItem = {
  id: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  quantityDesired: number;
  _status?: string;
  _changed?: string;
};

export type StockContextValue = {
  StockList: LegacyStockItem[];
  setStockList: (list: LegacyStockItem[]) => Promise<void>;
  filteredList: LegacyStockItem[];
  listTotal: number;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  selectedTransaction: LegacyStockItem | undefined;
  setSelectedTransaction: (t: LegacyStockItem | undefined) => void;
  addTransaction: (dto: unknown) => Promise<void>;
  updateTransaction: (dto: LegacyStockItem) => Promise<void>;
  updateStock: (item: LegacyStockItem, isAdd?: boolean, isSubtract?: boolean) => Promise<void>;
  deleteTransaction: (dto: { id: string }) => Promise<void>;
  deleteAllTransaction: () => Promise<void>;
  importTransactions: (list: unknown[]) => Promise<void>;
  loadTransactions: () => Promise<void>;
};

/** Abastecimento legado: date como Date. */
export type LegacyRunItem = {
  id: string;
  location: string;
  currentDistance: number;
  unityAmount: number;
  amount: number;
  type: string;
  date: Date;
  _status?: string;
  _changed?: string;
};

export type RunsContextValue = {
  FuelList: LegacyRunItem[];
  setFuelList: (list: LegacyRunItem[]) => Promise<void>;
  autonomy: number;
  setAutonomyValue: (v: number) => Promise<void>;
  addTransaction: (dto: unknown) => Promise<void>;
  deleteTransaction: (dto: { id: string }) => Promise<void>;
  deleteAllTransaction: () => Promise<void>;
  importTransactions: (list: unknown[]) => Promise<void>;
  loadTransactions: () => Promise<void>;
};

export type SettingsContextValue = {
  isEnableTitheCard: boolean;
  handleSwitchViewTitheCard: (v: boolean) => Promise<void>;
  willUsePrefixToRemoveTihteSum: boolean;
  handleWillRemovePrefixToRemove: (v: boolean) => Promise<void>;
  prefixTithe: string;
  handleSetPrefixTithe: (v: string) => Promise<void>;
  isEnableTotalHistoryCard: boolean;
  handleSwitchViewTotalHistoryCard: (v: boolean) => Promise<void>;
};
