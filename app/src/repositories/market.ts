import { stock } from '../db/schema';
import { eq } from 'drizzle-orm';
let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memory:any[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const marketRepo={
  async add(dto:any){ const row={id:dto.id??genId(),description:dto.description,category:dto.category,amount:Number(dto.amount),quantity:Number(dto.quantity),quantityDesired:Number(dto.quantityDesired)}; const db=getDb(); if(db){ try{ await db.insert(stock).values(row); return row;}catch{}} memory.push(row); return row;},
  async update(id:string,dto:any){ const db=getDb(); if(db){ try{ await db.update(stock).set(dto).where(eq(stock.id,id)); const rows=await db.select().from(stock).where(eq(stock.id,id)); return rows[0]??null;}catch{}} const idx=memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx]={...memory[idx],...dto}; return memory[idx];},
  async delete(id:string){ const db=getDb(); if(db){ try{ await db.delete(stock).where(eq(stock.id,id));}catch{}} memory=memory.filter(r=>r.id!==id);},
  async getAll(){ const db=getDb(); if(db){ try{ return await db.select().from(stock);}catch{}} return [...memory];},
  async clearMemory(){ memory=[]; const db=getDb(); if(db){ try{ await db.delete(stock);}catch{}}},
};
