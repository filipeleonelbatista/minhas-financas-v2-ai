import { beforeEach, describe, expect, it } from "vitest";
import { financeSchema } from "@/schemas/finance.zod";
import { runSchema } from "@/schemas/run.zod";
import { stockSchema } from "@/schemas/stock.zod";
import { listItemSchema, listSchema } from "@/schemas/list.zod";
import { goalSchema } from "@/schemas/goal.zod";
import { configSchema } from "@/schemas/config.zod";
import { useFinanceStore } from "@/stores/finance";
import { clearAllStorage } from "@/lib/storage";

const baseFinance = {
  description: "Salário",
  amount: 100,
  category: "Ganhos",
  date: 1,
  paymentDate: null,
  paymentStatus: true,
  isEnabled: false,
  isFavorited: false,
};

describe("finance schema parity (mobile)", () => {
  it("saneia amount string inválida para 0 como no mobile", () => {
    const parsed = financeSchema.parse({ ...baseFinance, amount: "abc" });
    expect(parsed.amount).toBe(0);
  });

  it("rejeita dto sem descrição", () => {
    expect(() => financeSchema.parse({ ...baseFinance, description: "" })).toThrow();
  });

  it("aceita flags 0/1 e converte para boolean (borda web)", () => {
    const parsed = financeSchema.parse({
      ...baseFinance,
      paymentStatus: 1,
      isEnabled: 0,
      isFavorited: 1,
    });
    expect(parsed.paymentStatus).toBe(true);
    expect(parsed.isEnabled).toBe(false);
    expect(parsed.isFavorited).toBe(true);
  });

  it("recai categoria desconhecida para Outros", () => {
    const parsed = financeSchema.parse({ ...baseFinance, category: "Inexistente" });
    expect(parsed.category).toBe("Outros");
  });
});

describe("demais schemas parity", () => {
  it("run exige location e normaliza type", () => {
    const parsed = runSchema.parse({
      currentDistance: 100,
      unityAmount: 5,
      amount: 50,
      type: "",
      date: 1,
      location: "Posto",
    });
    expect(parsed.type).toBe("Gasolina comum");
  });

  it("stock recai categoria e exige quantityDesired >= 1", () => {
    const parsed = stockSchema.parse({
      description: "Arroz",
      category: "X",
      amount: 10,
      quantity: 0,
      quantityDesired: 1,
    });
    expect(parsed.category).toBe("Outros");
    expect(() =>
      stockSchema.parse({
        description: "Arroz",
        category: "Mercearia",
        amount: 10,
        quantity: 0,
        quantityDesired: 0,
      })
    ).toThrow();
  });

  it("list item exige list_id (FK lógica)", () => {
    expect(() =>
      listItemSchema.parse({
        list_id: "",
        description: "X",
        category: "Mercearia",
        amount: 1,
        quantity: 1,
        quantityDesired: 1,
        date: 1,
      })
    ).toThrow();
    expect(
      listSchema.parse({
        description: "Compra",
        quantity: 0,
        amount: 0,
        date: 1,
      }).description
    ).toBe("Compra");
  });

  it("goal tem defaults de currentAmount e normaliza categoria", () => {
    const parsed = goalSchema.parse({ description: "Viagem", amount: 1000, date: 1, category: "lazer" });
    expect(parsed.currentAmount).toBe(0);
  });

  it("config tem defaults (tithePercent 10)", () => {
    const parsed = configSchema.parse({});
    expect(parsed.tithePercent).toBe(10);
    expect(parsed.colorModeState).toBe("light");
  });
});

describe("finance store (zustand)", () => {
  beforeEach(() => {
    clearAllStorage();
    useFinanceStore.setState({ transactionsList: [] });
  });

  it("add + load persistem item validado", async () => {
    await useFinanceStore.getState().add({ ...baseFinance, date: Date.now() });
    expect(useFinanceStore.getState().transactionsList).toHaveLength(1);
  });

  it("handleFavorite inverte flag", async () => {
    await useFinanceStore.getState().add({ ...baseFinance, date: Date.now() });
    const item = useFinanceStore.getState().transactionsList[0];
    await useFinanceStore.getState().handleFavorite(item.id);
    expect(useFinanceStore.getState().transactionsList[0].isFavorited).toBe(true);
  });

  it("getTithe calcula 10% sobre entradas", async () => {
    await useFinanceStore.getState().add({ ...baseFinance, date: Date.now(), amount: 200 });
    const tithe = useFinanceStore.getState().getTithe({ percent: 10 });
    expect(tithe).toBe(20);
  });
});
