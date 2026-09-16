import { runs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeLocation, sanitizeAmount } from '../utils/sanitize';
let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memory:any[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const runRepo={
  async add(dto:any){ const row={id:dto.id??genId(),currentDistance:Math.max(0,Number(dto.currentDistance)||0),unityAmount:sanitizeAmount(dto.unityAmount),amount:sanitizeAmount(dto.amount),type:sanitizeLocation(dto.type)||'Gasolina comum',date:Number(dto.date)||Date.now(),location:sanitizeLocation(dto.location)||'Sem local'}; const db=getDb(); if(db){ try{ await db.insert(runs).values(row); return row;}catch{}} memory.push(row); return row;},
  async update(id:string,dto:any){ const db=getDb(); if(db){ try{ await db.update(runs).set(dto).where(eq(runs.id,id)); const rows=await db.select().from(runs).where(eq(runs.id,id)); return rows[0]??null;}catch{}} const idx=memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx]={...memory[idx],...dto}; return memory[idx];},
  async delete(id:string){ const db=getDb(); if(db){ try{ await db.delete(runs).where(eq(runs.id,id));}catch{}} memory=memory.filter(r=>r.id!==id);},
  async getAll(){ const db=getDb(); if(db){ try{ return await db.select().from(runs);}catch{}} return [...memory];},
  async clearMemory(){ memory=[]; const db=getDb(); if(db){ try{ await db.delete(runs);}catch{}}},
};
