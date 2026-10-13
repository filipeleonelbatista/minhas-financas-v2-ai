/**
 * Adapter legado → stores zustand (mf-db-v1).
 * Mesma API de antes; filtros e CRUD agora passam por `useFinanceStore`.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useFinanceStore, type FinanceItem } from "@/stores/finance";
import { useSettingsStore } from "@/stores/settings";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { normalizeFinanceInput } from "@/lib/normalize";
import { formatPeriodDate, parsePeriodDate } from "@/lib/format";
import { migrateLegacyFinances } from "@/lib/migrate";
import type { LegacyTransaction } from "@/types/contexts";
import { PaymentsContext } from "./payments-context";

const FAVORITED_FILTER_LABEL = ["Todos", "Favoritos", "Não favoritados"];
const PAYMENT_STATUS_LABEL = ["Todos", "Pago", "Não Pago"];
const DATE_ORDER_OPTIONS = ["Vencimento", "Pagamento"];

const FILTER_LABELS = [
  "Este mês",
  "Próximo mês",
  "Esta semana",
  "Próxima semana",
  "Em duas semanas",
  "Em três semanas",
  "Em quatro semanas",
  "Semana passada",
  "Duas semanas atrás",
  "Três semanas atrás",
  "Quatro semanas atrás",
  "Mês passado",
  "Todos",
];

const CATEGORIES_LIST = [
  "Todos",
  "Outros",
  "Bares e Restaurantes",
  "Beleza",
  "Cartão",
  "Empréstimos",
  "Emergência",
  "Estudos",
  "Ganhos",
  "Investimentos",
  "Mercado",
  "Moradia",
  "Saúde",
  "Streaming",
  "TV/Internet/Telefone",
  "Transporte",
  "Vestuário",
];

function toLegacy(t: FinanceItem): LegacyTransaction {
  return {
    ...t,
    date: new Date(t.date),
    paymentDate: t.paymentDate == null ? "" : new Date(t.paymentDate),
  };
}

export function PaymentsContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const finance = useFinanceStore();
  const settings = useSettingsStore();

  const [selectedTransaction, setSelectedTransaction] = useState<LegacyTransaction | undefined>(
    undefined
  );
  const [selectedPeriod, setSelectedPeriod] = useState("Este mês");

  const startDate = parsePeriodDate(finance.startDate) ?? new Date();
  const endDate = parsePeriodDate(finance.endDate) ?? new Date();

  const setStartDate = useCallback(
    (d: Date) => finance.setPeriod(formatPeriodDate(d), finance.endDate),
    [finance]
  );
  const setEndDate = useCallback(
    (d: Date) => finance.setPeriod(finance.startDate, formatPeriodDate(d)),
    [finance]
  );

  const transactionsList = finance.transactionsList.map(toLegacy);
  const filteredList = finance.getFilteredList().map(toLegacy);

  const tithe = finance.getTithe({
    percent: settings.tithePercent,
    categories: settings.getTitheCategories(),
    prefix: settings.prefixTithe,
    willUsePrefix: settings.willUsePrefixToRemoveTihteSum === 1,
  });

  const loadTransactions = useCallback(async () => {
    await migrateLegacyFinances();
    await finance.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(
    async (dto: unknown) => {
      await finance.add(normalizeFinanceInput(dto as Record<string, unknown>));
      toast({ description: "Item adicionado com sucesso!", variant: "success" });
    },
    [finance, toast]
  );

  const updateTransaction = useCallback(
    async (dto: LegacyTransaction) => {
      await finance.update(dto.id, normalizeFinanceInput(dto as unknown as Record<string, unknown>));
      toast({ description: "Item atualizado com sucesso!", variant: "success" });
    },
    [finance, toast]
  );

  const deleteTransaction = useCallback(
    async (dto: { id: string }) => {
      if (!confirm("Deseja realmente excluir este item? Essa ação é permanente.")) return;
      await finance.remove(dto.id);
      toast({ description: "Item excluido com sucesso!", variant: "success" });
    },
    [finance, toast]
  );

  const deleteAllTransaction = useCallback(async () => {
    if (confirm("Deseja realmente excluir os dados da tabela finanças? Essa ação é permanente.")) {
      await finance.clear();
      toast({ description: "Tabela apagada com sucesso!", variant: "success" });
    } else {
      toast({ description: "Nada foi excluido!", variant: "success" });
    }
  }, [finance, toast]);

  const importTransactions = useCallback(
    async (list: unknown[]) => {
      const rows = Array.isArray(list) ? list : [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        try {
          await finance.add(normalizeFinanceInput(row as Record<string, unknown>));
        } catch {
          /* linha inválida: pula */
        }
      }
      toast({ description: "Importação conclúida com sucesso!", variant: "success" });
    },
    [finance, toast]
  );

  const handleFavorite = useCallback(
    async (dto: { id: string }) => {
      await finance.handleFavorite(dto.id);
      const item = useFinanceStore.getState().transactionsList.find((t) => t.id === dto.id);
      toast({
        description: item?.isFavorited ? "Item favoritado" : "Item desfavoritado",
        variant: "success",
      });
    },
    [finance, toast]
  );

  const setTransactionsList = useCallback(
    async (list: LegacyTransaction[]) => {
      const valid = [];
      for (const row of list) {
        try {
          const parsed = normalizeFinanceInput(row as unknown as Record<string, unknown>);
          valid.push({ ...parsed, id: row.id });
        } catch {
          /* pula inválida */
        }
      }
      writeJSON(STORAGE_KEYS.finances, valid);
      await finance.load();
    },
    [finance]
  );

  return (
    <PaymentsContext.Provider
      value={{
        transactionsList,
        setTransactionsList,
        Incomings: finance.getIncomings(),
        Expenses: finance.getExpenses(),
        Total: finance.getListTotal(),
        Tithe: tithe,
        Saldo: finance.getSaldo(),
        listTotal: finance.getListTotal(),
        filteredList,
        selectedtypeofpayment: finance.selectedtypeofpayment,
        setselectedtypeofpayment: finance.setSelectedType,
        selectedPeriod,
        setSelectedPeriod,
        filterLabels: FILTER_LABELS,
        pamentStatusLabel: PAYMENT_STATUS_LABEL,
        selectedPaymentStatus: finance.selectedPaymentStatus,
        setSelectedPaymentStatus: finance.setSelectedStatus,
        selectedDateOrderFilter: finance.selectedDateOrderFilter,
        setSelectedDateOrderFilter: finance.setSelectedOrder,
        dateOrderOptions: DATE_ORDER_OPTIONS,
        selectedFavoritedFilter: finance.selectedFavoritedFilter,
        setSelectedFavoritedFilter: finance.setSelectedFavorited,
        favoritedFilterLabel: FAVORITED_FILTER_LABEL,
        categoriesList: CATEGORIES_LIST,
        selectedPaymentCategory: finance.selectedPaymentCategory,
        setSelectedPaymentCategory: finance.setSelectedCategory,
        search: finance.search,
        setSearch: finance.setSearch,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        selectedTransaction,
        setSelectedTransaction,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteAllTransaction,
        importTransactions,
        handleFavorite,
        loadTransactions,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  );
}

