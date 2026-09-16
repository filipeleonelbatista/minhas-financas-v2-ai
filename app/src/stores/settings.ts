import { create } from 'zustand';
import { Appearance } from 'react-native';
import { configRepo } from '../repositories/config';

function getInitialColorMode(): string {
  try {
    const scheme = Appearance.getColorScheme();
    if (scheme === 'dark' || scheme === 'light') return scheme;
  } catch {}
  return 'light';
}

function applyColorScheme(scheme: string) {
  // react-native-css-interop colorScheme.set (used by NativeWind 4)
  try {
    const interop = require('react-native-css-interop');
    if (interop?.colorScheme?.set) {
      interop.colorScheme.set(scheme);
    }
  } catch {}
  // nativewind fallback
  try {
    const nw: any = require('nativewind');
    if (nw?.setColorScheme && typeof nw.setColorScheme === 'function') {
      nw.setColorScheme(scheme);
    } else if (nw?.colorScheme?.set) {
      nw.colorScheme.set(scheme);
    }
  } catch {}
  // Appearance API (RN 0.81+)
  try {
    if (Appearance && typeof (Appearance as any).setColorScheme === 'function') {
      (Appearance as any).setColorScheme(scheme);
    }
  } catch {}
}

export type SettingsState = {
  colorModeState: string; // light|dark
  isAiEnabled: number;
  apiKey: string;
  isShowLabelOnNavigation: number;
  isEnableTitheCard: number;
  isEnableTotalHistoryCard: number;
  willAddFuelToTransactionList: number;
  willUsePrefixToRemoveTihteSum: number;
  simpleFinancesItem: number;
  marketSimplifiedItems: number;
  prefixTithe: string;
  veicleName: string;
  veicleBrand: string;
  veicleYear: string;
  veicleColor: string;
  veiclePlate: string;
  veicleAutonomy: number;
  selectedFolderToSave: string;
  isBiometricEnabled: number;
  tithePercent: number;
  titheCategories: string;
  isTitheMenuEnabled: number;
  // actions
  load: () => Promise<void>;
  toggleColorMode: () => Promise<void>;
  setColorMode: (v: string) => Promise<void>;
  update: (key: string, value: any) => Promise<void>;
  // alias for legacy code
  updateConfiguration?: (key: string, value: any) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  colorModeState: getInitialColorMode(),
  isAiEnabled: 0,
  apiKey: '',
  isShowLabelOnNavigation: 0,
  isEnableTitheCard: 0,
  isEnableTotalHistoryCard: 0,
  willAddFuelToTransactionList: 0,
  willUsePrefixToRemoveTihteSum: 0,
  simpleFinancesItem: 0,
  marketSimplifiedItems: 0,
  prefixTithe: '',
  veicleName: '',
  veicleBrand: '',
  veicleYear: '',
  veicleColor: '',
  veiclePlate: '',
  veicleAutonomy: 0,
  selectedFolderToSave: '',
  isBiometricEnabled: 0,
  tithePercent: 10,
  titheCategories: '',
  isTitheMenuEnabled: 0,

  load: async () => {
    const c: any = await configRepo.get();
    if (c) {
      const next: any = { ...c };
      // ensure colorModeState defaults
      const color = c.colorModeState ?? getInitialColorMode();
      next.colorModeState = color;
      set(next);
      try {
        applyColorScheme(color);
      } catch {}
    } else {
      // no config yet, ensure color scheme applied
      try {
        applyColorScheme(get().colorModeState);
      } catch {}
    }
  },

  toggleColorMode: async () => {
    const current = get().colorModeState;
    const next = current === 'light' ? 'dark' : 'light';
    await configRepo.upsert({ colorModeState: next });
    set({ colorModeState: next } as any);
    try {
      applyColorScheme(next);
    } catch {}
  },

  setColorMode: async (v: string) => {
    const next = v === 'dark' ? 'dark' : 'light';
    await configRepo.upsert({ colorModeState: next });
    set({ colorModeState: next } as any);
    try {
      applyColorScheme(next);
    } catch {}
  },

  update: async (key: string, value: any) => {
    await configRepo.upsert({ [key]: value } as any);
    set({ [key]: value } as any);
  },
}));

// alias updateConfiguration for backward compat
;(useSettingsStore as any).getState().updateConfiguration = async (k: string, v: any) => {
  await (useSettingsStore.getState() as any).update(k, v);
};
