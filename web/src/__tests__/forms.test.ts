import { describe, expect, it } from "vitest";
import { financeSchema } from "@/schemas/finance.zod";
import {
  normalizeFinanceInput,
  normalizeRunInput,
  normalizeStockInput,
} from "@/lib/normalize";
import { formatPeriodDate, parsePeriodDate } from "@/lib/format";
import { migrateLegacyFinances } from "@/lib/migrate";
import { useFinanceStore } from "@/stores/finance";
import { clearAllStorage, writeJSON } from "@/lib/storage";

describe("form schema", () => {
  it("exige description", () => {
    expect(financeSchema.safeParse({}).success).toBe(false);
  });
});

describe("normalize inputs (borda forms legados → stores)", () => {
  it("converte Date para timestamp e flags para boolean", () => {
    const dto = normalizeFinanceInput({
      description: "Salário",
      amount: "1.234,56",
      category: "Ganhos",
      date: new Date(2026, 5, 15, 12),
      paymentDate: "",
      paymentStatus: false,
      isEnabled: false,
      isFavorited: false,
    });
    expect(dto.amount).toBe(1234.56);
    expect(dto.date).toBe(new Date(2026, 5, 15, 12).getTime());
    expect(dto.paymentDate).toBeNull();
    expect(dto.isEnabled).toBe(false);
  });

  it("converte linha CSV legada (ms string + flags 0/1)", () => {
    const dto = normalizeFinanceInput({
      id: "abc",
      description: "Mercado",
      amount: "60.5",
      category: "Mercado",
      date: String(new Date(2026, 5, 10, 12).getTime()),
      paymentDate: String(new Date(2026, 5, 10, 12).getTime()),
      paymentStatus: "1",
      isEnabled: "1",
      isFavorited: "0",
    });
    expect(dto.date).toBe(new Date(2026, 5, 10, 12).getTime());
    expect(dto.paymentStatus).toBe(true);
    expect(dto.isEnabled).toBe(true);
    expect(dto.isFavorited).toBe(false);
  });

  it("run e stock normalizam BR money e quantidades", () => {
    const run = normalizeRunInput({
      currentDistance: "10000",
      unityAmount: "5,59",
      amount: "100,00",
      type: "Gasolina comum",
      date: new Date(2026, 5, 15, 12),
      location: "Posto",
    });
    expect(run.unityAmount).toBe(5.59);
    expect(run.currentDistance).toBe(10000);

    const stock = normalizeStockInput({
      description: "Arroz",
      amount: "10,50",
      category: "Mercearia",
      quantity: "2",
      quantityDesired: "",
    });
    expect(stock.amount).toBe(10.5);
    expect(stock.quantity).toBe(2);
    expect(stock.quantityDesired).toBe(1);
  });
});

describe("período Date ↔ DD/MM/YYYY", () => {
  it("roundtrip sem perder o dia", () => {
    const d = new Date(2026, 0, 5, 12);
    expect(parsePeriodDate(formatPeriodDate(d))).toEqual(new Date(2026, 0, 5));
  });
});

describe("migração legada (chaves antigas → mf-db-v1)", () => {
  it("importa linhas legadas uma única vez", async () => {
    clearAllStorage();
    useFinanceStore.setState({ transactionsList: [] });
    writeJSON("finances", [
      {
        id: "leg-1",
        description: "Antiga",
        amount: 10,
        category: "Mercado",
        date: new Date(2026, 5, 10, 12).toISOString(),
        paymentDate: "",
        paymentStatus: true,
        isEnabled: true,
        isFavorited: false,
      },
    ]);
    expect(await migrateLegacyFinances()).toBe(1);
    expect(useFinanceStore.getState().transactionsList).toHaveLength(1);
    expect(await migrateLegacyFinances()).toBe(0);
  });
});
