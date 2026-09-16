import { lists, items } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription, sanitizeAmount, sanitizeCategory, sanitizeLocation } from '../utils/sanitize';
import { listSchema, listItemSchema } from '../schemas/list.zod';

const LIST_ITEM_CATEGORIES = ["Mercearia","Carnes","Fruteira","Higiêne","Limpeza","Outros"] as const;

export type ListDTO = {
  id?: string;
  description: string;
  location?: string | null;
  quantity: number;
  amount: number;
  date: number;
};
export type ListRow = Required<Pick<ListDTO,'id'>> & Omit<ListDTO,'id'> & { id: string };

export type ListItemDTO = {
  id?: string;
  list_id: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  quantityDesired: number;
  location?: string | null;
  date: number;
};
export type ListItemRow = Required<Pick<ListItemDTO,'id'>> & Omit<ListItemDTO,'id'> & { id: string };

let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memLists: ListRow[]=[]; let memItems: ListItemRow[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const listRepo={
  async add(dto: ListDTO): Promise<ListRow>{ const parsed=listSchema.safeParse(dto); const sDto=parsed.success ? parsed.data as unknown as ListDTO : dto; const row: ListRow={id:sDto.id??genId(),description:sanitizeDescription(sDto.description)||'Sem descrição',location:sanitizeLocation(sDto.location as string)||null,quantity:Math.max(0,Number(sDto.quantity)||0),amount:sanitizeAmount(sDto.amount),date:Number(sDto.date)||Date.now()}; const db=getDb(); if(db){ try{ await db.insert(lists).values(row); return row;}catch{}} memLists.push(row); return row;},
  async addItem(dto: ListItemDTO): Promise<ListItemRow>{ const parsed=listItemSchema.safeParse(dto); const sDto=parsed.success ? parsed.data as unknown as ListItemDTO : dto; const row: ListItemRow={id:sDto.id??genId(),list_id:sDto.list_id,description:sanitizeDescription(sDto.description)||'Sem descrição',category:sanitizeCategory(sDto.category, LIST_ITEM_CATEGORIES as unknown as string[]),amount:sanitizeAmount(sDto.amount),quantity:Math.max(0,Number(sDto.quantity)||0),quantityDesired:Math.max(1,Number(sDto.quantityDesired)||1),location:sanitizeLocation(sDto.location as string)||null,date:Number(sDto.date)||Date.now()}; const db=getDb(); if(db){ try{ await db.insert(items).values(row); return row;}catch{}} memItems.push(row); return row;},
  async delete(id:string): Promise<void>{ const db=getDb(); if(db){ try{ await db.delete(items).where(eq(items.list_id,id)); await db.delete(lists).where(eq(lists.id,id));}catch{}} memItems=memItems.filter(r=>r.list_id!==id); memLists=memLists.filter(r=>r.id!==id);},
  async getAll(): Promise<ListRow[]>{ const db=getDb(); if(db){ try{ return await db.select().from(lists) as ListRow[];}catch{}} return [...memLists];},
  async getItems(listId:string): Promise<ListItemRow[]>{ const db=getDb(); if(db){ try{ return await db.select().from(items).where(eq(items.list_id,listId)) as ListItemRow[];}catch{}} return memItems.filter(r=>r.list_id===listId);},
  async update(id:string, dto: Partial<ListDTO>): Promise<ListRow | null>{
    const db=getDb();
    if(db){ try{ await db.update(lists).set(dto as any).where(eq(lists.id,id)); }catch{}}
    const idx=memLists.findIndex((r)=>r.id===id);
    if(idx>=0){ memLists[idx]={ ...memLists[idx], ...dto } as ListRow; return memLists[idx]; }
    return null;
  },
  async updateItem(id:string, dto: Partial<ListItemDTO>): Promise<ListItemRow | null>{
    const db=getDb();
    if(db){ try{ await db.update(items).set(dto as any).where(eq(items.id,id)); }catch{}}
    const idx=memItems.findIndex((r)=>r.id===id);
    if(idx>=0){ memItems[idx]={ ...memItems[idx], ...dto } as ListItemRow; return memItems[idx]; }
    return null;
  },
  async deleteItem(id:string): Promise<void>{
    const db=getDb();
    if(db){ try{ await db.delete(items).where(eq(items.id,id)); }catch{}}
    memItems=memItems.filter(r=>r.id!==id);
  },
  async clearMemory(): Promise<void>{ memLists=[]; memItems=[]; const db=getDb(); if(db){ try{ await db.delete(items); await db.delete(lists);}catch{}}},
};
