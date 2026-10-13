/**
 * Guards de planilha — port das regras de `app/src/utils/excel.ts`.
 * Web hoje importa só .csv; .xlsx entra quando houver dep de parse (fora do escopo Task 3).
 */

export const ALLOWED_IMPORT_EXTENSIONS = [".csv"] as const;
export const BLOCKED_SPREADSHEET_EXTENSIONS = [".xls", ".xlsm", ".xlsb", ".ods", ".zip"] as const;

export function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/** Extensão liberada para importação no web. */
export function isAllowedImportFile(name: string): boolean {
  return (ALLOWED_IMPORT_EXTENSIONS as readonly string[]).includes(getExtension(name));
}

/** Extensão de planilha bloqueada (risco de macro/fórmula). */
export function isBlockedSpreadsheet(name: string): boolean {
  return (BLOCKED_SPREADSHEET_EXTENSIONS as readonly string[]).includes(getExtension(name));
}
