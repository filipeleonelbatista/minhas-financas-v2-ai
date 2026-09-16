import { z } from 'zod';
import { sanitizeDescription, sanitizeAmount } from '../utils/sanitize';

const STOCK_CATEGORIES = ["Mercearia","Carnes","Fruteira","Higiêne","Limpeza","Outros"] as const;

export const stockSchema = z.object({
  description: z.string().trim().min(1).max(80).transform((v) => sanitizeDescription(v)).refine((v) => v.length>0),
  category: z.string().transform((v) => {
    const s = sanitizeDescription(v);
    return (STOCK_CATEGORIES as readonly string[]).includes(s) ? s : "Outros";
  }),
  amount: z.union([z.string(), z.number()]).transform((v) => sanitizeAmount(v)),
  quantity: z.number().int().min(0).default(0),
  quantityDesired: z.number().int().min(1).default(1),
});

export type StockZod = z.infer<typeof stockSchema>;
export function validateStock(dto: unknown) { return stockSchema.safeParse(dto); }
