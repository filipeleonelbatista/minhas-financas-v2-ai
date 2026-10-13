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

/** Sync multi-aba: só chaves de dados disparam reload (não chaves de IA/tema). */
export function isSyncKey(key: string | null): boolean {
  return typeof key === "string" && key.startsWith(PREFIX + ":");
}

const BC_NAME = "mf-sync";

function openBroadcast(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel === "undefined") return null;
    return new BroadcastChannel(BC_NAME);
  } catch {
    return null;
  }
}

function postSync(key: string): void {
  const ch = openBroadcast();
  if (!ch) return;
  try {
    ch.postMessage(key);
  } catch {
    /* sem broadcast */
  } finally {
    try {
      ch.close();
    } catch {
      /* ignora */
    }
  }
}
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
      postSync(key);
      return;
    } catch {
      /* cai para memória */
    }
  }
  memory.set(key, value);
  postSync(key);
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
  postSync(key);
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

/**
 * Sync multi-aba: evento `storage` nativo (filtrado por chave de dados) +
 * `BroadcastChannel('mf-sync')`. Chaves de IA/tema não disparam reload.
 */
export function subscribeStorage(cb: () => void): () => void {
  const cleanups: (() => void)[] = [];
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    const handler = (e: StorageEvent) => {
      if (e.key !== null && !isSyncKey(e.key)) return;
      cb();
    };
    window.addEventListener("storage", handler);
    cleanups.push(() => window.removeEventListener("storage", handler));
  }
  const ch = openBroadcast();
  if (ch) {
    ch.onmessage = (e: MessageEvent) => {
      if (typeof e.data === "string" && !isSyncKey(e.data)) return;
      cb();
    };
    cleanups.push(() => {
      try {
        ch.close();
      } catch {
        /* ignora */
      }
    });
  }
  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* ignora */
      }
    }
  };
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
