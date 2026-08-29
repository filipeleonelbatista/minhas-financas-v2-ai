import { config } from '../db/schema';
import { eq } from 'drizzle-orm';
let _db:any=null; let _a=false; function getDb():any{ if(_a) return _db; _a=true; try{ const m=require('../db'); _db=m.db??null;}catch{ _db=null;} return _db;}
let memory:any={};
export const configRepo={
  async get(){ const db=getDb(); if(db){ try{ const rows=await db.select().from(config); return rows[0]??null;}catch{}} return memory.id?memory:null;},
  async upsert(dto:any){ const row={id:dto.id??'config-singleton', ...dto}; const db=getDb(); if(db){ try{ const existing=await db.select().from(config).where(eq(config.id,row.id)); if(existing.length) await db.update(config).set(row).where(eq(config.id,row.id)); else await db.insert(config).values(row); return row;}catch{}} memory=row; return row;},
  async clearMemory(){ memory={}; const db=getDb(); if(db){ try{ await db.delete(config);}catch{}}},
};
