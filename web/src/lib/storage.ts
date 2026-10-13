/**
 * Storage local versionado — `mf-db-v1:*`.
 * localStorage primeiro (paridade com o legado web), fallback em memória
 * (SSR/testes node), IndexedDB via idb-keyval entra na Task 3.
 */

const PREFIX = "mf-db-v1";

export const STORAGE_KEYS = {
  finances: `${PREFIX}:finances`,
  runs: `${PREFIX}:runs`,
  goals: `${PREFIX}:goals`,
  stock: `${PREFIX}:stock`,
  lists: `${PREFIX}:lists`,
  items: `${PREFIX}:items`,
  config: `${PREFIX}:config`,
  tithePayments: `${PREFIX}:tithe_payments`,
} as const;

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

const memory = new Map<string, string>();

export function readRaw(key: string): string | null {
  if (hasLocalStorage()) {
    try {
      return localStorage.getItem(key);
    } catch {
      /* cai para memória */
    }
  }
  return memory.has(key) ? (memory.get(key) as string) : null;
}

export function writeRaw(key: string, value: string): void {
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      /* cai para memória */
    }
  }
  memory.set(key, value);
}

export function removeRaw(key: string): void {
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }
  memory.delete(key);
}

/** Nunca quebra: JSON corrompido volta o fallback. */
export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value));
  } catch {
    /* storage cheio/corrompido: mantém estado em memória da store */
  }
}

export function clearAllStorage(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeRaw(key);
}

/** Sync multi-aba via evento `storage` nativo (dispara nas outras abas). */
export function subscribeStorage(cb: () => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function newId(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fallback abaixo */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Blob store assíncrono (IndexedDB via idb-keyval, fallback memória/localStorage).
 * Para valores grandes; o get/set síncrono acima segue para o estado das stores.
 */
async function idbModule(): Promise<typeof import("idb-keyval") | null> {
  try {
    return await import("idb-keyval");
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<"idb" | "memory"> {
  const m = await idbModule();
  if (m) {
    try {
      await m.set(key, value);
      return "idb";
    } catch {
      /* cai para fallback */
    }
  }
  writeJSON(key, value);
  return "memory";
}

export async function idbGet<T>(key: string, fallback: T): Promise<T> {
  const m = await idbModule();
  if (m) {
    try {
      const v = await m.get<T>(key);
      return v === undefined ? fallback : (v as T);
    } catch {
      /* cai para fallback */
    }
  }
  return readJSON<T>(key, fallback);
}

export async function idbDel(key: string): Promise<void> {
  const m = await idbModule();
  if (m) {
    try {
      await m.del(key);
    } catch {
      /* ignora */
    }
  }
  removeRaw(key);
}
