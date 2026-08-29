import { create } from 'zustand';

type FinanceState = Record<string, unknown>;

export const useFinanceStore = create<FinanceState>(() => ({}));
