import { create } from 'zustand';

type RunsState = Record<string, unknown>;

export const useRunsStore = create<RunsState>(() => ({}));
