/** Store de abastecimentos — espelha `app/src/stores/runs.ts`. */
import { create } from "zustand";
import { runSchema, type RunZod } from "../schemas/run.zod";
import { STORAGE_KEYS, newId, readJSON, writeJSON } from "../lib/storage";

export type RunRow = RunZod & { id: string };

export function calcRunEstimative(
  run: Pick<RunRow, "currentDistance" | "unityAmount" | "amount"> | null | undefined,
  veicleAutonomy: number | string
): number {
  if (!run) return 0;
  const autonomy = Number(veicleAutonomy);
  const amount = Number(run.amount);
  const unityAmount = Number(run.unityAmount);
  const currentDistance = Number(run.currentDistance);
  if (!unityAmount) return currentDistance || 0;
  return (autonomy * amount) / unityAmount + currentDistance;
}

// alias de compatibilidade com o mobile
export const calcEstimative = calcRunEstimative;

type RunsState = {
  runsList: RunRow[];
  load: () => Promise<void>;
  add: (dto: unknown) => Promise<RunRow>;
  update: (id: string, dto: unknown) => Promise<RunRow | null>;
  remove: (idOrDto: string | { id: string }) => Promise<void>;
  clear: () => Promise<void>;
  getEstimative: (veicleAutonomy: number | string) => number;
  calcEstimative: (run: RunRow | null | undefined, veicleAutonomy: number | string) => number;
};

function coerceList(raw: unknown): RunRow[] {
  if (!Array.isArray(raw)) return [];
  const out: RunRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, ...rest } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id) continue;
    const parsed = runSchema.safeParse(rest);
    if (parsed.success) out.push({ ...parsed.data, id });
  }
  return out;
}

export const useRunsStore = create<RunsState>((set, get) => ({
  runsList: [],

  load: async () => {
    set({ runsList: coerceList(readJSON(STORAGE_KEYS.runs, [])) });
  },

  clear: async () => {
    writeJSON(STORAGE_KEYS.runs, []);
    set({ runsList: [] });
  },

  add: async (dto: unknown) => {
    const data = (dto ?? {}) as Record<string, unknown>;
    const parsed = runSchema.parse(data);
    const row: RunRow = {
      ...parsed,
      id: typeof data.id === "string" && data.id ? data.id : newId(),
    };
    const list = [row, ...get().runsList];
    writeJSON(STORAGE_KEYS.runs, list);
    set({ runsList: list });
    return row;
  },

  update: async (id: string, dto: unknown) => {
    const current = get().runsList;
    const found = current.find((r) => r.id === id);
    if (!found) return null;
    const merged = { ...(dto as Record<string, unknown>) };
    delete merged.id;
    const parsed = runSchema.parse({ ...found, ...merged });
    const next = current.map((r) => (r.id === id ? { ...parsed, id } : r));
    writeJSON(STORAGE_KEYS.runs, next);
    set({ runsList: next });
    return { ...parsed, id };
  },

  remove: async (idOrDto: string | { id: string }) => {
    const id = typeof idOrDto === "string" ? idOrDto : idOrDto?.id;
    if (!id) return;
    const next = get().runsList.filter((r) => r.id !== id);
    writeJSON(STORAGE_KEYS.runs, next);
    set({ runsList: next });
  },

  getEstimative: (veicleAutonomy: number | string) => {
    const { runsList } = get();
    if (!runsList || runsList.length === 0) return 0;
    // mobile: usa o abastecimento mais recente (maior date)
    let candidate = runsList[0];
    if (runsList.length > 1) {
      candidate = [...runsList].sort((a, b) => Number(b.date) - Number(a.date))[0];
    }
    return calcRunEstimative(candidate, veicleAutonomy);
  },

  calcEstimative: (run, veicleAutonomy) => calcRunEstimative(run, veicleAutonomy),
}));
