import { describe, expect, it } from "vitest";
import { CSV_LIMITS, isSafeCell, validateCsvFile } from "@/utils/csv";
import { idbGet, idbSet } from "@/lib/storage";

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
});
