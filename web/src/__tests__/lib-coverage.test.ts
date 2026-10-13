import { beforeEach, describe, expect, it } from "vitest";
import { clearAllStorage, readRaw, removeRaw, writeRaw, writeJSON } from "@/lib/storage";
import { filterFinances } from "@/lib/finance";
import {
  filterGoalsByStatus,
  getDaysRemaining,
  isGoalConcluded,
  normalizeCategory,
} from "@/lib/goals";
import {
  migrateAllLegacy,
  migrateLegacyRuns,
  migrateLegacySettings,
  migrateLegacyStock,
} from "@/lib/migrate";
import { toBool, toTimestamp } from "@/lib/normalize";
import { useFinanceStore } from "@/stores/finance";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";

const NOW = new Date(2026, 5, 15, 12).getTime();

function tx(over: Record<string, unknown> = {}) {
  return {
    id: Math.random().toString(36),
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
  useFinanceStore.setState({ transactionsList: [] });
  useMarketStore.setState({ stockList: [] });
  useRunsStore.setState({ runsList: [] });
});

describe("filterFinances ramos", () => {
  const list = [
    tx({ amount: 200 }),
    tx({ amount: 60, category: "Mercado", isEnabled: true }),
    tx({ amount: 30, category: "Mercado", isEnabled: true, paymentStatus: false, isFavorited: true }),
  ];

  it("status, favoritos e ordenação por pagamento", () => {
    expect(
      filterFinances(list, { selectedPaymentStatus: "Pago" })
    ).toHaveLength(2);
    expect(
      filterFinances(list, { selectedPaymentStatus: "Não Pago" })
    ).toHaveLength(1);
    expect(
      filterFinances(list, { selectedFavoritedFilter: "Favoritos" })
    ).toHaveLength(1);
    expect(
      filterFinances(list, { selectedFavoritedFilter: "Não favoritados" })
    ).toHaveLength(2);
    const byPay = filterFinances(list, {
      selectedDateOrderFilter: "Pagamento",
      startDate: "01/01/2020",
      endDate: "31/12/2030",
    });
    expect(byPay).toHaveLength(3);
  });

  it("período inválido não filtra; lista nula volta []", () => {
    expect(
      filterFinances(list, { startDate: "xx", endDate: "yy" })
    ).toHaveLength(3);
    expect(filterFinances(null as never, {})).toEqual([]);
    expect(filterFinances(list, { selectedPaymentStatus: "X" })).toHaveLength(3);
  });
});

describe("goals helpers", () => {
  it("normalize/calc/days/filter", () => {
    expect(normalizeCategory('')).toBe('outros');
    expect(normalizeCategory(null)).toBe('outros');
    expect(normalizeCategory('FERIAS')).toBe('férias');
    expect(normalizeCategory('Viagem')).toBe('viagem');
    expect(normalizeCategory('Custom Cat')).toBe('custom cat');
    expect(isGoalConcluded({ amount: 0, currentAmount: 0 })).toBe(false);
    expect(getDaysRemaining({}, NOW)).toBe(0);
    expect(getDaysRemaining({ date: NOW + 86400000 }, NOW)).toBe(1);
    const goals = [
      { amount: 100, currentAmount: 100 },
      { amount: 100, currentAmount: 10 },
    ];
    expect(filterGoalsByStatus(goals, 'Ativas')).toHaveLength(1);
    expect(filterGoalsByStatus(goals, 'Concluídas')).toHaveLength(1);
    expect(filterGoalsByStatus(goals, 'Todas')).toHaveLength(2);
    expect(filterGoalsByStatus(goals, 'X')).toHaveLength(2);
  });
});

describe("normalize bordas", () => {
  it("toTimestamp/toBool", () => {
    expect(toTimestamp(true)).toBeNull();
    expect(toTimestamp(NaN)).toBeNull();
    expect(toTimestamp('')).toBeNull();
    expect(toTimestamp('não-data')).toBeNull();
    expect(toTimestamp('123')).toBe(123);
    expect(toBool('true')).toBe(true);
    expect(toBool(0)).toBe(false);
  });
});

describe("migrate domínios", () => {
  it("runs/stock/settings com chaves legadas", async () => {
    writeJSON('runs', [
      { id: 'r1', currentDistance: 10, unityAmount: 5, amount: 50, type: 'T', date: NOW, location: 'P' },
      'lixo',
    ]);
    expect(await migrateLegacyRuns()).toBe(1);
    expect(useRunsStore.getState().runsList).toHaveLength(1);

    writeJSON('stock', [
      { id: 's1', description: 'A', category: 'Mercearia', amount: 1, quantity: 1, quantityDesired: 1 },
    ]);
    expect(await migrateLegacyStock()).toBe(1);
    expect(useMarketStore.getState().stockList).toHaveLength(1);

    writeRaw('@IsEnableTitheCard', 'true');
    writeRaw('@PrefixTithe', '"DIZ"');
    writeRaw('@autonomy', '12.5');
    expect(await migrateLegacySettings()).toBe(3);

    expect(await migrateAllLegacy()).toEqual({ finances: 0, runs: 0, stock: 0, settings: 0 });
  });

  it("pula quando store já tem dados", async () => {
    await useFinanceStore.getState().add({
      description: 'X', amount: 1, category: 'Ganhos', date: NOW,
      paymentDate: null, paymentStatus: true, isEnabled: false, isFavorited: false,
    });
    writeJSON('finances', [{ id: 'z', description: 'Y', amount: 1, category: 'Ganhos', date: NOW, paymentDate: null, paymentStatus: true, isEnabled: false, isFavorited: false }]);
    const { migrateLegacyFinances } = await import('@/lib/migrate');
    expect(await migrateLegacyFinances()).toBe(0);
    expect(readRaw('mf-db-v1:migrated-finances')).toBe('1');
  });
});
