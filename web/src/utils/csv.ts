/** CSV seguro — parse/export com guards anti-fórmula (port das regras de `app/src/utils/excel.ts`). */
import Papa from "papaparse";

export const CSV_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 5000,
  maxCols: 20,
} as const;

const UNSAFE_PATTERNS = [
  /HYPERLINK/i,
  /WEBSERVICE/i,
  /\bCMD\b/i,
  /\bDDE\b/i,
  /IMPORTXML/i,
  /IMPORTDATA/i,
  /\bEXEC\b/i,
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
];

/** Célula que o Excel/Libre interpretaria como fórmula ou ação → bloqueada. */
export function isSafeCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (!s) return true;
  const first = s[0];
  if (first === "=" || first === "+" || first === "@") return false;
  if (first === "-" && s.length > 1 && /[a-zA-Z]/.test(s[1])) return false;
  for (const re of UNSAFE_PATTERNS) {
    if (re.test(s)) return false;
  }
  return true;
}

export type CsvFileLike = Pick<File, "name" | "size" | "text">;

export function validateCsvFile(file: Pick<CsvFileLike, "name" | "size">): {
  ok: boolean;
  error?: string;
} {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "Selecione um arquivo .csv gerado pelo sistema." };
  }
  if (!file.size || file.size <= 0) {
    return { ok: false, error: "Arquivo vazio." };
  }
  if (file.size > CSV_LIMITS.maxBytes) {
    return { ok: false, error: "Arquivo maior que 5MB." };
  }
  return { ok: true };
}

export type ParsedCsv = { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string };

export function parseCsvText(text: string, requiredFields?: string[]): ParsedCsv {
  if (text.length > CSV_LIMITS.maxBytes) {
    return { ok: false, error: "Arquivo maior que 5MB." };
  }
  let result: Papa.ParseResult<Record<string, unknown>>;
  try {
    result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
  } catch {
    return { ok: false, error: "Erro ao analisar o arquivo CSV!" };
  }
  const rows = (result.data ?? []).filter((r) => r && typeof r === "object");
  if (result.meta.fields && result.meta.fields.length > CSV_LIMITS.maxCols) {
    return { ok: false, error: "CSV com colunas demais (máx 20)." };
  }
  if (rows.length > CSV_LIMITS.maxRows) {
    return { ok: false, error: "CSV com linhas demais (máx 5000)." };
  }
  if (requiredFields && requiredFields.length > 0) {
    const valid = rows.every((record) => requiredFields.every((campo) => campo in record));
    if (!valid) {
      return {
        ok: false,
        error:
          "O arquivo CSV está mal formatado. Verifique se todos os campos necessários estão presentes.",
      };
    }
  }
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value === "string" && !isSafeCell(value)) {
        return {
          ok: false,
          error: "CSV bloqueado: célula com fórmula ou conteúdo perigoso.",
        };
      }
    }
  }
  return { ok: true, rows };
}

/** Lê, valida e faz parse de um arquivo .csv de importação. */
export async function readAndParseCsvFile(
  file: CsvFileLike,
  requiredFields: string[]
): Promise<ParsedCsv> {
  const check = validateCsvFile(file);
  if (!check.ok) return { ok: false, error: check.error as string };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Não foi possível ler o arquivo." };
  }
  return parseCsvText(text, requiredFields);
}

/** Nome `base-DD-MM-YYYY_HH-mm.csv` (paridade com o mobile). */
export function buildExportFileName(base: string, now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${base}-${stamp}.csv`;
}

/** Exporta linhas para download .csv (guard para SSR/testes). */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (typeof document === "undefined") return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
