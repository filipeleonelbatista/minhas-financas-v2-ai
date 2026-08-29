import { create } from 'zustand';

type SettingsState = Record<string, unknown>;

export const useSettingsStore = create<SettingsState>(() => ({}));
