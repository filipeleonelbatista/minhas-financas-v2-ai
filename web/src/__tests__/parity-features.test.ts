import { beforeEach, describe, expect, it } from "vitest";
import {
  calcHero,
  expensesByCategory,
  last6Months,
  stockAlerts,
  urgentGoals,
} from "@/lib/dashboard";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useListsStore } from "@/stores/lists";
import { useSettingsStore } from "@/stores/settings";
import { clearAllStorage } from "@/lib/storage";

const DAY = 24 * 60 * 60 * 1000;
// 15/06/2026 12:00 local
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

function tx(over: Record<string, unknown> = {}) {
  return {
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
  useFinanceStore.setState({ transactionsList: [] });
  useGoalsStore.setState({ goals: [], filteredGoals: [] });
  useListsStore.setState({ lists: [], selectedList: null, selectedListItems: [], filteredList: [] });
  useSettingsStore.setState({ tithePayments: [] });
});

describe("dashboard selectors", () => {
  it("calcHero soma entradas/saídas/saldo", () => {
    const hero = calcHero([
      { ...tx({ amount: 200 }) },
      { ...tx({ amount: 50, isEnabled: true, category: "Mercado" }) },
    ]);
    expect(hero).toEqual({ incomings: 200, expenses: 50, saldo: 150 });
  });

  it("expensesByCategory agrega só saídas", () => {
    const by = expensesByCategory([
      { ...tx({ amount: 200 }) },
      { ...tx({ amount: 30, isEnabled: true, category: "Mercado" }) },
      { ...tx({ amount: 20, isEnabled: true, category: "Mercado" }) },
    ]);
    expect(by).toEqual([{ category: "Mercado", total: 50 }]);
  });

  it("last6Months preenche 6 baldes terminando no mês atual", () => {
    const jan = new Date(2026, 0, 10, 12).getTime();
    const buckets = last6Months(
      [
        { ...tx({ amount: 300, date: jan }) },
        { ...tx({ amount: 40, isEnabled: true, category: "Mercado", date: NOW }) },
      ],
      NOW
    );
    expect(buckets).toHaveLength(6);
    expect(buckets[0]).toMatchObject({ incomings: 300, expenses: 0 });
    expect(buckets[5]).toMatchObject({ incomings: 0, expenses: 40 });
  });

  it("urgentGoals só metas 0-30 dias não concluídas", () => {
    const list = [
      { id: "u", description: "U", amount: 100, currentAmount: 10, date: NOW + 10 * DAY, category: "outros", icon: "target" },
      { id: "v", description: "V", amount: 100, currentAmount: 10, date: NOW + 90 * DAY, category: "outros", icon: "target" },
      { id: "c", description: "C", amount: 100, currentAmount: 100, date: NOW + 5 * DAY, category: "outros", icon: "target" },
    ];
    expect(urgentGoals(list, NOW).map((g) => g.id)).toEqual(["u"]);
  });

  it("stockAlerts separa em falta e quase", () => {
    const { missing, near } = stockAlerts([
      { id: "a", description: "A", category: "Mercearia", amount: 1, quantity: 0, quantityDesired: 2 },
      { id: "b", description: "B", category: "Mercearia", amount: 1, quantity: 1, quantityDesired: 2 },
      { id: "c", description: "C", category: "Mercearia", amount: 1, quantity: 5, quantityDesired: 2 },
    ]);
    expect(missing.map((i) => i.id)).toEqual(["a"]);
    expect(near.map((i) => i.id)).toEqual(["b"]);
  });
});

describe("fluxos de paridade via stores", () => {
  it("finanças: cascata tipo+categoria filtra", async () => {
    await useFinanceStore.getState().add(tx({ amount: 100, category: "Ganhos" }));
    await useFinanceStore.getState().add(tx({ amount: 60, category: "Mercado", isEnabled: true }));
    const s = useFinanceStore.getState();
    s.setSelectedType("2");
    s.setSelectedCategory("Mercado");
    // período default = mês atual cobre NOW? NOW é 2026 — ajusta período p/ conter
    s.setPeriod("01/01/2020", "31/12/2030");
    expect(useFinanceStore.getState().getFilteredList()).toHaveLength(1);
  });

  it("listas: addItem recalcula totais; deleteList cascade", async () => {
    const lists = useListsStore.getState();
    const id = await lists.addList({ description: "Compra", quantity: 0, amount: 0, date: NOW });
    await useListsStore.getState().addItem({
      list_id: id,
      description: "Arroz",
      category: "Mercearia",
      amount: 10,
      quantity: 2,
      quantityDesired: 1,
      date: NOW,
    });
    expect(useListsStore.getState().getListTotal()).toBe(20);
    await useListsStore.getState().deleteList(id);
    expect(useListsStore.getState().lists).toHaveLength(0);
    expect(useListsStore.getState().getListTotal()).toBe(0);
  });

  it("metas: depósito conclui e filtro Concluídas acha", async () => {
    await useGoalsStore.getState().add({ description: "V", amount: 100, currentAmount: 0, date: NOW, category: "viagem" });
    const g = useGoalsStore.getState().goals[0];
    await useGoalsStore.getState().update(g.id, { currentAmount: 100 });
    useGoalsStore.getState().setFilter("Concluídas");
    expect(useGoalsStore.getState().getFilteredGoals()).toHaveLength(1);
  });

  it("dízimo: markAsPaid lança saída e registra pagamento", async () => {
    const d = new Date(NOW);
    await useFinanceStore.getState().add(tx({ amount: 1000, date: NOW }));
    const row = await useSettingsStore
      .getState()
      .markAsPaid(d.getMonth() + 1, d.getFullYear());
    expect(row.amount).toBe(100);
    const saidas = useFinanceStore
      .getState()
      .transactionsList.filter((t) => t.isEnabled && t.description.startsWith("Dízimo -"));
    expect(saidas).toHaveLength(1);
    expect(useSettingsStore.getState().tithePayments).toHaveLength(1);
  });
});

