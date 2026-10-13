/**
 * IA multi-provider — port de `app/src/utils/aiProviders.ts`.
 * 5 providers: openai, gemini, anthropic, openrouter, zen.
 * Persistência via lib/storage (localStorage + fallback memória).
 */
import { getProviderKey } from "./secureStore";
import { readRaw, removeRaw, writeRaw } from "../lib/storage";

// Provider definitions
export const PROVIDERS = ["openai", "gemini", "anthropic", "openrouter", "zen"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const PROVIDER_META: Record<
  ProviderId,
  { label: string; placeholder: string; docsUrl: string; keyPrefix: string }
> = {
  openai: { label: "OpenAI", placeholder: "sk-...", docsUrl: "https://platform.openai.com/account/api-keys", keyPrefix: "sk-" },
  gemini: { label: "Gemini (Google)", placeholder: "AIza...", docsUrl: "https://aistudio.google.com/app/apikey", keyPrefix: "AIza" },
  anthropic: { label: "Anthropic (Claude)", placeholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant" },
  openrouter: { label: "OpenRouter", placeholder: "sk-or-...", docsUrl: "https://openrouter.ai/keys", keyPrefix: "sk-or" },
  zen: { label: "Zen", placeholder: "zen-...", docsUrl: "https://zen.ai", keyPrefix: "zen" },
};

export const FALLBACK_MODELS: Record<ProviderId, string[]> = {
  openai: ["gpt-3.5-turbo", "gpt-4", "gpt-4o", "gpt-4o-mini"],
  gemini: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"],
  anthropic: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229"],
  openrouter: ["openai/gpt-3.5-turbo", "google/gemini-2.5-flash", "anthropic/claude-3-haiku"],
  zen: ["zen-v1", "zen-chat"],
};

// Modelos Gemini desligados pelo Google (1.0 + 1.5 + 2.0). Chamadas a eles retornam 404.
export const DEPRECATED_GEMINI_MODELS: ReadonlySet<string> = new Set([
  "gemini-pro",
  "gemini-1.0-pro",
  "gemini-1.0-pro-vision",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro",
  "gemini-1.5-pro-001",
  "gemini-1.5-pro-002",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

export function migrateGeminiModel(model: unknown): string {
  const fallback = FALLBACK_MODELS.gemini[0];
  if (!model || typeof model !== "string" || model.trim().length === 0) return fallback;
  const id = model.trim();
  if (DEPRECATED_GEMINI_MODELS.has(id)) return fallback;
  return id;
}

const STORAGE_KEYS = {
  ACTIVE_PROVIDER: "ai_activeProvider",
  FALLBACK_ORDER: "ai_fallbackOrder",
  MODEL_PREFIX: "ai_model_",
};

async function getStorageItem(key: string): Promise<string | null> {
  return readRaw(key);
}

async function setStorageItem(key: string, value: string): Promise<void> {
  writeRaw(key, value);
}

async function removeStorageItem(key: string): Promise<void> {
  removeRaw(key);
}

// Active provider helpers
export async function getActiveProvider(): Promise<ProviderId | null> {
  const v = await getStorageItem(STORAGE_KEYS.ACTIVE_PROVIDER);
  if (v && (PROVIDERS as readonly string[]).includes(v)) return v as ProviderId;
  return null;
}

export async function setActiveProvider(provider: ProviderId): Promise<void> {
  if (!(PROVIDERS as readonly string[]).includes(provider)) throw new Error("invalid provider");
  await setStorageItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
}

// Fallback order helpers
export async function getFallbackOrder(): Promise<ProviderId[]> {
  const v = await getStorageItem(STORAGE_KEYS.FALLBACK_ORDER);
  if (!v) return [];
  try {
    const arr = JSON.parse(v);
    if (Array.isArray(arr))
      return arr.filter((p: string) => (PROVIDERS as readonly string[]).includes(p)) as ProviderId[];
    return [];
  } catch {
    return [];
  }
}

export async function setFallbackOrder(order: ProviderId[]): Promise<void> {
  const filtered = order.filter((p) => (PROVIDERS as readonly string[]).includes(p));
  await setStorageItem(STORAGE_KEYS.FALLBACK_ORDER, JSON.stringify(filtered));
}

// Model per provider helpers
export async function getProviderModel(provider: ProviderId): Promise<string | null> {
  const k = `${STORAGE_KEYS.MODEL_PREFIX}${provider}`;
  const v = await getStorageItem(k);
  if (v === null) return null;
  // Self-heal: modelo Gemini desligado pelo Google migra para o default vivo
  if (provider === "gemini" && DEPRECATED_GEMINI_MODELS.has(v)) {
    const live = FALLBACK_MODELS.gemini[0];
    await setStorageItem(k, live);
    return live;
  }
  return v;
}

export async function saveProviderModel(provider: ProviderId, model: string): Promise<void> {
  if (!(PROVIDERS as readonly string[]).includes(provider)) throw new Error("invalid provider");
  const k = `${STORAGE_KEYS.MODEL_PREFIX}${provider}`;
  if (!model) {
    await removeStorageItem(k);
    return;
  }
  await setStorageItem(k, model);
}

export async function getAllProviderModels(): Promise<Record<string, string | null>> {
  const entries: Record<string, string | null> = {};
  for (const p of PROVIDERS) {
    entries[p] = await getProviderModel(p as ProviderId);
  }
  return entries;
}

/** Há ao menos um provider com chave? (gate da tela de chat) */
export async function checkIfApiKeyExists(): Promise<boolean> {
  for (const p of PROVIDERS) {
    const key = await getProviderKey(p);
    if (key) return true;
  }
  return false;
}

function maskKey(key: string | null): string {
  if (!key) return "não cadastrada";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export { maskKey };

// Fetch models via API key — MVP fetch strategy
export async function fetchModels(provider: ProviderId, apiKey: string): Promise<string[]> {
  const fallback = FALLBACK_MODELS[provider] ?? [];
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return fallback;
  }

  const fetchFn: typeof fetch | undefined = (globalThis as { fetch?: typeof fetch }).fetch?.bind(
    globalThis
  );
  if (!fetchFn) return fallback;

  try {
    if (provider === "openai") {
      const res = await fetchFn("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return fallback;
      const json = (await res.json()) as { data?: { id?: string }[] };
      const ids: string[] = (json.data ?? []).map((m) => m.id).filter((x): x is string => !!x);
      if (ids.length === 0) return fallback;
      const chatLike = ids.filter((id) => /gpt|o1|o3|chat|davinci|turbo/i.test(id));
      return chatLike.length > 0 ? chatLike : ids;
    }

    if (provider === "gemini") {
      const res = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        { headers: {} }
      );
      if (!res.ok) return fallback;
      const json = (await res.json()) as { models?: { name?: string }[] };
      const ids: string[] = (json.models ?? [])
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean);
      return ids.length ? ids : fallback;
    }

    if (provider === "anthropic") {
      const res = await fetchFn("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        } as unknown as Record<string, string>,
      });
      if (!res.ok) return fallback;
      const json = (await res.json()) as { data?: { id?: string; name?: string }[] };
      const ids: string[] = (json.data ?? [])
        .map((m) => m.id ?? m.name)
        .filter((x): x is string => !!x);
      return ids.length ? ids : fallback;
    }

    if (provider === "openrouter") {
      const res = await fetchFn("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return fallback;
      const json = (await res.json()) as { data?: { id?: string }[] };
      const ids: string[] = (json.data ?? []).map((m) => m.id).filter((x): x is string => !!x);
      return ids.length ? ids : fallback;
    }

    if (provider === "zen") {
      const res = await fetchFn("https://api.zen-ai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      } as RequestInit);
      if (!res.ok) return fallback;
      const json = (await res.json()) as { data?: { id?: string }[] };
      const ids: string[] = (json.data ?? []).map((m) => m.id).filter((x): x is string => !!x);
      return ids.length ? ids : fallback;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

// Call provider chat completion — returns assistant text
export async function callProvider(
  provider: ProviderId,
  opts: { apiKey: string; model: string; prompt: string }
): Promise<string> {
  const { apiKey, model, prompt } = opts;
  if (!apiKey) throw new Error("apiKey required");
  if (!model) throw new Error("model required");
  const fetchFn: typeof fetch | undefined = (globalThis as { fetch?: typeof fetch }).fetch?.bind(
    globalThis
  );
  if (!fetchFn) throw new Error("fetch not available");

  if (provider === "openai") {
    const res = await fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      const err = new Error(`openai ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string }; text?: string }[];
    };
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 1 },
      }),
    });
    if (!res.ok) {
      const err = new Error(`gemini ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("");
  }

  if (provider === "anthropic") {
    const res = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      } as unknown as Record<string, string>,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = new Error(`anthropic ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as { content?: { text?: string }[] };
    return (json.content ?? []).map((c) => c.text ?? "").join("");
  }

  if (provider === "openrouter") {
    const res = await fetchFn("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      const err = new Error(`openrouter ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "zen") {
    const res = await fetchFn("https://api.zen-ai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    } as RequestInit);
    if (!res.ok) {
      const err = new Error(`zen ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string }; text?: string }[];
    };
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";
  }

  throw new Error(`unknown provider ${provider}`);
}

// Fallback loop: tries active + fallback order sequentially
export async function chatWithFallback(
  prompt: string,
  opts?: { activeProvider?: ProviderId | null; fallbackOrder?: ProviderId[] }
): Promise<{ provider: ProviderId; model: string; text: string }> {
  const active = opts?.activeProvider ?? (await getActiveProvider());
  const fallback = opts?.fallbackOrder ?? (await getFallbackOrder());

  // Build ordered list: active first, then fallback filtered deduped
  const order: ProviderId[] = [];
  if (active && (PROVIDERS as readonly string[]).includes(active as string))
    order.push(active as ProviderId);
  for (const p of fallback) {
    if (!order.includes(p) && (PROVIDERS as readonly string[]).includes(p as string)) order.push(p);
  }
  // If still empty, try all providers that have a key (discover dynamically)
  if (order.length === 0) {
    for (const p of PROVIDERS) {
      const key = await getProviderKey(p);
      if (key) order.push(p as ProviderId);
    }
  }
  if (order.length === 0) throw new Error("Nenhum provider configurado");

  let lastError: unknown = null;
  for (const provider of order) {
    try {
      const apiKey = await getProviderKey(provider as string);
      if (!apiKey) {
        lastError = new Error(`sem chave para ${provider}`);
        continue;
      }
      const model =
        (await getProviderModel(provider as ProviderId)) ??
        FALLBACK_MODELS[provider as ProviderId]?.[0];
      if (!model) {
        lastError = new Error(`sem modelo para ${provider}`);
        continue;
      }
      const text = await callProvider(provider as ProviderId, { apiKey, model, prompt });
      return { provider: provider as ProviderId, model, text };
    } catch (e) {
      lastError = e;
      // continue to next fallback
    }
  }
  throw lastError ?? new Error("Todos providers falharam");
}

// Storage clear helper for tests
export async function _clearAiProvidersMemory(): Promise<void> {
  for (const k of [
    STORAGE_KEYS.ACTIVE_PROVIDER,
    STORAGE_KEYS.FALLBACK_ORDER,
    ...PROVIDERS.map((p) => `${STORAGE_KEYS.MODEL_PREFIX}${p}`),
  ]) {
    removeRaw(k);
  }
}

export const AI_STORAGE_KEYS = STORAGE_KEYS;
