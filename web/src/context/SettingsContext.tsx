/**
 * Adapter legado → settings store (mf-db-v1).
 * Toggles boolean na borda; 0/1 no store (paridade mobile).
 */
import { useCallback, useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/stores/settings";
import { migrateLegacySettings } from "@/lib/migrate";
import { SettingsContext } from "./settings-context";

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsStore();

  useEffect(() => {
    void (async () => {
      await migrateLegacySettings();
      await useSettingsStore.getState().load();
    })();
  }, []);

  const handleSetPrefixTithe = useCallback(async (value: string) => {
    await useSettingsStore.getState().update("prefixTithe", value);
  }, []);

  const handleWillRemovePrefixToRemove = useCallback(async (value: boolean) => {
    await useSettingsStore.getState().update("willUsePrefixToRemoveTihteSum", value ? 1 : 0);
  }, []);

  const handleSwitchViewTotalHistoryCard = useCallback(async (value: boolean) => {
    await useSettingsStore.getState().update("isEnableTotalHistoryCard", value ? 1 : 0);
  }, []);

  const handleSwitchViewTitheCard = useCallback(async (value: boolean) => {
    await useSettingsStore.getState().update("isEnableTitheCard", value ? 1 : 0);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        isEnableTitheCard: settings.isEnableTitheCard === 1,
        handleSwitchViewTitheCard,
        willUsePrefixToRemoveTihteSum: settings.willUsePrefixToRemoveTihteSum === 1,
        handleWillRemovePrefixToRemove,
        prefixTithe: settings.prefixTithe,
        handleSetPrefixTithe,
        isEnableTotalHistoryCard: settings.isEnableTotalHistoryCard === 1,
        handleSwitchViewTotalHistoryCard,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
