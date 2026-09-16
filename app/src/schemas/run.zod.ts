import { z } from 'zod';
import { sanitizeLocation, sanitizeAmount } from '../utils/sanitize';

export const runSchema = z.object({
  currentDistance: z.number().min(0),
  unityAmount: z.union([z.string(), z.number()]).transform((v)=>sanitizeAmount(v)),
  amount: z.union([z.string(), z.number()]).transform((v)=>sanitizeAmount(v)),
  type: z.string().transform((v)=> sanitizeLocation(v) || 'Gasolina comum'),
  date: z.number().int().positive(),
  location: z.string().transform((v)=> sanitizeLocation(v) || 'Sem local').refine((v)=>v.length>0),
});

export type RunZod = z.infer<typeof runSchema>;
export function validateRun(dto: unknown){ return runSchema.safeParse(dto); }
