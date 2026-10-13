import { useEffect } from "react";
import { subscribeStorage } from "../lib/storage";
import { useFinanceStore } from "../stores/finance";
import { useGoalsStore } from "../stores/goals";
import { useListsStore } from "../stores/lists";
import { useMarketStore } from "../stores/market";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";

/** Recarrega as stores quando outra aba escreve no storage (multi-aba). */
export function StoreSync() {
  useEffect(() => {
    return subscribeStorage(() => {
      void useFinanceStore.getState().load();
      void useRunsStore.getState().load();
      void useMarketStore.getState().load();
      void useGoalsStore.getState().load();
      void useSettingsStore.getState().load();
      void useListsStore.getState().load();
    });
  }, []);
  return null;
}
