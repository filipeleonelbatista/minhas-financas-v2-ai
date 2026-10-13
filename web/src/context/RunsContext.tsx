/**
 * Adapter legado → runs store (mf-db-v1) + autonomia via settings store.
 */
import { useCallback, useEffect, type ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRunsStore, type RunRow } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { normalizeRunInput } from "@/lib/normalize";
import { migrateLegacyRuns } from "@/lib/migrate";
import type { LegacyRunItem } from "@/types/contexts";
import { RunsContext } from "./runs-context";

function toLegacy(r: RunRow): LegacyRunItem {
  return { ...r, date: new Date(r.date) };
}

export function RunsContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const runs = useRunsStore();
  const settings = useSettingsStore();

  const FuelList = runs.runsList.map(toLegacy);
  const autonomy = Number(settings.veicleAutonomy ?? 0);

  const loadTransactions = useCallback(async () => {
    await migrateLegacyRuns();
    await useRunsStore.getState().load();
    await useSettingsStore.getState().load();
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const setAutonomyValue = useCallback(async (value: number) => {
    await useSettingsStore.getState().update("veicleAutonomy", Number(value) || 0);
  }, []);

  const addTransaction = useCallback(
    async (dto: unknown) => {
      await useRunsStore.getState().add(normalizeRunInput(dto as Record<string, unknown>));
      toast({ description: "Abastecimento adicionado com sucesso!", variant: "success" });
    },
    [toast]
  );

  const deleteTransaction = useCallback(
    async (dto: { id: string }) => {
      if (!confirm("Deseja realmete excluir este item? Essa ação é permanente.")) return;
      await useRunsStore.getState().remove(dto.id);
      toast({ description: "Item excluido com sucesso!", variant: "success" });
    },
    [toast]
  );

  const deleteAllTransaction = useCallback(async () => {
    if (
      confirm("Deseja realmete excluir os dados da tabela de abastecimentos? Essa ação é permanente.")
    ) {
      await useRunsStore.getState().clear();
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
          await useRunsStore.getState().add(normalizeRunInput(row as Record<string, unknown>));
        } catch {
          /* pula inválida */
        }
      }
      toast({ description: "Importação conclúida com sucesso!", variant: "success" });
    },
    [toast]
  );

  const setFuelList = useCallback(async (list: LegacyRunItem[]) => {
    const valid = [];
    for (const row of list) {
      try {
        const parsed = normalizeRunInput(row as unknown as Record<string, unknown>);
        valid.push({ ...parsed, id: row.id });
      } catch {
        /* pula inválida */
      }
    }
    writeJSON(STORAGE_KEYS.runs, valid);
    await useRunsStore.getState().load();
  }, []);

  return (
    <RunsContext.Provider
      value={{
        FuelList,
        setFuelList,
        autonomy,
        setAutonomyValue,
        addTransaction,
        deleteTransaction,
        deleteAllTransaction,
        importTransactions,
        loadTransactions,
      }}
    >
      {children}
    </RunsContext.Provider>
  );
}
