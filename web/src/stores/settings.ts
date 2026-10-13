/** Store de configurações + dízimo — espelha `app/src/stores/settings.ts` + `tithe.ts`. */
import { create } from "zustand";
import { configSchema, type ConfigZod } from "../schemas/config.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";
import { useFinanceStore } from "./finance";

export type TithePayment = {
  id: string;
  amount: number;
  date: number;
  month: number;
  year: number;
  createdAt: number;
};

export type SettingsState = ConfigZod & {
  tithePayments: TithePayment[];
  load: () => Promise<void>;
  toggleColorMode: () => Promise<void>;
  setColorMode: (v: string) => Promise<void>;
  update: (key: string, value: unknown) => Promise<void>;
  getTitheCategories: () => string[];
  getMonthlyTithePreview: (month: number, year: number) => number;
  markAsPaid: (month: number, year: number) => Promise<TithePayment>;
};

function getInitialColorMode(): "light" | "dark" {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    /* cai para light */
  }
  return "light";
}

function coerceConfig(raw: unknown, fallbackMode: "light" | "dark"): ConfigZod {
  const defaults = configSchema.parse({});
  try {
    const merged =
      raw && typeof raw === "object" ? { ...defaults, ...(raw as Record<string, unknown>) } : defaults;
    const parsed = configSchema.parse(merged);
    return { ...parsed, colorModeState: parsed.colorModeState ?? fallbackMode } as ConfigZod;
  } catch {
    return { ...defaults, colorModeState: fallbackMode } as ConfigZod;
  }
}

function coerceTithePayments(raw: unknown): TithePayment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is TithePayment =>
      !!r &&
      typeof r === "object" &&
      typeof (r as TithePayment).id === "string" &&
      typeof (r as TithePayment).amount === "number"
  );
}

function parseTitheCategories(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((c): c is string => typeof c === "string");
  } catch {
    /* fallback abaixo */
  }
  return ["Ganhos"];
}

function persistConfig(s: SettingsState): void {
  const config = { ...(s as unknown as Record<string, unknown>) };
  for (const k of [
    "tithePayments",
    "load",
    "toggleColorMode",
    "setColorMode",
    "update",
    "getTitheCategories",
    "getMonthlyTithePreview",
    "markAsPaid",
  ]) {
    delete config[k];
  }
  writeJSON(STORAGE_KEYS.config, config);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...configSchema.parse({}),
  colorModeState: getInitialColorMode(),
  tithePayments: [],

  load: async () => {
    const s = get();
    const config = coerceConfig(readJSON(STORAGE_KEYS.config, {}), s.colorModeState);
    const tithePayments = coerceTithePayments(readJSON(STORAGE_KEYS.tithePayments, []));
    set({ ...config, tithePayments });
  },

  toggleColorMode: async () => {
    const next = get().colorModeState === "light" ? "dark" : "light";
    await get().setColorMode(next);
  },

  setColorMode: async (v: string) => {
    const next = v === "dark" ? "dark" : "light";
    set({ colorModeState: next } as Partial<SettingsState>);
    persistConfig(get());
  },

  update: async (key: string, value: unknown) => {
    const next = configSchema.parse({ ...configSchema.parse({}), ...get(), [key]: value });
    set({ ...(next as ConfigZod) });
    persistConfig(get());
  },

  getTitheCategories: () => parseTitheCategories(get().titheCategories),

  getMonthlyTithePreview: (month: number, year: number) => {
    const s = get();
    const categories = s.getTitheCategories();
    const percent = s.tithePercent;
    let soma = 0;
    for (const it of useFinanceStore.getState().transactionsList) {
      const d = new Date(it.date);
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;
      if (!it.isEnabled && categories.includes(it.category)) soma += Number(it.amount);
      if (
        it.isEnabled &&
        s.willUsePrefixToRemoveTihteSum === 1 &&
        s.prefixTithe &&
        it.description.includes(s.prefixTithe)
      ) {
        soma -= Number(it.amount);
      }
    }
    if (soma < 0) soma = 0;
    return (soma * percent) / 100;
  },

  markAsPaid: async (month: number, year: number) => {
    const amount = get().getMonthlyTithePreview(month, year);
    const now = Date.now();
    const mm = String(month).padStart(2, "0");
    await useFinanceStore.getState().add({
      description: `Dízimo - ${mm}/${year}`,
      amount,
      category: "Outros",
      date: now,
      paymentDate: now,
      paymentStatus: true,
      isEnabled: true,
      isFavorited: false,
    });
    const row: TithePayment = {
      id: newId(),
      amount,
      date: now,
      month,
      year,
      createdAt: now,
    };
    const next = [row, ...get().tithePayments];
    writeJSON(STORAGE_KEYS.tithePayments, next);
    set({ tithePayments: next });
    return row;
  },
}));
