/**
 * Sanitização central — port de `app/src/utils/sanitize.ts`.
 * - description: trim, NFKC, strip <>{}$;, bloqueia javascript:/data:/vbscript:, on*=, <script>, max 80
 * - amount: number positivo, max 99999999.99, 2 casas
 */

export function sanitizeDescription(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return "";
    input = String(input);
  }
  let s = (input as string).trim().normalize("NFKC");

  // Remove HTML tags entirely including <script>...</script> content handling via tag strip
  s = s.replace(/<[^>]*>/g, "");

  // Strip remaining dangerous chars <>{}$; that may have survived without <>
  s = s.replace(/[<>$;{}]/g, "");

  // Block javascript:, data:, vbscript: (case-insensitive)
  s = s.replace(/javascript:/gi, "");
  s = s.replace(/data:/gi, "");
  s = s.replace(/vbscript:/gi, "");

  // Strip event handlers on*= (onclick=, onload= etc) case-insensitive
  s = s.replace(/on\w+\s*=/gi, "");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  // Max 80 chars
  return s.slice(0, 80);
}

export function sanitizeAmount(input: unknown): number {
  let num: number;

  if (typeof input === "string") {
    // Handle Brazilian format "1.000,50" -> 1000.50 or "R$ 1.000,50"
    const cleaned = (input as string).trim().replace(/[R$\s]/g, "");
    let normalized = cleaned;
    if (cleaned.includes(",")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
    num = Number(normalized);
  } else {
    num = Number(input);
  }

  if (!isFinite(num) || isNaN(num)) return 0;
  if (num < 0) num = 0;
  if (num > 99999999.99) num = 99999999.99;
  // Round to 2 decimals
  return Math.round(num * 100) / 100;
}

/**
 * Generic cell sanitizer for CSV import - reuses description rules
 */
export function sanitizeCellString(input: unknown): string {
  return sanitizeDescription(input);
}

export function sanitizeLocation(input: unknown): string {
  if (typeof input !== "string") return "";
  const s = input
    .trim()
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>$;{}]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, 60);
}

export function sanitizeCategory(input: unknown, allowed?: string[]): string {
  const s = sanitizeDescription(input);
  if (allowed && allowed.length > 0) {
    return allowed.includes(s) ? s : "Outros";
  }
  return s;
}

export function sanitizeFileName(input: string): string {
  if (typeof input !== "string") return "file";
  return input.replace(/[^\w\-.]/g, "").slice(0, 100) || "file";
}
