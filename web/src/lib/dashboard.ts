/** Seletores do Dashboard — puros, espelham `app/src/pages/Dashboard.tsx`. */
import { format } from "date-fns";
import type { FinanceLike } from "./finance";
import { getDaysRemaining, isGoalConcluded } from "./goals";

export type Hero = { incomings: number; expenses: number; saldo: number };

/** Hero Saldo/Entradas/Saídas sobre a lista dada. */
export function calcHero(list: Pick<FinanceLike, "amount" | "isEnabled">[]): Hero {
  let incomings = 0;
  let expenses = 0;
  for (const it of list) {
    if (it.isEnabled) expenses += Number(it.amount);
    else incomings += Number(it.amount);
  }
  return { incomings, expenses, saldo: incomings - expenses };
}

/** Gastos (saídas) agregados por categoria, desc. */
export function expensesByCategory(
  list: Pick<FinanceLike, "amount" | "category" | "isEnabled">[]
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const it of list) {
    if (!it.isEnabled) continue;
    map.set(it.category, (map.get(it.category) ?? 0) + Number(it.amount));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type MonthBucket = { key: string; label: string; incomings: number; expenses: number };

/** Evolução dos últimos 6 meses terminando no mês de `now` (mais antigo → atual). */
export function last6Months<T extends Pick<FinanceLike, "amount" | "date" | "isEnabled">>(
  list: T[],
  now: number = Date.now()
): MonthBucket[] {
  const base = new Date(now);
  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({ key, label: format(d, "MM/yy"), incomings: 0, expenses: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const it of list) {
    const d = new Date(it.date);
    const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!b) continue;
    if (it.isEnabled) b.expenses += Number(it.amount);
    else b.incomings += Number(it.amount);
  }
  return buckets;
}

/** Metas não concluídas vencendo em 0–30 dias. */
export function urgentGoals<
  T extends { amount?: unknown; currentAmount?: unknown; date?: unknown },
>(goals: T[], now: number = Date.now()): T[] {
  return goals.filter((g) => {
    if (isGoalConcluded(g)) return false;
    const days = getDaysRemaining(g, now);
    return days >= 0 && days <= 30;
  });
}

export type StockAlert = { missing: StockLike[]; near: StockLike[] };
export type StockLike = { quantity: number; quantityDesired: number } & Record<string, unknown>;

/** Em falta (qty ≤ 0) vs quase (0 < qty < desired). */
export function stockAlerts<T extends StockLike>(stock: T[]): { missing: T[]; near: T[] } {
  const missing = stock.filter((i) => Number(i.quantity) <= 0);
  const near = stock.filter(
    (i) => Number(i.quantity) > 0 && Number(i.quantity) < Number(i.quantityDesired)
  );
  return { missing, near };
}
