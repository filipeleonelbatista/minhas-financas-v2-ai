/** Store de metas — espelha `app/src/stores/goals.ts`. */
import { create } from "zustand";
import { goalSchema, type GoalZod } from "../schemas/goal.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";
import {
  calcGoalProgress,
  filterGoalsByStatus,
  isGoalConcluded,
  type GoalsFilter,
} from "../lib/goals";

export { calcGoalProgress, filterGoalsByStatus, isGoalConcluded };

export type GoalRow = GoalZod & { id: string; icon: string };

type GoalsState = {
  goals: GoalRow[];
  selectedFilter: GoalsFilter;
  search: string;
  filteredGoals: GoalRow[];
  load: () => Promise<void>;
  add: (dto: unknown) => Promise<GoalRow>;
  update: (id: string, dto: unknown) => Promise<GoalRow | null>;
  delete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setFilter: (v: GoalsFilter) => void;
  setSelectedFilter: (v: GoalsFilter) => void;
  getFilteredGoals: () => GoalRow[];
};

function coerceList(raw: unknown): GoalRow[] {
  if (!Array.isArray(raw)) return [];
  const out: GoalRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = goalSchema.safeParse(rest);
    if (parsed.success) {
      out.push({ ...parsed.data, icon: typeof (rest as Record<string, unknown>).icon === "string" && (rest as Record<string, unknown>).icon ? ((rest as Record<string, unknown>).icon as string) : "target", id });
    }
  }
  return out;
}

export const useGoalsStore = create<GoalsState>((set, get) => {
  const applyFilter = (goals: GoalRow[], selectedFilter: GoalsFilter): Partial<GoalsState> => ({
    goals,
    filteredGoals: filterGoalsByStatus(goals, selectedFilter),
  });

  return {
    goals: [],
    selectedFilter: "Todas",
    search: "",
    filteredGoals: [],

    load: async () => {
      const goals = coerceList(readJSON(STORAGE_KEYS.goals, []));
      set({ ...applyFilter(goals, get().selectedFilter) });
    },

    add: async (dto: unknown) => {
      const data = (dto ?? {}) as Record<string, unknown>;
      const parsed = goalSchema.parse(data);
      const row: GoalRow = {
        ...parsed,
        icon: typeof data.icon === "string" && data.icon ? data.icon : "target",
        id: typeof data.id === "string" && data.id ? data.id : newId(),
      };
      const goals = [row, ...coerceList(readJSON(STORAGE_KEYS.goals, []))];
      writeJSON(STORAGE_KEYS.goals, goals);
      set({ ...applyFilter(goals, get().selectedFilter) });
      return row;
    },

    update: async (id: string, dto: unknown) => {
      const current = coerceList(readJSON(STORAGE_KEYS.goals, []));
      const found = current.find((g) => g.id === id);
      if (!found) return null;
      const merged = { ...(dto as Record<string, unknown>) };
      delete merged.id;
      const parsed = goalSchema.parse({ ...found, ...merged });
      const icon =
        typeof merged.icon === "string" && merged.icon ? merged.icon : found.icon;
      const next = current.map((g) => (g.id === id ? { ...parsed, icon, id } : g));
      writeJSON(STORAGE_KEYS.goals, next);
      set({ ...applyFilter(next, get().selectedFilter) });
      return { ...parsed, icon, id };
    },

    delete: async (id: string) => {
      const next = coerceList(readJSON(STORAGE_KEYS.goals, [])).filter((g) => g.id !== id);
      writeJSON(STORAGE_KEYS.goals, next);
      set({ ...applyFilter(next, get().selectedFilter) });
    },

    remove: async (id: string) => {
      await get().delete(id);
    },

    setFilter: (v: GoalsFilter) =>
      set((s) => ({ selectedFilter: v, filteredGoals: filterGoalsByStatus(s.goals, v) })),

    setSelectedFilter: (v: GoalsFilter) =>
      set((s) => ({ selectedFilter: v, filteredGoals: filterGoalsByStatus(s.goals, v) })),

    getFilteredGoals: () => {
      const { goals, selectedFilter } = get();
      return filterGoalsByStatus(goals, selectedFilter);
    },
  };
});
