/**
 * Chaves IA — port de `app/src/utils/secureStore.ts`.
 * Web não tem SecureStore: persiste em localStorage (prefixo isolado) com
 * fallback em memória. Chaves nunca vão para o código; aviso exibido na tela.
 */
import { readRaw, removeRaw, writeRaw } from "../lib/storage";

// Key namespace to avoid collisions (mesmo do mobile)
const PREFIX = "finances_secure_";

function namespaced(key: string): string {
  return `${PREFIX}${key}`;
}

// rastreia chaves escritas p/ limpeza em testes
const writtenKeys = new Set<string>();

export async function setSecureValue(key: string, value: string): Promise<void> {
  if (!key || typeof key !== "string") throw new Error("key required");
  if (typeof value !== "string") value = String(value);
  const k = namespaced(key);
  writeRaw(k, value);
  writtenKeys.add(k);
}

export async function getSecureValue(key: string): Promise<string | null> {
  if (!key || typeof key !== "string") return null;
  return readRaw(namespaced(key));
}

export async function deleteSecureValue(key: string): Promise<void> {
  if (!key || typeof key !== "string") return;
  const k = namespaced(key);
  removeRaw(k);
  writtenKeys.delete(k);
}

// Provider-specific helpers (IA multi-provider)
const PROVIDER_KEY_PREFIX = "ai_provider_";
const LEGACY_OPENAI_KEY = "apiKey"; // legacy config.apiKey migrated to openai

export function providerKeyName(provider: string): string {
  const p = (provider || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!p) throw new Error("provider required");
  return `${PROVIDER_KEY_PREFIX}${p}`;
}

export async function saveProviderKey(provider: string, apiKey: string): Promise<void> {
  const k = providerKeyName(provider);
  if (!apiKey) {
    await deleteSecureValue(k);
    return;
  }
  await setSecureValue(k, apiKey);
}

export async function getProviderKey(provider: string): Promise<string | null> {
  const k = providerKeyName(provider);
  return getSecureValue(k);
}

export async function deleteProviderKey(provider: string): Promise<void> {
  const k = providerKeyName(provider);
  await deleteSecureValue(k);
}

// Legacy helpers for single openai key (compat with isAiEnabled flow)
export async function saveApiKey(apiKey: string): Promise<void> {
  if (!apiKey) {
    await deleteProviderKey("openai");
    return;
  }
  await saveProviderKey("openai", apiKey);
}

export async function getApiKey(): Promise<string | null> {
  // Try provider openai first, then legacy key slot
  const v = await getProviderKey("openai");
  if (v) return v;
  const legacy = await getSecureValue(LEGACY_OPENAI_KEY);
  return legacy;
}

export async function deleteApiKey(): Promise<void> {
  await deleteProviderKey("openai");
  await deleteSecureValue(LEGACY_OPENAI_KEY);
}

// Utility for tests to reset memory
export async function _clearSecureMemory(): Promise<void> {
  for (const k of [...writtenKeys]) removeRaw(k);
  writtenKeys.clear();
}

export const SECURE_KEYS = {
  provider: (p: string) => providerKeyName(p),
  legacyApiKey: LEGACY_OPENAI_KEY,
};
