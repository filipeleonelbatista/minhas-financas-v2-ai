import { beforeEach, describe, expect, it } from "vitest";
import { clearAllStorage, removeRaw } from "@/lib/storage";
import { useMarketStore } from "@/stores/market";
import { useListsStore } from "@/stores/lists";
import { useRunsStore, calcRunEstimative } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";

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
  useMarketStore.setState({ stockList: [], search: "", selectedCategory: "Todos" });
  useListsStore.setState({
    lists: [],
    selectedList: null,
    selectedListItems: [],
    search: "",
    selectedCategory: "Todos os itens",
    filteredList: [],
  });
  useRunsStore.setState({ runsList: [] });
});

describe("market store", () => {
  it("CRUD + clear + filtro", async () => {
    const added = await useMarketStore.getState().add({
      description: "Arroz",
      category: "Mercearia",
      amount: 10,
      quantity: 2,
      quantityDesired: 1,
    });
    expect(useMarketStore.getState().stockList).toHaveLength(1);
    await useMarketStore.getState().update(added.id, { quantity: 5 });
    expect(useMarketStore.getState().stockList[0].quantity).toBe(5);
    expect(await useMarketStore.getState().update("inexistente", { quantity: 1 })).toBeNull();

    useMarketStore.getState().setSearch("Arr");
    useMarketStore.getState().setSelectedCategory("Mercearia");
    expect(useMarketStore.getState().getFiltered()).toHaveLength(1);
    useMarketStore.getState().setSelectedCategory("Carnes");
    expect(useMarketStore.getState().getFiltered()).toHaveLength(0);
    useMarketStore.getState().setSelectedCategory("Todos os itens");
    useMarketStore.getState().setSearch("");
    expect(useMarketStore.getState().getFiltered()).toHaveLength(1);

    await useMarketStore.getState().remove(added.id);
    expect(useMarketStore.getState().stockList).toHaveLength(0);
    await useMarketStore.getState().add({
      description: "X",
      category: "Outros",
      amount: 1,
      quantity: 1,
      quantityDesired: 1,
    });
    await useMarketStore.getState().clear();
    expect(useMarketStore.getState().stockList).toHaveLength(0);
  });
});

describe("lists store", () => {
  it("updateList edita cabeçalho e retorna null se inexistente", async () => {
    const id = await useListsStore.getState().addList({
      description: "Semana",
      location: null,
      quantity: 0,
      amount: 0,
      date: NOW,
    });
    const updated = await useListsStore.getState().updateList(id, {
      description: "Mês",
      location: "Mercado",
    });
    expect(updated?.description).toBe("Mês");
    expect(updated?.location).toBe("Mercado");
    expect(useListsStore.getState().lists[0].description).toBe("Mês");
    expect(await useListsStore.getState().updateList("inexistente", { description: "X" })).toBeNull();
  });
});

describe("runs store", () => {
  it("CRUD + clear + estimativa", async () => {
    const dto = {
      currentDistance: 10000,
      unityAmount: 5,
      amount: 100,
      type: "Gasolina comum",
      date: NOW,
      location: "Posto",
    };
    const added = await useRunsStore.getState().add(dto);
    expect(useRunsStore.getState().runsList).toHaveLength(1);
    await useRunsStore.getState().update(added.id, { location: "Outro" });
    expect(useRunsStore.getState().runsList[0].location).toBe("Outro");
    expect(await useRunsStore.getState().update("inexistente", {})).toBeNull();

    expect(useRunsStore.getState().getEstimative(10)).toBe(10000 + (10 * 100) / 5);
    expect(useRunsStore.getState().calcEstimative(null, 10)).toBe(0);
    expect(calcRunEstimative({ currentDistance: 5, unityAmount: 0, amount: 10 }, 10)).toBe(5);

    await useRunsStore.getState().remove({ id: added.id });
    expect(useRunsStore.getState().runsList).toHaveLength(0);
    await useRunsStore.getState().remove("sem-id");
    await useRunsStore.getState().remove({} as { id: string });
    await useRunsStore.getState().add(dto);
    await useRunsStore.getState().clear();
    expect(useRunsStore.getState().runsList).toHaveLength(0);
    expect(useRunsStore.getState().getEstimative(10)).toBe(0);
  });
});

describe("settings store", () => {
  it("load/update/tema/toggles/categorias", async () => {
    const st = useSettingsStore.getState();
    await st.load();
    expect(useSettingsStore.getState().tithePercent).toBe(10);

    await useSettingsStore.getState().update("prefixTithe", "DIZ");
    expect(useSettingsStore.getState().prefixTithe).toBe("DIZ");

    await useSettingsStore.getState().setColorMode("dark");
    expect(useSettingsStore.getState().colorModeState).toBe("dark");
    await useSettingsStore.getState().toggleColorMode();
    expect(useSettingsStore.getState().colorModeState).toBe("light");
    await useSettingsStore.getState().setColorMode("invalido");
    expect(useSettingsStore.getState().colorModeState).toBe("light");

    expect(useSettingsStore.getState().getTitheCategories()).toEqual(["Ganhos"]);
    await useSettingsStore.getState().update("titheCategories", "lixo");
    expect(useSettingsStore.getState().getTitheCategories()).toEqual(["Ganhos"]);
  });
});
