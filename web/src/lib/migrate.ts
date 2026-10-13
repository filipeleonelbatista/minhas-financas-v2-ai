/**
 * Migração one-shot das chaves legadas (`finances`, `stock`, `runs`,
 * `@IsEnable*`, `@autonomy`) para `mf-db-v1:*`. Roda uma vez (flag).
 */
import { readJSON, readRaw, writeRaw } from "./storage";
import { normalizeFinanceInput, normalizeRunInput, normalizeStockInput } from "./normalize";
import { useFinanceStore } from "../stores/finance";
import { useMarketStore } from "../stores/market";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";

const flag = (domain: string) => `mf-db-v1:migrated-${domain}`;

function markRun(domain: string): void {
  writeRaw(flag(domain), "1");
}

function alreadyRun(domain: string): boolean {
  return readRaw(flag(domain)) === "1";
}

export async function migrateLegacyFinances(): Promise<number> {
  if (alreadyRun("finances")) return 0;
  await useFinanceStore.getState().load();
  if (useFinanceStore.getState().transactionsList.length > 0) {
    markRun("finances");
    return 0;
  }
  const legacy = readJSON<unknown[]>("finances", []);
  let n = 0;
  for (const row of legacy) {
    if (!row || typeof row !== "object") continue;
    try {
      await useFinanceStore
        .getState()
        .add(normalizeFinanceInput(row as Record<string, unknown>));
      n++;
    } catch {
      /* linha inválida: pula */
    }
  }
  markRun("finances");
  return n;
}

export async function migrateLegacyRuns(): Promise<number> {
  if (alreadyRun("runs")) return 0;
  await useRunsStore.getState().load();
  if (useRunsStore.getState().runsList.length > 0) {
    markRun("runs");
    return 0;
  }
  const legacy = readJSON<unknown[]>("runs", []);
  let n = 0;
  for (const row of legacy) {
    if (!row || typeof row !== "object") continue;
    try {
      await useRunsStore.getState().add(normalizeRunInput(row as Record<string, unknown>));
      n++;
    } catch {
      /* linha inválida: pula */
    }
  }
  markRun("runs");
  return n;
}

export async function migrateLegacyStock(): Promise<number> {
  if (alreadyRun("stock")) return 0;
  await useMarketStore.getState().load();
  if (useMarketStore.getState().stockList.length > 0) {
    markRun("stock");
    return 0;
  }
  const legacy = readJSON<unknown[]>("stock", []);
  let n = 0;
  for (const row of legacy) {
    if (!row || typeof row !== "object") continue;
    try {
      await useMarketStore.getState().add(normalizeStockInput(row as Record<string, unknown>));
      n++;
    } catch {
      /* linha inválida: pula */
    }
  }
  markRun("stock");
  return n;
}

function readLegacyBool(key: string): boolean | null {
  const raw = readRaw(key);
  if (raw == null) return null;
  try {
    const v = JSON.parse(raw);
    return v === true || v === 1 || v === "1";
  } catch {
    return null;
  }
}

/** Traz toggles legados para o settings store. Retorna nº de campos migrados. */
export async function migrateLegacySettings(): Promise<number> {
  if (alreadyRun("settings")) return 0;
  await useSettingsStore.getState().load();
  const s = useSettingsStore.getState();
  let n = 0;

  const boolMap: [string, string][] = [
    ["@IsEnableTitheCard", "isEnableTitheCard"],
    ["@IsEnableTotalHistoryCard", "isEnableTotalHistoryCard"],
    ["@WillUsePrefixToRemoveTihteSum", "willUsePrefixToRemoveTihteSum"],
  ];
  for (const [legacyKey, field] of boolMap) {
    const v = readLegacyBool(legacyKey);
    if (v !== null) {
      await s.update(field, v ? 1 : 0);
      n++;
    }
  }

  const prefixRaw = readRaw("@PrefixTithe");
  if (prefixRaw != null) {
    try {
      const v = JSON.parse(prefixRaw);
      if (typeof v === "string" && v) {
        await s.update("prefixTithe", v);
        n++;
      }
    } catch {
      /* ignora */
    }
  }

  const autonomyRaw = readRaw("@autonomy");
  if (autonomyRaw != null) {
    try {
      const v = JSON.parse(autonomyRaw);
      if (typeof v === "number" && Number.isFinite(v)) {
        await s.update("veicleAutonomy", v);
        n++;
      }
    } catch {
      /* ignora */
    }
  }

  markRun("settings");
  return n;
}

export async function migrateAllLegacy(): Promise<Record<string, number>> {
  return {
    finances: await migrateLegacyFinances(),
    runs: await migrateLegacyRuns(),
    stock: await migrateLegacyStock(),
    settings: await migrateLegacySettings(),
  };
}
