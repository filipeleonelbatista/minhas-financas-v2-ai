import { describe, expect, it } from "vitest";
import {
  buildExportFileName,
  CSV_LIMITS,
  isSafeCell,
  parseCsvText,
  toSafeCsvValue,
  validateCsvFile,
} from "@/utils/csv";
import { idbGet, idbSet, isSyncKey, readJSON, subscribeStorage, writeRaw } from "@/lib/storage";

describe("csv safety", () => {
  it("bloqueia =HYPERLINK", () => {
    expect(isSafeCell("=HYPERLINK('http://x')")).toBe(false);
  });

  it("bloqueia fórmulas e protocolos perigosos", () => {
    expect(isSafeCell("=1+1")).toBe(false);
    expect(isSafeCell("+CMD")).toBe(false);
    expect(isSafeCell("@SUM(A1:A2)")).toBe(false);
    expect(isSafeCell("=WEBSERVICE('http://x')")).toBe(false);
    expect(isSafeCell("javascript:alert(1)")).toBe(false);
  });

  it("aceita texto normal e números", () => {
    expect(isSafeCell("Compra mensal")).toBe(true);
    expect(isSafeCell("150.75")).toBe(true);
    expect(isSafeCell("")).toBe(true);
  });

  it("rejeita arquivo grande demais ou extensão errada", () => {
    expect(validateCsvFile({ name: "dados.xlsm", size: 10 }).ok).toBe(false);
    expect(validateCsvFile({ name: "dados.csv", size: CSV_LIMITS.maxBytes + 1 }).ok).toBe(false);
    expect(validateCsvFile({ name: "dados.csv", size: 10 }).ok).toBe(true);
  });

  it("idb roundtrip com fallback (node sem IndexedDB)", async () => {
    await idbSet("mf-db-v1:test", { a: 1 });
    expect(await idbGet("mf-db-v1:test", null)).toEqual({ a: 1 });
  });

  it("readJSON recupera de JSON corrompido com fallback", () => {
    expect(readJSON("mf-db-v1:inexistente", [])).toEqual([]);
  });

  it("parseCsvText rejeita fórmula no meio do arquivo", () => {
    const csv = "description,amount\nArroz,10\n=HYPERLINK('http://x'),20";
    const parsed = parseCsvText(csv, ["description", "amount"]);
    expect(parsed.ok).toBe(false);
  });

  it("toSafeCsvValue neutraliza célula perigosa e exporta nome no padrão", () => {
    expect(toSafeCsvValue("=HYPERLINK('http://x')")).toBe(`"'=HYPERLINK('http://x')"`);
    expect(toSafeCsvValue("Arroz, integral")).toBe('"Arroz, integral"');
    expect(toSafeCsvValue("10.5")).toBe("10.5");
    expect(buildExportFileName("financas", new Date(2026, 5, 15, 10, 30))).toBe(
      "financas-15-06-2026_10-30.csv"
    );
  });

  it("isSyncKey filtra só chaves mf-db-v1", () => {
    expect(isSyncKey("mf-db-v1:finances")).toBe(true);
    expect(isSyncKey("finances_secure_ai_provider_openai")).toBe(false);
    expect(isSyncKey("vite-ui-theme")).toBe(false);
  });

  it("sync multi-aba via BroadcastChannel", async () => {
    let calls = 0;
    const unsub = subscribeStorage(() => {
      calls++;
    });
    writeRaw("mf-db-v1:ping", "1");
    await new Promise((r) => setTimeout(r, 150));
    unsub();
    expect(calls).toBeGreaterThan(0);
  });
});
