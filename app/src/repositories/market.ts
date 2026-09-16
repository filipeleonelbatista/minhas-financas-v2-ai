import { stock } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription, sanitizeAmount, sanitizeCategory } from '../utils/sanitize';
import { stockSchema } from '../schemas/stock.zod';

const STOCK_CATEGORIES = ["Mercearia","Carnes","Fruteira","Higiêne","Limpeza","Outros"] as const;
export type StockDTO = {
  id?: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  quantityDesired: number;
};
export type StockRow = Required<Pick<StockDTO, 'id'>> & Omit<StockDTO, 'id'> & { id: string };

let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memory: StockRow[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const marketRepo={
  async add(dto: StockDTO): Promise<StockRow>{
    const parsed = stockSchema.safeParse(dto);
    const sanitizedDto = parsed.success ? parsed.data as StockDTO : dto;
    const row: StockRow={id:sanitizedDto.id??genId(),description:sanitizeDescription(sanitizedDto.description)||'Sem descrição',category:sanitizeCategory(sanitizedDto.category, STOCK_CATEGORIES as unknown as string[]),amount:sanitizeAmount(sanitizedDto.amount),quantity:Math.max(0, Number(sanitizedDto.quantity)||0),quantityDesired:Math.max(1, Number(sanitizedDto.quantityDesired)||1)};
    const db=getDb(); if(db){ try{ await db.insert(stock).values(row); return row;}catch{}} memory.push(row); return row;},
  async update(id:string,dto:Partial<StockDTO>): Promise<StockRow | null>{ const sanitized:any={...dto}; if(sanitized.description!==undefined) sanitized.description=sanitizeDescription(sanitized.description)||'Sem descrição'; if(sanitized.category!==undefined) sanitized.category=sanitizeCategory(sanitized.category, STOCK_CATEGORIES as unknown as string[]); if(sanitized.amount!==undefined) sanitized.amount=sanitizeAmount(sanitized.amount); if(sanitized.quantity!==undefined) sanitized.quantity=Math.max(0, Number(sanitized.quantity)||0); if(sanitized.quantityDesired!==undefined) sanitized.quantityDesired=Math.max(1, Number(sanitized.quantityDesired)||1); const db=getDb(); if(db){ try{ await db.update(stock).set(sanitized).where(eq(stock.id,id)); const rows=await db.select().from(stock).where(eq(stock.id,id)); return rows[0] as StockRow ??null;}catch{}} const idx=memory.findIndex(r=>r.id===id); if(idx===-1) return null; memory[idx]={...memory[idx],...sanitized}; return memory[idx];},
  async delete(id:string): Promise<void>{ const db=getDb(); if(db){ try{ await db.delete(stock).where(eq(stock.id,id));}catch{}} memory=memory.filter(r=>r.id!==id);},
  async getAll(): Promise<StockRow[]>{ const db=getDb(); if(db){ try{ return await db.select().from(stock) as StockRow[];}catch{}} return [...memory];},
  async clearMemory(): Promise<void>{ memory=[]; const db=getDb(); if(db){ try{ await db.delete(stock);}catch{}}},
};
