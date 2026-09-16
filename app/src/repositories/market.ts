import { stock } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription, sanitizeAmount, sanitizeCategory } from '../utils/sanitize';
const STOCK_CATEGORIES = ["Mercearia","Carnes","Fruteira","Higiêne","Limpeza","Outros"];
let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memory:any[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const marketRepo={
  async add(dto:any){ const row={id:dto.id??genId(),description:sanitizeDescription(dto.description)||'Sem descrição',category:sanitizeCategory(dto.category, STOCK_CATEGORIES),amount:sanitizeAmount(dto.amount),quantity:Math.max(0, Number(dto.quantity)||0),quantityDesired:Math.max(1, Number(dto.quantityDesired)||1)}; const db=getDb(); if(db){ try{ await db.insert(stock).values(row); return row;}catch{}} memory.push(row); return row;},
  async update(id:string,dto:any){ const sanitized:any={...dto}; if(sanitized.description!==undefined) sanitized.description=sanitizeDescription(sanitized.description)||'Sem descrição'; if(sanitized.category!==undefined) sanitized.category=sanitizeCategory(sanitized.category, STOCK_CATEGORIES); if(sanitized.amount!==undefined) sanitized.amount=sanitizeAmount(sanitized.amount); const db=getDb(); if(db){ try{ await db.update(stock).set(sanitized).where(eq(stock.id,id)); const rows=await db.select().from(stock).where(eq(stock.id,id)); return rows[0]??null;}catch{}} const idx=memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx]={...memory[idx],...sanitized}; return memory[idx];},
  async delete(id:string){ const db=getDb(); if(db){ try{ await db.delete(stock).where(eq(stock.id,id));}catch{}} memory=memory.filter(r=>r.id!==id);},
  async getAll(){ const db=getDb(); if(db){ try{ return await db.select().from(stock);}catch{}} return [...memory];},
  async clearMemory(){ memory=[]; const db=getDb(); if(db){ try{ await db.delete(stock);}catch{}}},
};
