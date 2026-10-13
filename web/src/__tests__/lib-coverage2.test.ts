import { beforeEach, describe, expect, it } from "vitest";
import { clearAllStorage, idbDel, readRaw, removeRaw, writeJSON } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { filterFinances } from "@/lib/finance";
import { calcGoalProgress } from "@/lib/goals";
import { downloadCsv, parseCsvText, readAndParseCsvFile } from "@/utils/csv";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useListsStore } from "@/stores/lists";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";

const NOW = new Date(2026, 5, 15, 12).getTime();

function tx(over: Record<string, unknown> = {}) {
  return {
    id: "t",
    description: "X",
    amount: 100,
    category: "Ganhos",
    date: NOW,
    paymentDate: null,
    paymentStatus: true,
    isEnabled: false,
    isFavorited: false,
    ...over,
  };
}

beforeEach(() => {
  clearAllStorage();
  for (const k of [
    "mf-db-v1:migrated-finances",
    "mf-db-v1:migrated-runs",
    "mf-db-v1:migrated-stock",
    "mf-db-v1:migrated-settings",
  ]) {
    removeRaw(k);
  }
  useFinanceStore.setState({
    transactionsList: [],
    search: "",
    selectedtypeofpayment: "0",
    selectedPaymentCategory: "Todos",
    selectedPaymentStatus: "Todos",
    selectedFavoritedFilter: "Todos",
    selectedDateOrderFilter: "Vencimento",
  });
  useGoalsStore.setState({ goals: [], filteredGoals: [], selectedFilter: "Todas" });
  useListsStore.setState({ lists: [], selectedList: null, selectedListItems: [], filteredList: [] });
  useMarketStore.setState({ stockList: [] });
  useRunsStore.setState({ runsList: [] });
});

describe("finance store: setters e ramos", () => {
  it("varre filtros, update nulo, remove por objeto, clear e totais", async () => {
    const s = useFinanceStore.getState();
    s.setSearch("X");
    s.setSelectedCategory("Ganhos");
    s.setSelectedStatus("Pago");
    s.setSelectedFavorited("Todos");
    s.setSelectedType("1");
    s.setSelectedOrder("Pagamento");
    s.setPeriod("01/01/2020", "31/12/2030");
    expect(useFinanceStore.getState().search).toBe("X");

    await useFinanceStore.getState().add(tx({ amount: 50 }));
    expect(useFinanceStore.getState().getIncomings()).toBe(50);
    expect(useFinanceStore.getState().getExpenses()).toBe(0);
    expect(useFinanceStore.getState().getSaldo()).toBe(50);
    expect(useFinanceStore.getState().getListTotal()).toBe(50);

    expect(await useFinanceStore.getState().update("nope", {})).toBeNull();
    const item = useFinanceStore.getState().transactionsList[0];
    await useFinanceStore.getState().handleFavorite({ id: item.id });
    await useFinanceStore.getState().handleFavorite(item.id);
    expect(useFinanceStore.getState().transactionsList[0].isFavorited).toBe(false);
    await useFinanceStore.getState().remove({ id: item.id });
    expect(useFinanceStore.getState().transactionsList).toHaveLength(0);

    await useFinanceStore.getState().add(tx());
    await useFinanceStore.getState().clear();
    expect(useFinanceStore.getState().transactionsList).toHaveLength(0);
  });
});

describe("goals/lists ramos", () => {
  it("goals: remove alias, selectedFilter, getFilteredGoals, delete, update nulo", async () => {
    const g = await useGoalsStore.getState().add({
      description: "G", amount: 10, date: NOW, category: "outros",
    });
    useGoalsStore.getState().setSelectedFilter("Ativas");
    expect(useGoalsStore.getState().getFilteredGoals()).toHaveLength(1);
    expect(await useGoalsStore.getState().update("nope", {})).toBeNull();
    await useGoalsStore.getState().remove(g.id);
    expect(useGoalsStore.getState().goals).toHaveLength(0);
    await useGoalsStore.getState().delete("nope");
  });

  it("lists: stepper, clamp, deleteItem, updateItem, busca, select", async () => {
    const id = await useListsStore.getState().addList({
      description: "C", quantity: 0, amount: 0, date: NOW,
    });
    const item = await useListsStore.getState().addItem({
      list_id: id, description: "A", category: "M", amount: 5,
      quantity: 1, quantityDesired: 1, date: NOW,
    });
    await useListsStore.getState().updateQuantity(item, true);
    expect(useListsStore.getState().selectedListItems[0].quantity).toBe(2);
    await useListsStore.getState().updateQuantity(
      { ...useListsStore.getState().selectedListItems[0], quantity: 0 }, false
    );
    expect(useListsStore.getState().selectedListItems[0].quantity).toBe(0);
    useListsStore.getState().setSearch("A");
    useListsStore.getState().setSelectedCategory("M");
    expect(useListsStore.getState().getFilteredList()).toHaveLength(1);
    await useListsStore.getState().updateItem(item.id, { quantity: 3 });
    expect(useListsStore.getState().selectedListItems[0].quantity).toBe(3);
    await useListsStore.getState().updateItem("nope", {});
    await useListsStore.getState().handleSelect(id);
    expect(useListsStore.getState().selectedList?.id).toBe(id);
    await useListsStore.getState().deleteItem(item.id, id);
    expect(useListsStore.getState().selectedListItems).toHaveLength(0);
    await useListsStore.getState().deleteItem("nope", "");
  });
});

describe("settings: prefixo e clamp", () => {
  it("preview subtrai prefixo e zera negativo", async () => {
    const d = new Date(NOW);
    await useFinanceStore.getState().add(tx({ amount: 100, date: NOW }));
    await useFinanceStore.getState().add(
      tx({ amount: 500, date: NOW, isEnabled: true, category: "Outros", description: "DIZ-alta" })
    );
    await useSettingsStore.getState().update("willUsePrefixToRemoveTihteSum", 1);
    await useSettingsStore.getState().update("prefixTithe", "DIZ");
    expect(
      useSettingsStore.getState().getMonthlyTithePreview(d.getMonth() + 1, d.getFullYear())
    ).toBe(0);
  });
});

describe("coerce com lixo", () => {
  it("market/runs ignoram linhas inválidas", async () => {
    writeJSON("mf-db-v1:stock", [
      null,
      { description: "sem-id" },
      { id: "ok", description: "A", category: "M", amount: 1, quantity: 1, quantityDesired: 1 },
    ]);
    await useMarketStore.getState().load();
    expect(useMarketStore.getState().stockList).toHaveLength(1);

    writeJSON("mf-db-v1:runs", [
      { id: "ok", currentDistance: 1, unityAmount: 1, amount: 1, type: "T", date: NOW, location: "P" },
      { nope: true },
    ]);
    await useRunsStore.getState().load();
    expect(useRunsStore.getState().runsList).toHaveLength(1);
  });
});

describe("csv leitura e download", () => {
  it("readAndParseCsvFile ok e falha de validação", async () => {
    const file = {
      name: "a.csv",
      size: 20,
      text: async () => "description,amount\nArroz,10",
    };
    const ok = await readAndParseCsvFile(file, ["description", "amount"]);
    expect(ok.ok).toBe(true);
    const bad = await readAndParseCsvFile({ name: "a.txt", size: 10, text: async () => "" }, []);
    expect(bad.ok).toBe(false);
  });

  it("downloadCsv sem document não quebra", () => {
    downloadCsv("x.csv", [{ a: 1 }]);
  });

  it("parseCsvText limites", () => {
    expect(parseCsvText("a,b,c\n".repeat(10), []).ok).toBe(true);
    const manyCols = [Array.from({ length: 25 }, (_, i) => `c${i}`).join(",")].join("\n");
    expect(parseCsvText(manyCols, []).ok).toBe(false);
  });
});

describe("miscelânea de cobertura", () => {
  it("cn, idbDel, readRaw, writeJSON circular, calcGoalProgress teto", async () => {
    expect(cn("a", false && "b")).toBe("a");
    await idbDel("mf-db-v1:whatever");
    expect(readRaw("mf-db-v1:nope")).toBeNull();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const { writeJSON: wj } = await import("@/lib/storage");
    wj("mf-db-v1:circ", circular);
    expect(calcGoalProgress({ amount: 100, currentAmount: 250 })).toBe(1);
    expect(calcGoalProgress({ amount: 100, currentAmount: -5 })).toBe(0);
  });

  it("filter: tipo entradas, order desconhecida, pagamento nulo", () => {
    const list = [
      tx({ amount: 10 }),
      tx({ amount: 20, isEnabled: true, category: "M" }),
    ];
    expect(filterFinances(list, { selectedtypeofpayment: "1" })).toHaveLength(1);
    expect(
      filterFinances(list, { selectedDateOrderFilter: "X" } as never)
    ).toHaveLength(2);
  });

  it("aiProviders pula provider sem chave", async () => {
    const { chatWithFallback } = await import("@/utils/aiProviders");
    const { saveProviderKey } = await import("@/utils/secureStore");
    const { setActiveProvider, setFallbackOrder, saveProviderModel } = await import(
      "@/utils/aiProviders"
    );
    await saveProviderKey("gemini", "AIza-x");
    await setActiveProvider("openai");
    await setFallbackOrder(["gemini"]);
    await saveProviderModel("gemini", "gemini-2.5-flash");
    const { vi } = await import("vitest");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "g" }] } }] }),
      }))
    );
    const res = await chatWithFallback("oi");
    expect(res.provider).toBe("gemini");
    vi.unstubAllGlobals();
  });
});
