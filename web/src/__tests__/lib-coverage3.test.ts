import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllStorage, idbGet, removeRaw } from "@/lib/storage";
import {
  dateInputToTs,
  formatBRL,
  formatDateBR,
  nowTs,
  tsToDateInput,
} from "@/lib/format";
import { normalizeCategory } from "@/lib/goals";
import { sanitizeFileName } from "@/utils/sanitize";
import { getSecureValue } from "@/utils/secureStore";
import { readAndParseCsvFile } from "@/utils/csv";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";
import { writeJSON } from "@/lib/storage";

const NOW = new Date(2026, 5, 15, 12).getTime();

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
    selectedtypeofpayment: "0",
    selectedPaymentCategory: "Todos",
    selectedPaymentStatus: "Todos",
    selectedFavoritedFilter: "Todos",
    selectedDateOrderFilter: "Vencimento",
  });
  useMarketStore.setState({ stockList: [] });
  useRunsStore.setState({ runsList: [] });
  useGoalsStore.setState({ goals: [], filteredGoals: [] });
});

describe("format total", () => {
  it("cobre helpers de data e moeda", async () => {
    expect(dateInputToTs("2026-06-15")).toBe(new Date(2026, 5, 15, 12).getTime());
    expect(typeof dateInputToTs("invalida")).toBe("number");
    expect(tsToDateInput(NOW)).toBe("2026-06-15");
    expect(typeof nowTs()).toBe("number");
    expect(formatDateBR(NOW)).toContain("2026");
    expect(formatBRL("10")).toContain("10,00");
    expect(normalizeCategory(123 as unknown as string)).toBe("123");
    expect(normalizeCategory("   ")).toBe("outros");
    expect(sanitizeFileName("////")).toBe("file");
    expect(await getSecureValue(123 as unknown as string)).toBeNull();
  });
});

describe("stores ramos finais", () => {
  it("settings: config inválida, update inválido, mês estranho", async () => {
    writeJSON("mf-db-v1:config", "lixo");
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().tithePercent).toBe(10);
    await expect(
      useSettingsStore.getState().update("tithePercent", 999)
    ).rejects.toThrow();
    const d = new Date(NOW);
    await useFinanceStore.getState().add({
      description: "X", amount: 10, category: "Ganhos", date: NOW,
      paymentDate: null, paymentStatus: true, isEnabled: false, isFavorited: false,
    });
    expect(
      useSettingsStore.getState().getMonthlyTithePreview(d.getMonth() + 1, 1999)
    ).toBe(0);
  });

  it("goals/market/runs: ícones, selects e ordem", async () => {
    const g = await useGoalsStore.getState().add({
      description: "G", amount: 10, date: NOW, category: "outros", icon: "star",
    });
    expect(g.icon).toBe("star");
    await useGoalsStore.getState().update(g.id, { icon: "" });
    expect(useGoalsStore.getState().goals[0].icon).toBe("star");

    await useMarketStore.getState().add({
      description: "A", category: "M", amount: 1, quantity: 1, quantityDesired: 1,
    });
    useMarketStore.getState().setSelectedCategory("Todos");
    expect(useMarketStore.getState().getFiltered()).toHaveLength(1);

    await useRunsStore.getState().add({
      currentDistance: 1, unityAmount: 1, amount: 1, type: "T", date: NOW, location: "P",
    });
    await useRunsStore.getState().add({
      currentDistance: 2, unityAmount: 1, amount: 1, type: "T", date: NOW + 1, location: "Q",
    });
    expect(useRunsStore.getState().getEstimative(5)).toBeGreaterThan(0);
  });

  it("finance: ordenação desc e toggle favorito volta", async () => {
    useFinanceStore.getState().setPeriod("01/01/2020", "31/12/2030");
    await useFinanceStore.getState().add({
      description: "A", amount: 1, category: "Ganhos", date: NOW,
      paymentDate: null, paymentStatus: true, isEnabled: false, isFavorited: false,
    });
    await useFinanceStore.getState().add({
      description: "B", amount: 2, category: "Ganhos", date: NOW + 1000,
      paymentDate: null, paymentStatus: true, isEnabled: false, isFavorited: false,
    });
    const list = useFinanceStore.getState().getFilteredList();
    expect(list[0].date).toBeGreaterThanOrEqual(list[1].date);
  });
});

describe("csv leitura falha e aiProviders tudo-falha", () => {
  it("readAndParseCsvFile sem texto", async () => {
    const bad = await readAndParseCsvFile(
      {
        name: "a.csv",
        size: 10,
        text: async () => {
          throw new Error("x");
        },
      },
      []
    );
    expect(bad.ok).toBe(false);
  });

  it("chatWithFallback propaga último erro", async () => {
    const { chatWithFallback } = await import("@/utils/aiProviders");
    const { saveProviderKey } = await import("@/utils/secureStore");
    const { setActiveProvider, saveProviderModel } = await import("@/utils/aiProviders");
    await saveProviderKey("openai", "sk-x");
    await setActiveProvider("openai");
    await saveProviderModel("openai", "gpt-3.5-turbo");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede");
      })
    );
    await expect(chatWithFallback("oi")).rejects.toThrow("rede");
    vi.unstubAllGlobals();
  });

  it("idbGet sem chave volta fallback", async () => {
    expect(await idbGet("mf-db-v1:ausente", "fb")).toBe("fb");
  });
});
