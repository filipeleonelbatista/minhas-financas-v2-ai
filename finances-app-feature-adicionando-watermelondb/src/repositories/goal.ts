import { goals } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription } from '../utils/sanitize';
import { differenceInCalendarDays } from 'date-fns';

let _db: any = null;
let _attempted = false;
function getDb(): any {
  if (_attempted) return _db;
  _attempted = true;
  try {
    const mod = require('../db');
    _db = mod.db ?? null;
  } catch {
    _db = null;
  }
  return _db;
}

let memory: any[] = [];
function genId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`; }

/** Default categories (spec + requirement update custom). Lowercase canonical. */
export const DEFAULT_GOAL_CATEGORIES = ['viagem','carro','computador','investimento','férias','casa','reserva'] as const;
export type GoalCategory = typeof DEFAULT_GOAL_CATEGORIES[number] | string;

/** Icon mapping (Feather names). */
export const GOAL_CATEGORY_ICONS: Record<string,string> = {
  viagem: 'map-pin',
  carro: 'truck',
  computador: 'monitor',
  investimento: 'trending-up',
  'férias': 'sun',
  ferias: 'sun',
  casa: 'home',
  reserva: 'shield',
  outros: 'target',
};

/** Normalize custom category: sanitize, trim, slice 30, lowercased for storage matching. */
export function normalizeCategory(input: unknown): string {
  if (!input || typeof input !== 'string') {
    const s = sanitizeDescription(input as string);
    return s ? s.slice(0,30) : 'outros';
  }
  let s = sanitizeDescription(input);
  s = s.trim().slice(0, 30);
  if (!s) return 'outros';
  // keep original casing? store lower but preserve accent; for UI title case we display as-is
  // canonical: lower case
  const lower = s.toLowerCase();
  // if matches default (including ferias without accent), map to canonical with accent
  if (lower === 'ferias') return 'férias';
  // if matches default list, return canonical lower
  const found = (DEFAULT_GOAL_CATEGORIES as readonly string[]).find(c => c.toLowerCase() === lower);
  if (found) return found;
  return lower;
}

export function getCategoryIcon(category: string): string {
  const normalized = normalizeCategory(category);
  return GOAL_CATEGORY_ICONS[normalized] ?? GOAL_CATEGORY_ICONS[normalized.replace(/[^a-z]/g,'')] ?? 'tag';
}

/** Pure helpers for tests / UI */
export function calcGoalProgress(goal: any): number {
  if (!goal || !goal.amount || Number(goal.amount) === 0) return 0;
  const p = Number(goal.currentAmount) / Number(goal.amount);
  if (p >= 1) return 1;
  if (p < 0) return 0;
  return p;
}

export function getDaysRemaining(goal: any, now: number = Date.now()): number {
  if (!goal || !goal.date) return 0;
  return differenceInCalendarDays(new Date(Number(goal.date)), now);
}

export function isGoalConcluded(goal: any): boolean {
  return calcGoalProgress(goal) >= 1;
}

export function getGoalStatus(goal: any): 'concluida'|'vencida'|'ativa' {
  if (isGoalConcluded(goal)) return 'concluida';
  if (getDaysRemaining(goal) < 0) return 'vencida';
  return 'ativa';
}

export function filterGoalsByStatus(goalsList: any[], status: 'Ativas'|'Concluídas'|'Todas'|'todas'|'ativas'|'concluidas' = 'Todas'): any[] {
  const s = String(status).toLowerCase();
  if (s === 'todas' || s === 'todos') return [...goalsList];
  if (s === 'ativas' || s === 'ativa') return goalsList.filter(g => !isGoalConcluded(g));
  if (s === 'concluídas' || s === 'concluidas' || s === 'concluida') return goalsList.filter(g => isGoalConcluded(g));
  return [...goalsList];
}

export function filterGoalsByCategory(goalsList: any[], category: string): any[] {
  if (!category || category === 'Todas' || category.toLowerCase() === 'todas') return [...goalsList];
  const norm = normalizeCategory(category);
  return goalsList.filter(g => normalizeCategory(g.category) === norm);
}

export const goalRepo = {
  async add(dto: any) {
    const category = normalizeCategory(dto.category ?? dto.categoryIcon ?? 'outros');
    const icon = dto.icon ?? getCategoryIcon(category);
    const row = {
      id: dto.id ?? genId(),
      description: sanitizeDescription(dto.description) || 'Sem descrição',
      amount: Math.max(0, Number(dto.amount) || 0),
      currentAmount: Math.max(0, Number(dto.currentAmount) || 0),
      date: Number(dto.date) || Date.now() + 30*86400000,
      icon,
      category,
    };
    const db = getDb();
    if (db) { try { await db.insert(goals).values(row); return row; } catch {} }
    memory.push(row); return row;
  },
  async update(id: string, dto: any) {
    const patch: any = { ...dto };
    if (patch.description !== undefined) patch.description = sanitizeDescription(patch.description);
    if (patch.category !== undefined) {
      patch.category = normalizeCategory(patch.category);
      if (!patch.icon) patch.icon = getCategoryIcon(patch.category);
    }
    if (patch.icon !== undefined && !GOAL_CATEGORY_ICONS[normalizeCategory(patch.icon)] && patch.category === undefined) {
      // keep icon as is
    }
    if (patch.amount !== undefined) patch.amount = Math.max(0, Number(patch.amount) || 0);
    if (patch.currentAmount !== undefined) patch.currentAmount = Math.max(0, Number(patch.currentAmount) || 0);
    if (patch.date !== undefined) patch.date = Number(patch.date);
    const db = getDb();
    if (db) { try { await db.update(goals).set(patch).where(eq(goals.id, id)); const rows = await db.select().from(goals).where(eq(goals.id, id)); return rows[0] ?? null; } catch {} }
    const idx = memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx] = { ...memory[idx], ...patch }; return memory[idx];
  },
  async delete(id: string) {
    const db = getDb();
    if (db) { try { await db.delete(goals).where(eq(goals.id, id)); } catch {} }
    memory = memory.filter(r=>r.id!==id);
  },
  async getAll() {
    const db = getDb();
    if (db) { try { const rows = await db.select().from(goals); return rows; } catch {} }
    return [...memory];
  },
  async getActives() {
    const all = await this.getAll();
    return all.filter((g:any) => !isGoalConcluded(g));
  },
  async getConcluded() {
    const all = await this.getAll();
    return all.filter((g:any) => isGoalConcluded(g));
  },
  async clearMemory(){ memory=[]; const db=getDb(); if(db){ try{ await db.delete(goals);}catch{}} },
};
