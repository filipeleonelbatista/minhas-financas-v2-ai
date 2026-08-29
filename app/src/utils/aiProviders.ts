/**
 * IA multi-provider A+C — dynamic models via API key, active + fallback
 * 5 providers: openai, gemini, anthropic, openrouter, zen
 * Spec §3 IA + updated requirement dynamic models
 */

import { getProviderKey } from './secureStore';

// Provider definitions
export const PROVIDERS = ['openai', 'gemini', 'anthropic', 'openrouter', 'zen'] as const;
export type ProviderId = typeof PROVIDERS[number];

export const PROVIDER_META: Record<ProviderId, { label: string; placeholder: string; docsUrl: string; keyPrefix: string }> = {
  openai: { label: 'OpenAI', placeholder: 'sk-...', docsUrl: 'https://platform.openai.com/account/api-keys', keyPrefix: 'sk-' },
  gemini: { label: 'Gemini (Google)', placeholder: 'AIza...', docsUrl: 'https://aistudio.google.com/app/apikey', keyPrefix: 'AIza' },
  anthropic: { label: 'Anthropic (Claude)', placeholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys', keyPrefix: 'sk-ant' },
  openrouter: { label: 'OpenRouter', placeholder: 'sk-or-...', docsUrl: 'https://openrouter.ai/keys', keyPrefix: 'sk-or' },
  zen: { label: 'Zen', placeholder: 'zen-...', docsUrl: 'https://zen.ai', keyPrefix: 'zen' },
};

export const FALLBACK_MODELS: Record<ProviderId, string[]> = {
  openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  openrouter: ['openai/gpt-3.5-turbo', 'google/gemini-flash-1.5', 'anthropic/claude-3-haiku'],
  zen: ['zen-v1', 'zen-chat'],
};

// AsyncStorage wrapper with memory fallback for jest/node
let nativeStorage: any = null;
let nativeAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage');
  const candidate = mod.default ?? mod;
  if (candidate && typeof candidate.getItem === 'function') {
    nativeStorage = candidate;
    nativeAvailable = true;
  }
} catch {
  nativeStorage = null;
  nativeAvailable = false;
}

const mem = new Map<string, string>();
const STORAGE_KEYS = {
  ACTIVE_PROVIDER: 'ai_activeProvider',
  FALLBACK_ORDER: 'ai_fallbackOrder',
  MODEL_PREFIX: 'ai_model_',
};

async function getStorageItem(key: string): Promise<string | null> {
  if (nativeAvailable && nativeStorage) {
    try {
      const v = await nativeStorage.getItem(key);
      if (v !== null) {
        mem.set(key, v);
        return v;
      }
      if (mem.has(key)) return mem.get(key) ?? null;
      return null;
    } catch {
      // fallback to mem
    }
  }
  return mem.has(key) ? mem.get(key)! : null;
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (nativeAvailable && nativeStorage) {
    try {
      await nativeStorage.setItem(key, value);
      mem.set(key, value);
      return;
    } catch {
      // fallback
    }
  }
  mem.set(key, value);
}

async function removeStorageItem(key: string): Promise<void> {
  if (nativeAvailable && nativeStorage) {
    try { await nativeStorage.removeItem(key); } catch {}
  }
  mem.delete(key);
}

// Active provider helpers
export async function getActiveProvider(): Promise<ProviderId | null> {
  const v = await getStorageItem(STORAGE_KEYS.ACTIVE_PROVIDER);
  if (v && (PROVIDERS as readonly string[]).includes(v)) return v as ProviderId;
  return null;
}

export async function setActiveProvider(provider: ProviderId): Promise<void> {
  if (!(PROVIDERS as readonly string[]).includes(provider)) throw new Error('invalid provider');
  await setStorageItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
}

// Fallback order helpers
export async function getFallbackOrder(): Promise<ProviderId[]> {
  const v = await getStorageItem(STORAGE_KEYS.FALLBACK_ORDER);
  if (!v) return [];
  try {
    const arr = JSON.parse(v);
    if (Array.isArray(arr)) return arr.filter((p: string) => (PROVIDERS as readonly string[]).includes(p)) as ProviderId[];
    return [];
  } catch { return []; }
}

export async function setFallbackOrder(order: ProviderId[]): Promise<void> {
  const filtered = order.filter((p) => (PROVIDERS as readonly string[]).includes(p));
  await setStorageItem(STORAGE_KEYS.FALLBACK_ORDER, JSON.stringify(filtered));
}

// Model per provider helpers
export async function getProviderModel(provider: ProviderId): Promise<string | null> {
  const k = `${STORAGE_KEYS.MODEL_PREFIX}${provider}`;
  const v = await getStorageItem(k);
  return v;
}

export async function saveProviderModel(provider: ProviderId, model: string): Promise<void> {
  if (!(PROVIDERS as readonly string[]).includes(provider)) throw new Error('invalid provider');
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

// Fetch models via API key — MVP fetch strategy
export async function fetchModels(provider: ProviderId, apiKey: string): Promise<string[]> {
  const fallback = FALLBACK_MODELS[provider] ?? [];
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return fallback;
  }

  // Allow global fetch mock in tests
  const fetchFn: typeof fetch | undefined = (globalThis as any).fetch?.bind(globalThis);
  if (!fetchFn) return fallback;

  try {
    if (provider === 'openai') {
      const res = await fetchFn('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return fallback;
      const json: any = await res.json();
      const ids: string[] = (json.data ?? []).map((m: any) => m.id).filter(Boolean);
      if (ids.length === 0) return fallback;
      // Prefer chat models but keep all for dynamic selection
      // Filter to include gpt/o1 if many, else return all
      const chatLike = ids.filter((id) => /gpt|o1|o3|chat|davinci|turbo/i.test(id));
      return chatLike.length > 0 ? chatLike : ids;
    }

    if (provider === 'gemini') {
      // Gemini list models endpoint
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
        headers: {},
      });
      if (!res.ok) return fallback;
      const json: any = await res.json();
      const models = json.models ?? [];
      const ids: string[] = models.map((m: any) => {
        const name: string = m.name ?? '';
        // name is like "models/gemini-1.5-flash"
        return name.replace(/^models\//, '');
      }).filter(Boolean);
      return ids.length ? ids : fallback;
    }

    if (provider === 'anthropic') {
      // Anthropic models listing: https://api.anthropic.com/v1/models
      const res = await fetchFn('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        } as any,
      });
      if (!res.ok) return fallback;
      const json: any = await res.json();
      const ids: string[] = (json.data ?? []).map((m: any) => m.id ?? m.name).filter(Boolean);
      return ids.length ? ids : fallback;
    }

    if (provider === 'openrouter') {
      const res = await fetchFn('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return fallback;
      const json: any = await res.json();
      const ids: string[] = (json.data ?? []).map((m: any) => m.id).filter(Boolean);
      return ids.length ? ids : fallback;
    }

    if (provider === 'zen') {
      // Zen: treat as OpenAI-compatible if endpoint exists, else fallback
      const res = await fetchFn('https://api.zen-ai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      } as any);
      if (!res.ok) return fallback;
      const json: any = await res.json();
      const ids: string[] = (json.data ?? []).map((m: any) => m.id).filter(Boolean);
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
  if (!apiKey) throw new Error('apiKey required');
  if (!model) throw new Error('model required');
  const fetchFn: typeof fetch | undefined = (globalThis as any).fetch?.bind(globalThis);
  if (!fetchFn) throw new Error('fetch not available');

  if (provider === 'openai') {
    const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      const err: any = new Error(`openai ${res.status}`);
      err.status = res.status;
      try { err.data = await res.json(); } catch {}
      throw err;
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? '';
  }

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 1 },
      }),
    });
    if (!res.ok) {
      const err: any = new Error(`gemini ${res.status}`);
      err.status = res.status;
      try { err.data = await res.json(); } catch {}
      throw err;
    }
    const json: any = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return text;
  }

  if (provider === 'anthropic') {
    const res = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      } as any,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const err: any = new Error(`anthropic ${res.status}`);
      err.status = res.status;
      try { err.data = await res.json(); } catch {}
      throw err;
    }
    const json: any = await res.json();
    const text = json.content?.[0]?.text ?? json.content?.map((c: any) => c.text).join('') ?? '';
    return text;
  }

  if (provider === 'openrouter') {
    const res = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      const err: any = new Error(`openrouter ${res.status}`);
      err.status = res.status;
      try { err.data = await res.json(); } catch {}
      throw err;
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'zen') {
    const res = await fetchFn('https://api.zen-ai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
    } as any);
    if (!res.ok) {
      const err: any = new Error(`zen ${res.status}`);
      err.status = res.status;
      try { err.data = await res.json(); } catch {}
      throw err;
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? '';
  }

  throw new Error(`unknown provider ${provider}`);
}

// Fallback loop: tries active + fallback order sequentially
export async function chatWithFallback(
  prompt: string,
  opts?: { activeProvider?: ProviderId | null; fallbackOrder?: ProviderId[] }
): Promise<{ provider: ProviderId; model: string; text: string }> {
  let active = opts?.activeProvider ?? (await getActiveProvider());
  let fallback = opts?.fallbackOrder ?? (await getFallbackOrder());

  // Build ordered list: active first, then fallback filtered deduped
  const order: ProviderId[] = [];
  if (active && (PROVIDERS as readonly string[]).includes(active as string)) order.push(active as ProviderId);
  for (const p of fallback) {
    if (!order.includes(p) && (PROVIDERS as readonly string[]).includes(p as string)) order.push(p);
  }
  // If still empty, try all providers that have a key (discover dynamically)
  if (order.length === 0) {
    // fallback to trying providers in default order that have keys
    for (const p of PROVIDERS) {
      const key = await getProviderKey(p);
      if (key) order.push(p as ProviderId);
    }
  }
  if (order.length === 0) throw new Error('Nenhum provider configurado');

  let lastError: any = null;
  for (const provider of order) {
    try {
      const apiKey = await getProviderKey(provider as string);
      if (!apiKey) {
        lastError = new Error(`sem chave para ${provider}`);
        continue;
      }
      const model = (await getProviderModel(provider as ProviderId)) ?? FALLBACK_MODELS[provider as ProviderId]?.[0];
      if (!model) {
        lastError = new Error(`sem modelo para ${provider}`);
        continue;
      }
      const text = await callProvider(provider as ProviderId, { apiKey, model, prompt });
      return { provider: provider as ProviderId, model, text };
    } catch (e: any) {
      lastError = e;
      // continue to next fallback
    }
  }
  throw lastError ?? new Error('Todos providers falharam');
}

// Storage clear helper for tests
export async function _clearAiProvidersMemory(): Promise<void> {
  mem.clear();
  if (nativeAvailable && nativeStorage) {
    try {
      await nativeStorage.removeItem(STORAGE_KEYS.ACTIVE_PROVIDER);
      await nativeStorage.removeItem(STORAGE_KEYS.FALLBACK_ORDER);
      for (const p of PROVIDERS) {
        await nativeStorage.removeItem(`${STORAGE_KEYS.MODEL_PREFIX}${p}`);
      }
    } catch {}
  }
  // also clear fallback models map? no
}

export const AI_STORAGE_KEYS = STORAGE_KEYS;
