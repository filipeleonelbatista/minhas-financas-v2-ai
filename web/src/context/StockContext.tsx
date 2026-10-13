/**
 * Adapter legado → market store (mf-db-v1).
 * Filtros locais (lógica verbatim legada); CRUD via `useMarketStore`.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useMarketStore } from "@/stores/market";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { normalizeStockInput } from "@/lib/normalize";
import { migrateLegacyStock } from "@/lib/migrate";
import type { LegacyStockItem } from "@/types/contexts";
import { StockContext } from "./stock-context";

export function StockContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // assina a store para re-render (valores lidos via getState nos callbacks)
  useMarketStore();
  const stockList = useMarketStore((s) => s.stockList);

  const [selectedTransaction, setSelectedTransaction] = useState<LegacyStockItem | undefined>(
    undefined
  );
  const [selectedCategory, setSelectedCategory] = useState("Todos os itens");
  const [search, setSearch] = useState("");

  const StockList: LegacyStockItem[] = stockList.map((s) => ({ ...s }));

  const filteredList = (() => {
    const byCategory =
      selectedCategory === "Todos os itens"
        ? StockList
        : StockList.filter((item) => item.category === selectedCategory);
    return search === ""
      ? (byCategory ?? [])
      : byCategory.filter((item) => item.description.includes(search));
  })();

  let listTotal = 0;
  for (const item of filteredList) {
    listTotal = listTotal + item.amount * item.quantity;
  }

  const loadTransactions = useCallback(async () => {
    await migrateLegacyStock();
    await useMarketStore.getState().load();
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(
    async (dto: unknown) => {
      await useMarketStore.getState().add(normalizeStockInput(dto as Record<string, unknown>));
      toast({ description: "Item adicionado com sucesso!", variant: "success" });
    },
    [toast]
  );

  const updateTransaction = useCallback(
    async (dto: LegacyStockItem) => {
      await useMarketStore
        .getState()
        .update(dto.id, normalizeStockInput(dto as unknown as Record<string, unknown>));
      toast({ description: "Item atualizado com sucesso!", variant: "success" });
    },
    [toast]
  );

  const updateStock = useCallback(
    async (item: LegacyStockItem, isAdd = false, isSubtract = false) => {
      const quantity = isAdd
        ? Number(item.quantity) + 1
        : isSubtract
          ? Number(item.quantity) - 1
          : item.quantity;
      await useMarketStore.getState().update(item.id, { quantity });
      toast({ description: "Item atualizado com sucesso!", variant: "success" });
    },
    [toast]
  );

  const deleteTransaction = useCallback(
    async (dto: { id: string }) => {
      if (!confirm("Deseja realmete excluir este item? Essa ação é permanente.")) return;
      await useMarketStore.getState().remove(dto.id);
      toast({ description: "Item excluido com sucesso!", variant: "success" });
    },
    [toast]
  );

  const deleteAllTransaction = useCallback(async () => {
    if (confirm("Deseja realmete excluir os dados da tabela Estoque? Essa ação é permanente.")) {
      await useMarketStore.getState().clear();
      toast({ description: "Tabela apagada com sucesso!", variant: "success" });
    } else {
      toast({ description: "Nada foi excluido!", variant: "success" });
    }
  }, [toast]);

  const importTransactions = useCallback(
    async (list: unknown[]) => {
      const rows = Array.isArray(list) ? list : [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        try {
          await useMarketStore
            .getState()
            .add(normalizeStockInput(row as Record<string, unknown>));
        } catch {
          /* pula inválida */
        }
      }
      toast({ description: "Importação conclúida com sucesso!", variant: "success" });
    },
    [toast]
  );

  const setStockList = useCallback(async (list: LegacyStockItem[]) => {
    const valid = [];
    for (const row of list) {
      try {
        const parsed = normalizeStockInput(row as unknown as Record<string, unknown>);
        valid.push({ ...parsed, id: row.id });
      } catch {
        /* pula inválida */
      }
    }
    writeJSON(STORAGE_KEYS.stock, valid);
    await useMarketStore.getState().load();
  }, []);

  return (
    <StockContext.Provider
      value={{
        StockList,
        setStockList,
        filteredList,
        listTotal,
        selectedCategory,
        setSelectedCategory,
        search,
        setSearch,
        selectedTransaction,
        setSelectedTransaction,
        addTransaction,
        updateTransaction,
        updateStock,
        deleteTransaction,
        deleteAllTransaction,
        importTransactions,
        loadTransactions,
      }}
    >
      {children}
    </StockContext.Provider>
  );
}
