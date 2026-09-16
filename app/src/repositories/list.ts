import { lists, items } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription, sanitizeAmount, sanitizeCategory, sanitizeLocation } from '../utils/sanitize';
const LIST_ITEM_CATEGORIES = ["Mercearia","Carnes","Fruteira","Higiêne","Limpeza","Outros"];
let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memLists:any[]=[]; let memItems:any[]=[]; function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
export const listRepo={
  async add(dto:any){ const row={id:dto.id??genId(),description:sanitizeDescription(dto.description)||'Sem descrição',location:sanitizeLocation(dto.location)||null,quantity:Math.max(0,Number(dto.quantity)||0),amount:sanitizeAmount(dto.amount),date:Number(dto.date)||Date.now()}; const db=getDb(); if(db){ try{ await db.insert(lists).values(row); return row;}catch{}} memLists.push(row); return row;},
  async addItem(dto:any){ const row={id:dto.id??genId(),list_id:dto.list_id,description:sanitizeDescription(dto.description)||'Sem descrição',category:sanitizeCategory(dto.category, LIST_ITEM_CATEGORIES),amount:sanitizeAmount(dto.amount),quantity:Math.max(0,Number(dto.quantity)||0),quantityDesired:Math.max(1,Number(dto.quantityDesired)||1),location:sanitizeLocation(dto.location)||null,date:Number(dto.date)||Date.now()}; const db=getDb(); if(db){ try{ await db.insert(items).values(row); return row;}catch{}} memItems.push(row); return row;},
  async delete(id:string){ const db=getDb(); if(db){ try{ await db.delete(items).where(eq(items.list_id,id)); await db.delete(lists).where(eq(lists.id,id));}catch{}} memItems=memItems.filter(r=>r.list_id!==id); memLists=memLists.filter(r=>r.id!==id);},
  async getAll(){ const db=getDb(); if(db){ try{ return await db.select().from(lists);}catch{}} return [...memLists];},
  async getItems(listId:string){ const db=getDb(); if(db){ try{ return await db.select().from(items).where(eq(items.list_id,listId));}catch{}} return memItems.filter(r=>r.list_id===listId);},
  async update(id:string, dto:any){
    const db=getDb();
    if(db){ try{ await db.update(lists).set(dto).where(eq(lists.id,id)); }catch{}}
    const idx=memLists.findIndex((r)=>r.id===id);
    if(idx>=0){ memLists[idx]={ ...memLists[idx], ...dto }; return memLists[idx]; }
    return null;
  },
  async updateItem(id:string, dto:any){
    const db=getDb();
    if(db){ try{ await db.update(items).set(dto).where(eq(items.id,id)); }catch{}}
    const idx=memItems.findIndex((r)=>r.id===id);
    if(idx>=0){ memItems[idx]={ ...memItems[idx], ...dto }; return memItems[idx]; }
    return null;
  },
  async deleteItem(id:string){
    const db=getDb();
    if(db){ try{ await db.delete(items).where(eq(items.id,id)); }catch{}}
    memItems=memItems.filter(r=>r.id!==id);
  },
  async clearMemory(){ memLists=[]; memItems=[]; const db=getDb(); if(db){ try{ await db.delete(items); await db.delete(lists);}catch{}}},
};
