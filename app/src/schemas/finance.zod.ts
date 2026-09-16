import { z } from 'zod';
import { sanitizeDescription, sanitizeAmount } from '../utils/sanitize';

const FINANCE_CATEGORIES = ["Outros","Bares e Restaurantes","Beleza","Cartão","Emergência","Estudos","Ganhos","Investimentos","Mercado","Moradia","Saúde","Streaming","TV/Internet/Telefone","Transporte","Vestuário"] as const;

export const financeSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(80, "Máx 80 chars")
    .transform((v) => sanitizeDescription(v))
    .refine((v) => v.length > 0, "Descrição inválida após sanitização"),
  amount: z.union([z.string(), z.number()])
    .transform((v) => sanitizeAmount(v))
    .refine((v) => v >= 0 && v <= 99999999.99, "Valor deve estar entre 0 e 99.999.999,99"),
  category: z.string().transform((v) => {
    const s = sanitizeDescription(v);
    return (FINANCE_CATEGORIES as readonly string[]).includes(s) ? s : "Outros";
  }),
  date: z.number().int().positive(),
  paymentDate: z.number().int().nullable().optional(),
  paymentStatus: z.union([z.literal(0), z.literal(1), z.boolean()]).transform((v) => v ? 1 : 0),
  isEnabled: z.union([z.literal(0), z.literal(1), z.boolean()]).transform((v) => v ? 1 : 0),
  isFavorited: z.union([z.literal(0), z.literal(1), z.boolean()]).transform((v) => v ? 1 : 0),
});

export type FinanceZod = z.infer<typeof financeSchema>;

export function validateFinance(dto: unknown) {
  return financeSchema.safeParse(dto);
}
