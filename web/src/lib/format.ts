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

/** timestamp de criação (mobile soma offset 12h; no web os inputs já caem meio-dia local). */
export function nowTs(): number {
  return Date.now();
}
