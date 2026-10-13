import { z } from "zod";

/**
 * Port de `app/src/schemas/config.zod.ts`.
 * Flags 0/1 preservadas (paridade exata com o mobile).
 */
export const configSchema = z.object({
  id: z.string().optional(),
  colorModeState: z.enum(["light", "dark"]).default("light"),
  isAiEnabled: z.number().int().min(0).max(1).default(0),
  apiKey: z.string().nullable().optional(),
  isShowLabelOnNavigation: z.number().int().min(0).max(1).default(1),
  isEnableTitheCard: z.number().int().min(0).max(1).default(1),
  isEnableTotalHistoryCard: z.number().int().min(0).max(1).default(1),
  willAddFuelToTransactionList: z.number().int().min(0).max(1).default(0),
  willUsePrefixToRemoveTihteSum: z.number().int().min(0).max(1).default(0),
  simpleFinancesItem: z.number().int().min(0).max(1).default(0),
  marketSimplifiedItems: z.number().int().min(0).max(1).default(0),
  prefixTithe: z.string().default(""),
  veicleName: z.string().nullable().optional(),
  veicleBrand: z.string().nullable().optional(),
  veicleYear: z.string().nullable().optional(),
  veicleColor: z.string().nullable().optional(),
  veiclePlate: z.string().nullable().optional(),
  veicleAutonomy: z.number().min(0).nullable().optional(),
  selectedFolderToSave: z.string().nullable().optional(),
  isBiometricEnabled: z.number().int().min(0).max(1).default(0),
  tithePercent: z.number().min(1).max(100).default(10),
  titheCategories: z.string().default('["Ganhos"]'),
  isTitheMenuEnabled: z.number().int().min(0).max(1).default(0),
});

export type ConfigZod = z.infer<typeof configSchema>;

export function validateConfig(dto: unknown) {
  return configSchema.safeParse(dto);
}
