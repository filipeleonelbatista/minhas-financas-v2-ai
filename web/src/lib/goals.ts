/** Helpers de metas — port dos puros de `app/src/repositories/goal.ts`. */
import { sanitizeDescription } from "../utils/sanitize";
import { differenceInCalendarDays } from "date-fns";

export const DEFAULT_GOAL_CATEGORIES = [
  "viagem",
  "carro",
  "computador",
  "investimento",
  "férias",
  "casa",
  "reserva",
] as const;

export function normalizeCategory(input: unknown): string {
  if (!input || typeof input !== "string") {
    const s = sanitizeDescription(input as string);
    return s ? s.slice(0, 30) : "outros";
  }
  let s = sanitizeDescription(input);
  s = s.trim().slice(0, 30);
  if (!s) return "outros";
  const lower = s.toLowerCase();
  if (lower === "ferias") return "férias";
  const found = (DEFAULT_GOAL_CATEGORIES as readonly string[]).find(
    (c) => c.toLowerCase() === lower
  );
  if (found) return found;
  return lower;
}

export function calcGoalProgress(goal: {
  amount?: unknown;
  currentAmount?: unknown;
}): number {
  if (!goal || !goal.amount || Number(goal.amount) === 0) return 0;
  const p = Number(goal.currentAmount) / Number(goal.amount);
  if (p >= 1) return 1;
  if (p < 0) return 0;
  return p;
}

export function isGoalConcluded(goal: {
  amount?: unknown;
  currentAmount?: unknown;
}): boolean {
  return calcGoalProgress(goal) >= 1;
}

export function getDaysRemaining(
  goal: { date?: unknown },
  now: number = Date.now()
): number {
  if (!goal || !goal.date) return 0;
  return differenceInCalendarDays(new Date(Number(goal.date)), now);
}

export type GoalsFilter = "Todas" | "Ativas" | "Concluídas" | string;

export function filterGoalsByStatus<
  T extends { amount?: unknown; currentAmount?: unknown },
>(goalsList: T[], status: GoalsFilter = "Todas"): T[] {
  const s = String(status).toLowerCase();
  if (s === "todas" || s === "todos") return [...goalsList];
  if (s === "ativas" || s === "ativa")
    return goalsList.filter((g) => !isGoalConcluded(g));
  if (s === "concluídas" || s === "concluidas" || s === "concluida")
    return goalsList.filter((g) => isGoalConcluded(g));
  return [...goalsList];
}
