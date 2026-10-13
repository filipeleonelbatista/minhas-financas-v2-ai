import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ReloadPrompt } from "@/components/ReloadPrompt";

const config = readFileSync("vite.config.ts", "utf8");
const html = readFileSync("index.html", "utf8");

describe("pwa total instalável", () => {
  it("workbox completo com offline fallback", () => {
    for (const key of [
      "registerType",
      "cleanupOutdatedCaches",
      "navigateFallback",
      "runtimeCaching",
    ]) {
      expect(config).toContain(key);
    }
    // prompt de verdade: sem ativação imediata (skipWaiting/clientsClaim)
    expect(config).not.toContain("skipWaiting");
    expect(config).not.toContain("clientsClaim");
  });

  it("manifest instalável pt-BR com maskable e shortcuts", () => {
    for (const key of [
      "192x192",
      "512x512",
      "maskable",
      "shortcuts",
      "pt-BR",
    ]) {
      expect(config).toContain(key);
    }
  });

  it("index.html em pt-BR com meta mobile", () => {
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("mobile-web-app-capable");
  });

  it("ReloadPrompt exporta componente", () => {
    expect(typeof ReloadPrompt).toBe("function");
  });
});
