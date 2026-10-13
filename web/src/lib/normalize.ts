/**
 * Borda forms legados/CSV → stores: normaliza Date/string/BR-money para DTOs.
 * Os stores validam com zod; aqui só convertemos formatos.
 */
import { sanitizeAmount } from "../utils/sanitize";

export type RawRecord = Record<string, unknown>;

/** Date | ms | ISO | "" | null → timestamp | null */
export function toTimestamp(v: unknown): number | null {
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** "1"/1/true → true; resto → false */
export function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

/** "1.234,56" | "60.5" | 60.5 → number (reusa sanitizeAmount: clamp 0..99M, 2 casas) */
export function parseBRMoney(v: unknown): number {
  return sanitizeAmount(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function normalizeFinanceInput(raw: RawRecord): RawRecord {
  const out: RawRecord = {
    description: str(raw.description),
    amount: parseBRMoney(raw.amount),
    category: str(raw.category, "Outros"),
    date: toTimestamp(raw.date) ?? Date.now(),
    paymentDate: toTimestamp(raw.paymentDate),
    paymentStatus: toBool(raw.paymentStatus),
    isEnabled: toBool(raw.isEnabled),
    isFavorited: toBool(raw.isFavorited),
  };
  if (typeof raw.id === "string" && raw.id) out.id = raw.id;
  if (typeof raw.about === "string") out.about = raw.about;
  return out;
}

export function normalizeRunInput(raw: RawRecord): RawRecord {
  const out: RawRecord = {
    currentDistance: parseBRMoney(raw.currentDistance),
    unityAmount: parseBRMoney(raw.unityAmount),
    amount: parseBRMoney(raw.amount),
    type: str(raw.type),
    date: toTimestamp(raw.date) ?? Date.now(),
    location: str(raw.location),
  };
  if (typeof raw.id === "string" && raw.id) out.id = raw.id;
  return out;
}

export function normalizeStockInput(raw: RawRecord): RawRecord {
  const qty = parseInt(String(raw.quantity ?? ""), 10);
  const qdRaw = raw.quantityDesired;
  const qdParsed = qdRaw === "" || qdRaw === null || qdRaw === undefined ? NaN : parseInt(String(qdRaw), 10);
  const out: RawRecord = {
    description: str(raw.description),
    amount: parseBRMoney(raw.amount),
    category: str(raw.category, "Mercearia"),
    quantity: Number.isNaN(qty) ? 0 : Math.max(0, qty),
    quantityDesired: Number.isNaN(qdParsed) || qdParsed < 1 ? 1 : qdParsed,
  };
  if (typeof raw.id === "string" && raw.id) out.id = raw.id;
  return out;
}
