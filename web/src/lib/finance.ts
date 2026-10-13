/** Pipeline de filtros de finanças — port puro de `app/src/repositories/finance.ts`. */
import { endOfDay, startOfDay } from "date-fns";

export type FinanceLike = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  paymentDate?: number | null;
  paymentStatus: boolean;
  isEnabled: boolean;
  isFavorited: boolean;
};

export type FinanceFilterParams = {
  selectedtypeofpayment?: string; // 0 todos 1 entradas 2 saidas
  search?: string;
  selectedPaymentCategory?: string;
  selectedPaymentStatus?: string; // Todos|Pago|Não Pago
  selectedFavoritedFilter?: string;
  selectedDateOrderFilter?: string; // Vencimento|Pagamento
  startDate?: string; // DD/MM/YYYY
  endDate?: string; // DD/MM/YYYY
};

function parseBRDate(s: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Ordem: tipo → busca → período → categoria → status → favoritos → sort desc.
 * Período inclusivo por dia (startOfDay/endOfDay), como o mobile com dayjs.
 */
export function filterFinances<T extends FinanceLike>(
  list: T[],
  params: FinanceFilterParams = {}
): T[] {
  if (!list) return [];
  const tipo = params.selectedtypeofpayment ?? "0";
  const busca = params.search ?? "";
  const categoria = params.selectedPaymentCategory ?? "Todos";
  const status = params.selectedPaymentStatus ?? "Todos";
  const favoritos = params.selectedFavoritedFilter ?? "Todos";
  const orderBy = params.selectedDateOrderFilter ?? "Vencimento";

  // 1) tipo
  const filteredType = list.filter((item) => {
    if (tipo === "0") return true;
    if (tipo === "1" && !item.isEnabled) return true; // entradas
    if (tipo === "2" && item.isEnabled) return true; // saídas
    return false;
  });

  // 2) busca textual
  const filteredWords =
    busca === ""
      ? filteredType
      : filteredType.filter((item) => item.description.includes(busca));

  // 3) período inclusivo
  let filteredByPeriod = filteredWords;
  const start = params.startDate ? parseBRDate(params.startDate) : null;
  const end = params.endDate ? parseBRDate(params.endDate) : null;
  if (start !== null && end !== null) {
    const from = startOfDay(start).getTime();
    const to = endOfDay(end).getTime();
    filteredByPeriod = filteredWords.filter(
      (item) => item.date >= from && item.date <= to
    );
  }

  // 4) categoria
  const byCategory = filteredByPeriod.filter((item) => {
    if (categoria === "Todos") return true;
    return item.category === categoria;
  });

  // 5) status pago
  const byStatus = byCategory.filter((item) => {
    if (status === "Todos") return true;
    if (status === "Pago") return !!item.paymentStatus;
    if (status === "Não Pago") return !item.paymentStatus;
    return true;
  });

  // 6) favoritos
  const byFavorited = byStatus.filter((item) => {
    if (favoritos === "Todos") return true;
    if (favoritos === "Favoritos") return !!item.isFavorited;
    if (favoritos === "Não favoritados") return !item.isFavorited;
    return true;
  });

  // 7) sort desc (cópia, sem mutar entrada)
  return [...byFavorited].sort((a, b) => {
    const da = orderBy === "Pagamento" ? (a.paymentDate ?? a.date) : a.date;
    const db = orderBy === "Pagamento" ? (b.paymentDate ?? b.date) : b.date;
    if (da < db) return 1;
    if (da > db) return -1;
    return 0;
  });
}

export type TitheOpts = {
  percent?: number;
  categories?: string[];
  prefix?: string;
  willUsePrefix?: boolean;
};

/** Espelha `useFinanceStore.getTithe` do mobile. */
export function calcTithe<T extends FinanceLike>(filtered: T[], opts: TitheOpts): number {
  let soma = 0;
  for (const it of filtered) {
    if (!it.isEnabled && (!opts.categories || opts.categories.includes(it.category))) {
      soma += Number(it.amount);
    }
    if (it.isEnabled && opts.willUsePrefix && opts.prefix && it.description.includes(opts.prefix)) {
      soma -= Number(it.amount);
    }
  }
  if (soma < 0) soma = 0;
  return (soma * (opts.percent ?? 10)) / 100;
}
