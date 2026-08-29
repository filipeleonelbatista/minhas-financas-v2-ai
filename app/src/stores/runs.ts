import { create } from 'zustand';
import { runRepo } from '../repositories/run';

export type RunRow = {
  id: string;
  currentDistance: number;
  unityAmount: number;
  amount: number;
  type: string;
  date: number;
  location: string;
};

export function calcRunEstimative(
  run: Pick<RunRow, 'currentDistance' | 'unityAmount' | 'amount'> | any,
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

// alias for compatibility
export const calcEstimative = calcRunEstimative;

type RunsState = {
  runsList: RunRow[];
  load: () => Promise<void>;
  add: (dto: any) => Promise<void>;
  update: (id: string, dto: any) => Promise<void>;
  remove: (id: string | any) => Promise<void>;
  getEstimative: (veicleAutonomy: number | string) => number;
  calcEstimative: (run: any, veicleAutonomy: number | string) => number;
};

export const useRunsStore = create<RunsState>((set, get) => ({
  runsList: [],

  load: async () => {
    const list = await runRepo.getAll();
    set({ runsList: list as RunRow[] });
  },

  add: async (dto: any) => {
    await runRepo.add(dto);
    await get().load();
  },

  update: async (id: string, dto: any) => {
    await runRepo.update(id, dto);
    await get().load();
  },

  remove: async (id: string | any) => {
    const resolvedId = typeof id === 'string' ? id : id?.id;
    if (!resolvedId) return;
    await runRepo.delete(resolvedId);
    await get().load();
  },

  getEstimative: (veicleAutonomy: number | string) => {
    const { runsList } = get();
    if (!runsList || runsList.length === 0) return 0;
    // Match Runs.js:139 logic: uses the most recent run (filteredList[0] after date desc sort)
    // For store without filter, pick the run with max date
    let candidate = runsList[0];
    if (runsList.length > 1) {
      candidate = [...runsList].sort((a: any, b: any) => Number(b.date) - Number(a.date))[0];
    }
    return calcRunEstimative(candidate, veicleAutonomy);
  },

  calcEstimative: (run: any, veicleAutonomy: number | string) => calcRunEstimative(run, veicleAutonomy),
}));
