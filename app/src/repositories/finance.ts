import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Extend dayjs plugins once
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { finances } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeDescription, sanitizeAmount, sanitizeCategory } from '../utils/sanitize';
import { financeSchema } from '../schemas/finance.zod';

const FINANCE_CATEGORIES = ["Outros","Bares e Restaurantes","Beleza","Cartão","Emergência","Estudos","Ganhos","Investimentos","Mercado","Moradia","Saúde","Streaming","TV/Internet/Telefone","Transporte","Vestuário"];

// Lazy db access to keep jest without native module working
let _db: any = null;
let _dbLoadAttempted = false;
function getDb(): any {
  if (_dbLoadAttempted) return _db;
  _dbLoadAttempted = true;
  try {
    // dynamic require to allow jest mock before import
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../db');
    _db = mod.db ?? null;
  } catch {
    _db = null;
  }
  return _db;
}

// In-memory fallback for jest / offline testing (TDD)
let memoryStore: FinanceRow[] = [];

export type FinanceDTO = {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  paymentDate?: number | null;
  paymentStatus: number; // 0/1
  isEnabled: number; // 0 entrada, 1 saída
  isFavorited: number; // 0/1
};

export type FinanceRow = Required<Pick<FinanceDTO, 'id'>> & Omit<FinanceDTO, 'id'> & { id: string };

export type QueryFilteredParams = {
  // support both new and legacy naming for compat
  tipo?: string; // "0"|"1"|"2"
  selectedtypeofpayment?: string;
  busca?: string;
  search?: string;
  categoria?: string;
  selectedPaymentCategory?: string;
  status?: string; // Todos|Pago|Não Pago
  selectedPaymentStatus?: string;
  favoritos?: string; // Todos|Favoritos|Não favoritados
  selectedFavoritedFilter?: string;
  orderBy?: string; // Vencimento|Pagamento
  selectedDateOrderFilter?: string;
  startDate?: string; // DD/MM/YYYY
  endDate?: string; // DD/MM/YYYY
};

function normalizeParams(p: QueryFilteredParams = {}): Required<QueryFilteredParams> {
  return {
    tipo: p.tipo ?? p.selectedtypeofpayment ?? '0',
    busca: p.busca ?? p.search ?? '',
    categoria: p.categoria ?? p.selectedPaymentCategory ?? 'Todos',
    status: p.status ?? p.selectedPaymentStatus ?? 'Todos',
    favoritos: p.favoritos ?? p.selectedFavoritedFilter ?? 'Todos',
    orderBy: p.orderBy ?? p.selectedDateOrderFilter ?? 'Vencimento',
    selectedtypeofpayment: p.selectedtypeofpayment ?? p.tipo ?? '0',
    search: p.search ?? p.busca ?? '',
    selectedPaymentCategory: p.selectedPaymentCategory ?? p.categoria ?? 'Todos',
    selectedPaymentStatus: p.selectedPaymentStatus ?? p.status ?? 'Todos',
    selectedFavoritedFilter: p.selectedFavoritedFilter ?? p.favoritos ?? 'Todos',
    selectedDateOrderFilter: p.selectedDateOrderFilter ?? p.orderBy ?? 'Vencimento',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
  } as Required<QueryFilteredParams>;
}

/**
 * Pure filter pipeline matching PaymentsContext filteredList
 * Order: tipo → busca → periodo → categoria → status → favoritos → sort
 */
export function filterFinances(list: FinanceRow[], params: QueryFilteredParams = {}): FinanceRow[] {
  if (!list) return [];
  const p = normalizeParams(params);

  // 1) tipo
  const filteredType = list.filter((item) => {
    if (p.tipo === '0') return true;
    if (p.tipo === '1' && !item.isEnabled) return true; // entradas
    if (p.tipo === '2' && item.isEnabled) return true; // saídas
    return false;
  });

  // 2) busca textual (case-sensitive matching original PaymentsContext)
  const filteredWords =
    p.busca === '' ? filteredType : filteredType.filter((item) => item.description.includes(p.busca));

  // 3) periodo (inclusive, dayjs isSameOrAfter/isSameOrBefore)
  let filteredByPeriod = filteredWords;
  if (p.startDate && p.endDate) {
    const currentStartDate = dayjs(
      `${p.startDate.split('/')[2]}-${p.startDate.split('/')[1]}-${p.startDate.split('/')[0]}`
    );
    const currentEndDate = dayjs(
      `${p.endDate.split('/')[2]}-${p.endDate.split('/')[1]}-${p.endDate.split('/')[0]}`
    );
    // Validate dates before filtering; if invalid, keep as is
    if (currentStartDate.isValid() && currentEndDate.isValid()) {
      filteredByPeriod = filteredWords.filter((item) => {
        const itemDate = dayjs(item.date);
        return itemDate.isSameOrAfter(currentStartDate) && itemDate.isSameOrBefore(currentEndDate);
      });
    }
  }

  // 4) categoria
  const filteredByPaymentCategory = filteredByPeriod.filter((item) => {
    if (p.categoria === 'Todos') return true;
    return item.category === p.categoria;
  });

  // 5) status pago
  const filteredByPaymentStatus = filteredByPaymentCategory.filter((item) => {
    if (p.status === 'Todos') return true;
    if (p.status === 'Pago') return !!item.paymentStatus;
    if (p.status === 'Não Pago') return !item.paymentStatus;
    return true;
  });

  // 6) favoritos
  const filteredByFavoritedStatus = filteredByPaymentStatus.filter((item) => {
    if (p.favoritos === 'Todos') return true;
    if (p.favoritos === 'Favoritos') return !!item.isFavorited;
    if (p.favoritos === 'Não favoritados') return !item.isFavorited;
    return true;
  });

  // 7) sort descending (newest first)
  // Clone before sort to avoid mutating input
  const sorted = [...filteredByFavoritedStatus].sort((a, b) => {
    if (p.orderBy === 'Vencimento') {
      const dateA = dayjs(a.date);
      const dateB = dayjs(b.date);
      if (dateA.isBefore(dateB)) return 1;
      if (dateA.isAfter(dateB)) return -1;
      return 0;
    }
    if (p.orderBy === 'Pagamento') {
      const dateA = dayjs(a.paymentDate ?? a.date);
      const dateB = dayjs(b.paymentDate ?? b.date);
      if (dateA.isBefore(dateB)) return 1;
      if (dateA.isAfter(dateB)) return -1;
      return 0;
    }
    return 0;
  });

  return sorted;
}

export type CalcTitheParams = {
  percent?: number; // default 10
  categories?: string[]; // base selecionada, empty => R$0 warning
  willUsePrefixToRemoveTitheSum?: boolean;
  willUsePrefixToRemoveTihteSum?: boolean; // legacy typo alias (SettingsContext)
  prefixTithe?: string;
  // optionally pass already filtered list; if omitted, repo will fetch
  filteredList?: FinanceRow[];
};

/**
 * Pure tithe calc matching PaymentsContext Tithe + Roadmap 5.12
 * - percent default 10
 * - categories filter: only count entradas where category in categories
 * - if categories empty => 0 (warning case)
 * - subtract saidas with prefix if flag + prefix non-empty and description includes prefix
 * - clamp negative to 0
 */
export function calcTithePure(
  list: FinanceRow[],
  params: CalcTitheParams = {}
): number {
  const percent = params.percent ?? 10;
  const categories = params.categories ?? [];
  // RoadMap 5.12: base 0 => R$0
  if (categories.length === 0) return 0;

  const willUsePrefix =
    params.willUsePrefixToRemoveTitheSum ??
    (params as any).willUsePrefixToRemoveTihteSum ??
    false;
  const prefix = params.prefixTithe ?? '';

  let soma = 0;
  for (const item of list) {
    // only entradas matching selected categories contribute positively
    // original PaymentsContext summed all !isEnabled regardless category;
    // repo evolution: filter by categories
    if (!item.isEnabled && categories.includes(item.category)) {
      soma += Number(item.amount);
    }
    if (item.isEnabled && willUsePrefix) {
      if (prefix !== '' && item.description.includes(prefix)) {
        soma -= Number(item.amount);
      }
    }
  }
  if (soma < 0) soma = 0;
  return (soma * percent) / 100;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getAllMemoryOrDb(): Promise<FinanceRow[]> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db.select().from(finances);
      // drizzle returns typed rows
      return rows as FinanceRow[];
    } catch {
      // fallback to memory on db failure
      return [...memoryStore];
    }
  }
  return [...memoryStore];
}

export const financeRepo = {
  /** Add finance row – wired to zod source of truth */
  async add(dto: FinanceDTO): Promise<FinanceRow> {
    const id = dto.id ?? generateId();
    const parsed = financeSchema.parse({
      description: dto.description,
      amount: dto.amount,
      category: dto.category,
      date: Number(dto.date),
      paymentDate: dto.paymentDate ?? null,
      paymentStatus: dto.paymentStatus,
      isEnabled: dto.isEnabled,
      isFavorited: dto.isFavorited,
    });
    const description = parsed.description || 'Sem descrição';
    const row: FinanceRow = {
      id,
      description,
      amount: parsed.amount,
      category: parsed.category,
      date: parsed.date,
      paymentDate: parsed.paymentDate ?? null,
      paymentStatus: parsed.paymentStatus,
      isEnabled: parsed.isEnabled,
      isFavorited: parsed.isFavorited,
    };
    const db = getDb();
    if (db) {
      try {
        await db.insert(finances).values(row);
        return row;
      } catch {
        // fallback
        memoryStore.push(row);
        return row;
      }
    }
    memoryStore.push(row);
    return row;
  },

  /** Update by id */
  async update(id: string, dto: Partial<FinanceDTO>): Promise<FinanceRow | null> {
    const db = getDb();
    const updates: any = {};
    if (dto.description !== undefined) updates.description = sanitizeDescription(dto.description) || 'Sem descrição';
    if (dto.amount !== undefined) updates.amount = sanitizeAmount(dto.amount);
    if (dto.category !== undefined) updates.category = sanitizeCategory(dto.category, FINANCE_CATEGORIES);
    if (dto.date !== undefined) updates.date = Number(dto.date);
    if (dto.paymentDate !== undefined) updates.paymentDate = dto.paymentDate;
    if (dto.paymentStatus !== undefined) updates.paymentStatus = Number(dto.paymentStatus) ? 1 : 0;
    if (dto.isEnabled !== undefined) updates.isEnabled = Number(dto.isEnabled) ? 1 : 0;
    if (dto.isFavorited !== undefined) updates.isFavorited = Number(dto.isFavorited) ? 1 : 0;

    if (db) {
      try {
        await db.update(finances).set(updates).where(eq(finances.id, id));
        const rows = await db.select().from(finances).where(eq(finances.id, id));
        return (rows[0] as FinanceRow) ?? null;
      } catch {
        // fallback memory
      }
    }
    const idx = memoryStore.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    memoryStore[idx] = { ...memoryStore[idx], ...updates } as FinanceRow;
    return memoryStore[idx];
  },

  /** Delete by id */
  async delete(id: string): Promise<void> {
    const db = getDb();
    if (db) {
      try {
        await db.delete(finances).where(eq(finances.id, id));
        // also remove from memory fallback if present
        memoryStore = memoryStore.filter((r) => r.id !== id);
        return;
      } catch {
        // fallback
      }
    }
    memoryStore = memoryStore.filter((r) => r.id !== id);
  },

  /** Get all rows */
  async getAll(): Promise<FinanceRow[]> {
    return getAllMemoryOrDb();
  },

  /**
   * queryFiltered - aplica pipeline PaymentsContext
   * If transactions param provided, filters that list pure (useful for tests/UI).
   * If omitted, fetches from DB (or memory) then filters.
   * Supports both signatures: queryFiltered(params) and queryFiltered(list, params)
   */
  async queryFiltered(
    paramsOrList?: QueryFilteredParams | FinanceRow[],
    maybeParams?: QueryFilteredParams
  ): Promise<FinanceRow[]> {
    let list: FinanceRow[] | null = null;
    let params: QueryFilteredParams = {};

    if (Array.isArray(paramsOrList)) {
      list = paramsOrList;
      params = maybeParams ?? {};
    } else {
      params = (paramsOrList as QueryFilteredParams) ?? {};
      list = null;
    }

    const source = list ?? (await getAllMemoryOrDb());
    return filterFinances(source, params);
  },

  /**
   * calcTithe - 10% (or custom %) sobre Ganhos selecionados
   * If params.filteredList provided, uses it (already filtered).
   * Otherwise fetches source and applies category/prefix logic directly.
   */
  async calcTithe(params: CalcTitheParams = {}): Promise<number> {
    const percent = params.percent ?? 10;
    const categories = params.categories ?? [];

    // Roadmap 5.12: empty base => 0
    if (categories.length === 0) return 0;

    // if caller provided filteredList, use pure
    if (params.filteredList) {
      return calcTithePure(params.filteredList, params);
    }

    // otherwise fetch and compute
    const all = await getAllMemoryOrDb();

    // We should mimic original: Tithe uses filteredList (period etc) but for repo calc we use categories + prefix.
    // For simplicity, compute pure on all with categories/prefix filtering.
    // If caller wants period filtering, they should pass filteredList = await queryFiltered({ startDate, endDate... })
    return calcTithePure(all, { percent, categories, willUsePrefixToRemoveTitheSum: params.willUsePrefixToRemoveTitheSum, willUsePrefixToRemoveTihteSum: params.willUsePrefixToRemoveTihteSum, prefixTithe: params.prefixTithe });
  },

  // test helper
  async clearMemory(): Promise<void> {
    memoryStore = [];
    const db = getDb();
    if (db) {
      try {
        await db.delete(finances);
      } catch {
        // ignore
      }
    }
  },

  // expose pure helpers for unit tests
  _memoryStore: () => memoryStore,
};

// keep legacy alias for typo consistency
export const filteredList = filterFinances;
