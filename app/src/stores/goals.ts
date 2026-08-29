import { create } from 'zustand';
import {
  goalRepo,
  DEFAULT_GOAL_CATEGORIES,
  normalizeCategory,
  calcGoalProgress,
  filterGoalsByStatus,
  isGoalConcluded,
} from '../repositories/goal';

// Re-export for consumers per plan spec
export { DEFAULT_GOAL_CATEGORIES, normalizeCategory, calcGoalProgress, filterGoalsByStatus, isGoalConcluded };

export type GoalRow = {
  id: string;
  description: string;
  amount: number;
  currentAmount: number;
  date: number;
  category: string;
  icon: string;
};

type GoalsFilter = 'Todas' | 'Ativas' | 'Concluídas' | string;

type GoalsState = {
  goals: GoalRow[];
  selectedFilter: GoalsFilter;
  search: string;
  load: () => Promise<void>;
  add: (dto: any) => Promise<GoalRow>;
  update: (id: string, dto: any) => Promise<GoalRow | null>;
  delete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setFilter: (v: GoalsFilter) => void;
  setSelectedFilter: (v: GoalsFilter) => void;
  getFilteredGoals: () => GoalRow[];
  filteredGoals: GoalRow[];
};

function computeFiltered(goals: GoalRow[], selectedFilter: string): GoalRow[] {
  return filterGoalsByStatus(goals as any, selectedFilter as any) as GoalRow[];
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  selectedFilter: 'Todas',
  search: '',

  load: async () => {
    const list = await goalRepo.getAll();
    set({ goals: list as GoalRow[] });
  },

  add: async (dto: any) => {
    const row = await goalRepo.add(dto);
    await get().load();
    return row as GoalRow;
  },

  update: async (id: string, dto: any) => {
    const row = await goalRepo.update(id, dto);
    await get().load();
    return row as GoalRow | null;
  },

  delete: async (id: string) => {
    await goalRepo.delete(id);
    await get().load();
  },

  // alias for compatibility (finance/market use remove)
  remove: async (id: string) => {
    await goalRepo.delete(id);
    await get().load();
  },

  setFilter: (v: GoalsFilter) => set({ selectedFilter: v }),
  setSelectedFilter: (v: GoalsFilter) => set({ selectedFilter: v }),

  getFilteredGoals: () => {
    const { goals, selectedFilter } = get();
    return computeFiltered(goals, selectedFilter);
  },

  filteredGoals: [],
}));

// Patch getState to make filteredGoals a live derived getter (like lists store)
const _store: any = useGoalsStore;
if (_store && typeof _store.getState === 'function') {
  const originalGetState = _store.getState.bind(_store);
  (_store as any).getState = () => {
    const state = originalGetState();
    const filtered = computeFiltered(state.goals ?? [], state.selectedFilter ?? 'Todas');
    return Object.defineProperty({ ...state }, 'filteredGoals', {
      get() {
        // recompute lazily from latest state snapshot's goals/filter
        return computeFiltered(state.goals ?? [], state.selectedFilter ?? 'Todas');
      },
      enumerable: true,
      configurable: true,
    }) as any;
  };
}
