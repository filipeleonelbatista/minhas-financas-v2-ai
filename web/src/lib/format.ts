/** Formatação pt-BR — moeda e datas (offset 12h anti-UTC, paridade mobile). */

export function formatBRL(value: number | string): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateBR(ts: number): string {
  return new Date(Number(ts)).toLocaleDateString("pt-BR");
}

/** "2026-06-15" (input date) → timestamp meio-dia local (evita bug UTC midnight). */
export function dateInputToTs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return Date.now();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0).getTime();
}

/** timestamp → "2026-06-15" para input date. */
export function tsToDateInput(ts: number): string {
  const d = new Date(Number(ts));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → "DD/MM/YYYY" (período dos filtros). */
export function formatPeriodDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "DD/MM/YYYY" → Date meia-noite local (null se inválida). */
export function parsePeriodDate(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s ?? "").trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Timestamp de criação. A regra do projeto manda timestamps como number com
 * offset anti-UTC; os inputs de data do web já caem meio-dia local
 * (dateInputToTs) e os forms legados somam +43200000, então Date.now() puro
 * aqui é equivalente e evita duplo deslocamento.
 */
export function nowTs(): number {
  return Date.now();
}
