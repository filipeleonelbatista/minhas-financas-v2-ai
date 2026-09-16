import { z } from 'zod';
import { sanitizeDescription } from '../utils/sanitize';
import { normalizeCategory } from '../repositories/goal';

export const goalSchema = z.object({
  description: z.string().trim().min(1).max(80).transform((v) => sanitizeDescription(v)).refine((v)=>v.length>0),
  amount: z.number().min(0).max(99999999.99),
  currentAmount: z.number().min(0).max(99999999.99).default(0),
  date: z.number().int().positive(),
  category: z.string().transform((v) => normalizeCategory(v)),
  icon: z.string().optional(),
});

export type GoalZod = z.infer<typeof goalSchema>;
export function validateGoal(dto: unknown){ return goalSchema.safeParse(dto); }
