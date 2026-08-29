/**
 * Sanitização central §1.7.1 ROADMAP + §4 spec
 * - description: trim, NFKC, strip <>{}$;, bloqueia javascript:/data:/vbscript:, on*=, <script>, max 80
 * - amount: number positivo, max 99999999.99, 2 casas
 */

export function sanitizeDescription(input: unknown): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    input = String(input);
  }
  let s = (input as string).trim().normalize('NFKC');

  // Remove HTML tags entirely including <script>...</script> content handling via tag strip
  // This leaves inner text (e.g., <script>alert(1)</script> -> alert(1))
  s = s.replace(/<[^>]*>/g, '');

  // Strip remaining dangerous chars <>{}$; that may have survived without <>
  s = s.replace(/[<>$;{}]/g, '');

  // Block javascript:, data:, vbscript: (case-insensitive)
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/data:/gi, '');
  s = s.replace(/vbscript:/gi, '');

  // Strip event handlers on*=  (onclick=, onload= etc) case-insensitive
  s = s.replace(/on\w+\s*=/gi, '');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // Max 80 chars (ROADMAP spec)
  return s.slice(0, 80);
}

export function sanitizeAmount(input: unknown): number {
  let num: number;

  if (typeof input === 'string') {
    // Handle Brazilian format "1.000,50" -> 1000.50 or "R$ 1.000,50"
    const cleaned = (input as string).trim().replace(/[R$\s]/g, '');
    // If contains comma as decimal, normalize
    // Simple: if contains ',' then replace '.' thousands and ',' decimal
    let normalized = cleaned;
    if (cleaned.includes(',')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
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
 * Generic cell sanitizer for Excel import - reuses description rules
 */
export function sanitizeCellString(input: unknown): string {
  // For Excel cells we allow slightly longer but still apply same XSS strip, but no 80 limit for generic?
  // Spec says each cell passes same sanitize as description - so enforce 80 for description-like
  // Keep 80 limit for consistency, caller may slice differently
  return sanitizeDescription(input);
}

export function sanitizeLocation(input: unknown): string {
  if (typeof input !== 'string') return '';
  let s = input.trim().normalize('NFKC').replace(/<[^>]*>/g, '').replace(/[<>$;{}]/g, '').replace(/javascript:/gi, '').replace(/data:/gi, '').replace(/on\w+\s*=/gi, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 60);
}

export function sanitizeCategory(input: unknown, allowed?: string[]): string {
  const s = sanitizeDescription(input);
  if (allowed && allowed.length > 0) {
    return allowed.includes(s) ? s : 'Outros';
  }
  return s;
}

export function sanitizeFileName(input: string): string {
  if (typeof input !== 'string') return 'file';
  return input.replace(/[^\w\-_.]/g, '').slice(0, 100) || 'file';
}
