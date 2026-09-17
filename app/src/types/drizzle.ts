import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Typed row helpers for drizzle-orm tables.
 * Centralizes InferSelectModel exports so repositories and UI can import without
 * re-declaring ad-hoc Row types that drift from schema.
 */

export type FinanceRow = InferSelectModel<typeof schema.finances>;
export type FinanceInsert = InferInsertModel<typeof schema.finances>;

export type RunRow = InferSelectModel<typeof schema.runs>;
export type RunInsert = InferInsertModel<typeof schema.runs>;

export type GoalRow = InferSelectModel<typeof schema.goals>;
export type GoalInsert = InferInsertModel<typeof schema.goals>;

export type StockRow = InferSelectModel<typeof schema.stock>;
export type StockInsert = InferInsertModel<typeof schema.stock>;

export type ListRow = InferSelectModel<typeof schema.lists>;
export type ListInsert = InferInsertModel<typeof schema.lists>;

export type ItemRow = InferSelectModel<typeof schema.items>;
export type ItemInsert = InferInsertModel<typeof schema.items>;

export type ConfigRow = InferSelectModel<typeof schema.config>;
export type ConfigInsert = InferInsertModel<typeof schema.config>;

export type TithePaymentRow = InferSelectModel<typeof schema.tithePayments>;
export type TithePaymentInsert = InferInsertModel<typeof schema.tithePayments>;
