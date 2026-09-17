// @ts-nocheck
import { useSettingsStore } from '../stores/settings';

// Compatibility shim: proxies legacy useSettings() to zustand store
export function useSettings() {
  const s = useSettingsStore();
  return {
    // booleans derived from numbers
    isEnableTitheCard: !!s.isEnableTitheCard,
    isEnableTotalHistoryCard: !!s.isEnableTotalHistoryCard,
    isAiEnabled: !!s.isAiEnabled,
    isShowLabelOnNavigation: !!s.isShowLabelOnNavigation,
    willAddFuelToTransactionList: !!s.willAddFuelToTransactionList,
    willUsePrefixToRemoveTihteSum: !!s.willUsePrefixToRemoveTihteSum,
    simpleFinancesItem: !!s.simpleFinancesItem,
    marketSimplifiedItems: !!s.marketSimplifiedItems,
    isBiometricEnabled: !!s.isBiometricEnabled,
    // raw values
    colorModeState: s.colorModeState,
    colorMode: s.colorModeState,
    prefixTithe: s.prefixTithe,
    selectedFolderToSave: s.selectedFolderToSave,
    apiKey: s.apiKey,
    veicleAutonomy: s.veicleAutonomy,
    veicleName: s.veicleName,
    veicleBrand: s.veicleBrand,
    veicleYear: s.veicleYear,
    veicleColor: s.veicleColor,
    veiclePlate: s.veiclePlate,
    tithePercent: s.tithePercent,
    titheCategories: s.titheCategories,
    // actions - accept boolean and persist via store.update
    handleSwitchViewTitheCard: (v) => s.update('isEnableTitheCard', v ? 1 : 0),
    handleSwitchViewTotalHistoryCard: (v) => s.update('isEnableTotalHistoryCard', v ? 1 : 0),
    handleSetIsAiEnabled: (v) => s.update('isAiEnabled', v ? 1 : 0),
    handleSetIsShowLabelOnNavigation: (v) => s.update('isShowLabelOnNavigation', v ? 1 : 0),
    handleToggleWillAddFuel: (v) => s.update('willAddFuelToTransactionList', v ? 1 : 0),
    handleWillRemovePrefixToRemove: (v) => s.update('willUsePrefixToRemoveTihteSum', v ? 1 : 0),
    handleSetSimpleFinancesItem: (v) => s.update('simpleFinancesItem', v ? 1 : 0),
    handleSetmarketSimplifiedItems: (v) => s.update('marketSimplifiedItems', v ? 1 : 0),
    handleSetPrefixTithe: (v) => s.update('prefixTithe', v),
    handleUpdateSelectedFolderToSave: (v) => s.update('selectedFolderToSave', v),
    handleUpdateApiKey: (v) => s.update('apiKey', v),
    handleSaveApiKey: (v) => s.update('apiKey', v),
    handleSetIsBiometricEnabled: (v) => s.update('isBiometricEnabled', v ? 1 : 0),
    handleVeicleName: (v) => s.update('veicleName', v),
    handleVeicleBrand: (v) => s.update('veicleBrand', v),
    handleVeicleYear: (v) => s.update('veicleYear', v),
    handleVeicleColor: (v) => s.update('veicleColor', v),
    handleVeiclePlate: (v) => s.update('veiclePlate', v),
    handleVeicleAutonomy: (v) => s.update('veicleAutonomy', v),
    handleToggleTheme: () => s.toggleColorMode(),
    handleResetConfigs: async () => {
      // clear memory + reload not needed; delegate to store if exists
      if (s.reset) await s.reset();
    },
    handleCleanStorage: async () => {
      // best-effort: clear config memory
      await s.update('isEnableTitheCard', 0);
    },
    updateVeicle: async (info) => {
      await s.update('veicleName', info.name);
      await s.update('veicleBrand', info.brand);
      await s.update('veicleYear', info.year);
      await s.update('veicleColor', info.color);
      await s.update('veiclePlate', info.plate);
    },
    // legacy aliases
    toggleColorMode: s.toggleColorMode,
    setColorMode: s.setColorMode,
    load: s.load,
    update: s.update,
    updateConfiguration: s.update,
  };
}
