import { create } from 'zustand';

type ListsState = Record<string, unknown>;

export const useListsStore = create<ListsState>(() => ({}));
