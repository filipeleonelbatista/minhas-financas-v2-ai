import { z } from 'zod';
import { sanitizeDescription, sanitizeAmount, sanitizeLocation } from '../utils/sanitize';

export const listSchema = z.object({
  description: z.string().trim().min(1).max(80).transform((v)=>sanitizeDescription(v)).refine((v)=>v.length>0),
  location: z.string().nullable().optional().transform((v)=> v ? sanitizeLocation(v) : null),
  quantity: z.number().int().min(0),
  amount: z.union([z.string(), z.number()]).transform((v)=>sanitizeAmount(v)),
  date: z.number().int().positive(),
});

export const listItemSchema = z.object({
  list_id: z.string().min(1),
  description: z.string().trim().min(1).max(80).transform((v)=>sanitizeDescription(v)),
  category: z.string().transform((v)=>sanitizeDescription(v)),
  amount: z.union([z.string(), z.number()]).transform((v)=>sanitizeAmount(v)),
  quantity: z.number().int().min(0),
  quantityDesired: z.number().int().min(1),
  location: z.string().nullable().optional().transform((v)=> v ? sanitizeLocation(v) : null),
  date: z.number().int().positive(),
});

export function validateList(dto: unknown){ return listSchema.safeParse(dto); }
export function validateListItem(dto: unknown){ return listItemSchema.safeParse(dto); }
