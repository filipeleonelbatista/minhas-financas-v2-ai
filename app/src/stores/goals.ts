import { create } from 'zustand';

type GoalsState = Record<string, unknown>;

export const useGoalsStore = create<GoalsState>(() => ({}));
