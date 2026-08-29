/**
 * SecureStore wrapper para chaves IA §1.3 ROADMAP
 * - hardware-backed via expo-secure-store, fallback in-memory para jest/node
 * - chaves por provider isoladas; legacy apiKey -> provider 'openai'
 */

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string, opts?: any) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let nativeStore: SecureStoreModule | null = null;
let nativeAvailable = false;

try {
  // lazy require to avoid crash in jest/node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-secure-store') as SecureStoreModule;
  if (mod && typeof mod.getItemAsync === 'function') {
    nativeStore = mod;
    nativeAvailable = true;
  }
} catch {
  nativeStore = null;
  nativeAvailable = false;
}

// In-memory fallback for jest + when native not available (e.g., web)
const memoryStore = new Map<string, string>();

// Key namespace to avoid collisions
const PREFIX = 'finances_secure_';

function namespaced(key: string): string {
  return `${PREFIX}${key}`;
}

export async function setSecureValue(key: string, value: string): Promise<void> {
  if (!key || typeof key !== 'string') throw new Error('key required');
  if (typeof value !== 'string') value = String(value);
  const k = namespaced(key);
  if (nativeAvailable && nativeStore) {
    try {
      await nativeStore.setItemAsync(k, value, {
        keychainService: 'finances',
        sharedPreferencesName: 'finances_prefs',
        encrypt: true,
      } as any);
      // also keep memory in sync for jest fallback reads if native fails
      memoryStore.set(k, value);
      return;
    } catch {
      // fallback to memory
    }
  }
  memoryStore.set(k, value);
}

export async function getSecureValue(key: string): Promise<string | null> {
  if (!key || typeof key !== 'string') return null;
  const k = namespaced(key);
  if (nativeAvailable && nativeStore) {
    try {
      const v = await nativeStore.getItemAsync(k);
      if (v !== null && v !== undefined) {
        memoryStore.set(k, v);
        return v;
      }
      // native returned null, check memory (e.g., set before native avail)
      if (memoryStore.has(k)) return memoryStore.get(k) ?? null;
      return null;
    } catch {
      // fall through to memory
    }
  }
  return memoryStore.has(k) ? memoryStore.get(k)! : null;
}

export async function deleteSecureValue(key: string): Promise<void> {
  if (!key || typeof key !== 'string') return;
  const k = namespaced(key);
  if (nativeAvailable && nativeStore) {
    try {
      await nativeStore.deleteItemAsync(k);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(k);
}

// Provider-specific helpers (IA multi-provider §1.4)
const PROVIDER_KEY_PREFIX = 'ai_provider_';
const LEGACY_OPENAI_KEY = 'apiKey'; // legacy config.apiKey migrated to openai

export function providerKeyName(provider: string): string {
  const p = (provider || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!p) throw new Error('provider required');
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
    await deleteProviderKey('openai');
    return;
  }
  await saveProviderKey('openai', apiKey);
}

export async function getApiKey(): Promise<string | null> {
  // Try provider openai first, then legacy key slot
  const v = await getProviderKey('openai');
  if (v) return v;
  const legacy = await getSecureValue(LEGACY_OPENAI_KEY);
  return legacy;
}

export async function deleteApiKey(): Promise<void> {
  await deleteProviderKey('openai');
  await deleteSecureValue(LEGACY_OPENAI_KEY);
}

// Utility for tests to reset memory
export async function _clearSecureMemory(): Promise<void> {
  memoryStore.clear();
  if (nativeAvailable && nativeStore) {
    // best-effort clear known keys (cannot enumerate native, so just memory clear)
  }
}

export const SECURE_KEYS = {
  provider: (p: string) => providerKeyName(p),
  legacyApiKey: LEGACY_OPENAI_KEY,
};
