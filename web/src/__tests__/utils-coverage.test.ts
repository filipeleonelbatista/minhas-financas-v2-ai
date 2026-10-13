import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sanitizeAmount,
  sanitizeCategory,
  sanitizeCellString,
  sanitizeDescription,
  sanitizeFileName,
  sanitizeLocation,
} from "@/utils/sanitize";
import {
  getExtension,
  isAllowedImportFile,
  isBlockedSpreadsheet,
} from "@/utils/excel";
import {
  deleteApiKey,
  deleteProviderKey,
  getApiKey,
  providerKeyName,
  saveApiKey,
  saveProviderKey,
  _clearSecureMemory,
} from "@/utils/secureStore";
import {
  FALLBACK_MODELS,
  callProvider,
  fetchModels,
  getAllProviderModels,
  getFallbackOrder,
  getProviderModel,
  maskKey,
  migrateGeminiModel,
  saveProviderModel,
  setFallbackOrder,
  _clearAiProvidersMemory,
} from "@/utils/aiProviders";

beforeEach(async () => {
  await _clearSecureMemory();
  await _clearAiProvidersMemory();
  vi.unstubAllGlobals();
});

describe("sanitize bordas", () => {
  it("description: tags, protocolos e limite", () => {
    expect(sanitizeDescription('<script>alert(1)</script> Oi')).toBe('alert(1) Oi');
    expect(sanitizeDescription('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitizeDescription(null)).toBe('');
    expect(sanitizeDescription(123)).toBe('123');
    expect(sanitizeDescription('a'.repeat(200)).length).toBe(80);
    expect(sanitizeDescription('a onclick=evil b')).toBe('a evil b');
  });

  it("amount: BR, negativo, NaN e teto", () => {
    expect(sanitizeAmount('R$ 1.000,50')).toBe(1000.5);
    expect(sanitizeAmount(-5)).toBe(0);
    expect(sanitizeAmount('abc')).toBe(0);
    expect(sanitizeAmount(999999999)).toBe(99999999.99);
    expect(sanitizeAmount(10.555)).toBe(10.56);
  });

  it("location/category/cell/filename", () => {
    expect(sanitizeLocation('  Posto <b>X</b>  ')).toBe('Posto X');
    expect(sanitizeLocation(123)).toBe('');
    expect(sanitizeCategory('Mercearia', ['Mercearia'])).toBe('Mercearia');
    expect(sanitizeCategory('X', ['Mercearia'])).toBe('Outros');
    expect(sanitizeCellString('<i>y</i>')).toBe('y');
    expect(sanitizeFileName('finanças/10:30?.csv')).toBe('finanas1030.csv');
    expect(sanitizeFileName(123 as unknown as string)).toBe('file');
  });
});

describe("excel guards", () => {
  it("extensões", () => {
    expect(getExtension('A.CSV')).toBe('.csv');
    expect(getExtension('sem-ext')).toBe('');
    expect(isAllowedImportFile('dados.csv')).toBe(true);
    expect(isAllowedImportFile('dados.xlsm')).toBe(false);
    expect(isBlockedSpreadsheet('a.xlsm')).toBe(true);
    expect(isBlockedSpreadsheet('a.csv')).toBe(false);
  });
});

describe("secureStore chaves", () => {
  it("providerKeyName valida", () => {
    expect(providerKeyName('OpenAI ')).toBe('ai_provider_openai');
    expect(() => providerKeyName('')).toThrow();
  });

  it("save/get/delete + legacy apiKey", async () => {
    await saveProviderKey('openai', 'sk-1');
    const { getProviderKey } = await import('@/utils/secureStore');
    expect(await getProviderKey('openai')).toBe('sk-1');
    await saveProviderKey('openai', '');
    expect(await getProviderKey('openai')).toBeNull();
    await expect(
      (await import('@/utils/secureStore')).setSecureValue('', 'x')
    ).rejects.toThrow();
    expect(await (await import('@/utils/secureStore')).getSecureValue('')).toBeNull();

    await saveApiKey('sk-leg');
    expect(await getApiKey()).toBe('sk-leg');
    await deleteApiKey();
    expect(await getApiKey()).toBeNull();
    await deleteProviderKey('gemini');
  });
});

describe("aiProviders ramos", () => {
  it("helpers puros", () => {
    expect(migrateGeminiModel('gemini-1.5-flash')).toBe(FALLBACK_MODELS.gemini[0]);
    expect(migrateGeminiModel('')).toBe(FALLBACK_MODELS.gemini[0]);
    expect(migrateGeminiModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(maskKey(null)).toBe('não cadastrada');
    expect(maskKey('abc')).toBe('••••');
    expect(maskKey('sk-1234567890')).toBe('sk-1••••7890');
  });

  it("fallback order filtra inválidos; model vazio remove", async () => {
    const { setActiveProvider } = await import('@/utils/aiProviders');
    await expect(setActiveProvider('x' as never)).rejects.toThrow();
    await expect(saveProviderModel('x' as never, 'm')).rejects.toThrow();
    await setFallbackOrder(['openai', 'x' as never, 'gemini']);
    expect(await getFallbackOrder()).toEqual(['openai', 'gemini']);
    await saveProviderModel('openai', '');
    expect(await getProviderModel('openai')).toBeNull();
    expect(await getAllProviderModels()).toMatchObject({ openai: null });
  });

  it("fetchModels: sem chave, sem fetch e http !ok → fallback", async () => {
    expect(await fetchModels('openai', '')).toEqual(FALLBACK_MODELS.openai);
    vi.stubGlobal('fetch', undefined);
    expect(await fetchModels('openai', 'sk-x')).toEqual(FALLBACK_MODELS.openai);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );
    expect(await fetchModels('gemini', 'k')).toEqual(FALLBACK_MODELS.gemini);
    expect(await fetchModels('anthropic', 'k')).toEqual(FALLBACK_MODELS.anthropic);
    expect(await fetchModels('openrouter', 'k')).toEqual(FALLBACK_MODELS.openrouter);
    expect(await fetchModels('zen', 'k')).toEqual(FALLBACK_MODELS.zen);
  });

  it("fetchModels: parse por provider", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('openai.com/v1/models')) {
          return { ok: true, json: async () => ({ data: [{ id: 'gpt-3.5-turbo' }, { id: 'babbage' }] }) };
        }
        if (String(url).includes('generativelanguage')) {
          return { ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash' }] }) };
        }
        if (String(url).includes('anthropic')) {
          return { ok: true, json: async () => ({ data: [{ id: 'claude-3-haiku-20240307' }] }) };
        }
        if (String(url).includes('openrouter')) {
          return { ok: true, json: async () => ({ data: [] }) };
        }
        return { ok: true, json: async () => ({ data: [{ id: 'zen-v1' }] }) };
      })
    );
    expect(await fetchModels('openai', 'k')).toEqual(['gpt-3.5-turbo']);
    expect(await fetchModels('gemini', 'k')).toEqual(['gemini-2.5-flash']);
    expect(await fetchModels('anthropic', 'k')).toEqual(['claude-3-haiku-20240307']);
    expect(await fetchModels('openrouter', 'k')).toEqual(FALLBACK_MODELS.openrouter);
    expect(await fetchModels('zen', 'k')).toEqual(['zen-v1']);
  });

  it("callProvider: validações e erros http", async () => {
    await expect(callProvider('openai', { apiKey: '', model: 'm', prompt: 'p' })).rejects.toThrow(
      'apiKey required'
    );
    await expect(callProvider('openai', { apiKey: 'k', model: '', prompt: 'p' })).rejects.toThrow(
      'model required'
    );
    vi.stubGlobal('fetch', undefined);
    await expect(callProvider('openai', { apiKey: 'k', model: 'm', prompt: 'p' })).rejects.toThrow(
      'fetch not available'
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );
    await expect(callProvider('zen', { apiKey: 'k', model: 'm', prompt: 'p' })).rejects.toThrow(
      'zen 500'
    );
    await expect(callProvider('x' as never, { apiKey: 'k', model: 'm', prompt: 'p' })).rejects.toThrow(
      'unknown provider'
    );
  });
});
