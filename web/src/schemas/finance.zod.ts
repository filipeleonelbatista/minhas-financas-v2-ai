import { z } from "zod";
import { sanitizeAmount, sanitizeDescription } from "../utils/sanitize";

export const FINANCE_CATEGORIES = [
  "Outros",
  "Bares e Restaurantes",
  "Beleza",
  "Cartão",
  "Emergência",
  "Estudos",
  "Ganhos",
  "Investimentos",
  "Mercado",
  "Moradia",
  "Saúde",
  "Streaming",
  "TV/Internet/Telefone",
  "Transporte",
  "Vestuário",
] as const;

/**
 * Flags 0/1 do mobile viram boolean no web (decisão AGENTS.md §2 regra 3).
 * Aceita 0/1/boolean na borda (import CSV legado) e normaliza para boolean.
 */
const booleanFlag = z
  .union([z.literal(0), z.literal(1), z.boolean()])
  .transform((v) => v === true || v === 1);

export const financeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(80, "Máx 80 chars")
    .transform((v) => sanitizeDescription(v))
    .refine((v) => v.length > 0, "Descrição inválida após sanitização"),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => sanitizeAmount(v))
    .refine((v) => v >= 0 && v <= 99999999.99, "Valor deve estar entre 0 e 99.999.999,99"),
  category: z.string().transform((v) => {
    const s = sanitizeDescription(v);
    return (FINANCE_CATEGORIES as readonly string[]).includes(s) ? s : "Outros";
  }),
  date: z.number().int().positive(),
  paymentDate: z.number().int().nullable().optional(),
  paymentStatus: booleanFlag,
  isEnabled: booleanFlag,
  isFavorited: booleanFlag,
});

export type FinanceZod = z.infer<typeof financeSchema>;

export function validateFinance(dto: unknown) {
  return financeSchema.safeParse(dto);
}
