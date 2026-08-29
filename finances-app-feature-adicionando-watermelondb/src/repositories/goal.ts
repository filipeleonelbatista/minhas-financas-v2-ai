import { goals } from '../db/schema';
import { eq } from 'drizzle-orm';

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

export const goalRepo = {
  async add(dto: any) {
    const row = { id: dto.id ?? genId(), description: dto.description, amount: Number(dto.amount), currentAmount: Number(dto.currentAmount), date: Number(dto.date), icon: dto.icon ?? 'target', category: dto.category ?? 'outros' };
    const db = getDb();
    if (db) { try { await db.insert(goals).values(row); return row; } catch {} }
    memory.push(row); return row;
  },
  async update(id: string, dto: any) {
    const db = getDb();
    if (db) { try { await db.update(goals).set(dto).where(eq(goals.id, id)); const rows = await db.select().from(goals).where(eq(goals.id, id)); return rows[0] ?? null; } catch {} }
    const idx = memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx] = { ...memory[idx], ...dto }; return memory[idx];
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
  async clearMemory(){ memory=[]; const db=getDb(); if(db){ try{ await db.delete(goals);}catch{}} },
};
