import {
  PROVIDERS,
  PROVIDER_META,
  FALLBACK_MODELS,
  fetchModels,
  getActiveProvider,
  setActiveProvider,
  getFallbackOrder,
  setFallbackOrder,
  getProviderModel,
  saveProviderModel,
  callProvider,
  chatWithFallback,
  _clearAiProvidersMemory,
} from '../../src/utils/aiProviders';
import { _clearSecureMemory, saveProviderKey, getProviderKey } from '../../src/utils/secureStore';
import Orb from '../../src/components/ui/Orb';
import React from 'react';
import { render } from '@testing-library/react-native';

// Mock AsyncStorage already memory fallback, no need extra
describe('AIProviders constants', () => {
  test('5 providers', () => {
    expect(PROVIDERS.length).toBe(5);
    expect(PROVIDERS).toEqual(expect.arrayContaining(['openai','gemini','anthropic','openrouter','zen']));
  });
  test('PROVIDER_META has label/placeholder', () => {
    for (const p of PROVIDERS) {
      expect(PROVIDER_META[p as any].label).toBeTruthy();
      expect(PROVIDER_META[p as any].placeholder).toBeTruthy();
    }
  });
  test('FALLBACK_MODELS non empty per provider', () => {
    for (const p of PROVIDERS) {
      expect(FALLBACK_MODELS[p as any].length).toBeGreaterThan(0);
    }
  });
});

describe('aiProviders storage - active, fallback, model', () => {
  beforeEach(async () => {
    await _clearAiProvidersMemory();
    await _clearSecureMemory();
  });

  test('active provider save/get', async () => {
    expect(await getActiveProvider()).toBeNull();
    await setActiveProvider('openai');
    expect(await getActiveProvider()).toBe('openai');
    await setActiveProvider('gemini');
    expect(await getActiveProvider()).toBe('gemini');
  });

  test('fallback order save/get with filtering', async () => {
    expect(await getFallbackOrder()).toEqual([]);
    await setFallbackOrder(['openai','gemini','anthropic'] as any);
    expect(await getFallbackOrder()).toEqual(['openai','gemini','anthropic']);
    // invalid filtered
    await setFallbackOrder(['openai','invalid','zen'] as any);
    expect(await getFallbackOrder()).toEqual(['openai','zen']);
  });

  test('provider model save/get', async () => {
    expect(await getProviderModel('openai')).toBeNull();
    await saveProviderModel('openai', 'gpt-4o');
    expect(await getProviderModel('openai')).toBe('gpt-4o');
    await saveProviderModel('openai', '');
    expect(await getProviderModel('openai')).toBeNull();
  });

  test('invalid provider throws', async () => {
    await expect(setActiveProvider('invalid' as any)).rejects.toThrow();
    await expect(saveProviderModel('invalid' as any,'x')).rejects.toThrow();
  });
});

describe('fetchModels dynamic via API key', () => {
  const origFetch = global.fetch;
  beforeEach(async () => {
    await _clearAiProvidersMemory();
    await _clearSecureMemory();
  });
  afterEach(() => { (global as any).fetch = origFetch; });

  test('openai fetch parses gpt ids', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{id:'gpt-3.5-turbo'},{id:'gpt-4o'},{id:'whisper-1'}]}),
    } as any);
    const models = await fetchModels('openai','sk-test');
    expect(models).toContain('gpt-3.5-turbo');
    expect(models).toContain('gpt-4o');
    expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk-test'})}));
  });

  test('openai fetch fallback on !ok', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok:false, status:401 } as any);
    const models = await fetchModels('openai','sk-bad');
    expect(models).toEqual(FALLBACK_MODELS.openai);
  });

  test('gemini fetch parses models/gemini-*', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ models: [{name:'models/gemini-1.5-flash'},{name:'models/gemini-pro'}]}),
    } as any);
    const models = await fetchModels('gemini','AIza123');
    expect(models).toEqual(['gemini-1.5-flash','gemini-pro']);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('generativelanguage.googleapis.com'), expect.anything());
  });

  test('anthropic fetch', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ data: [{id:'claude-3-haiku-20240307'}]}),
    } as any);
    const models = await fetchModels('anthropic','sk-ant-x');
    expect(models).toContain('claude-3-haiku-20240307');
  });

  test('openrouter fetch', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ data: [{id:'openai/gpt-3.5-turbo'}]}),
    } as any);
    const models = await fetchModels('openrouter','sk-or-x');
    expect(models).toContain('openai/gpt-3.5-turbo');
  });

  test('empty key returns fallback', async () => {
    const models = await fetchModels('openai','');
    expect(models).toEqual(FALLBACK_MODELS.openai);
  });

  test('fetch throws returns fallback', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network'));
    const models = await fetchModels('openai','sk-x');
    expect(models).toEqual(FALLBACK_MODELS.openai);
  });
});

describe('callProvider per provider', () => {
  const origFetch = global.fetch;
  afterEach(() => { (global as any).fetch = origFetch; });

  test('openai callProvider POST chat/completions', async () => {
    const mock = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ choices: [{message:{content:'hello openai'}}]}),
    } as any);
    (global as any).fetch = mock;
    const text = await callProvider('openai',{apiKey:'sk-x', model:'gpt-3.5-turbo', prompt:'hi'});
    expect(text).toBe('hello openai');
    expect(mock).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({ method:'POST'}));
    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-3.5-turbo');
    expect(body.messages[0].content).toBe('hi');
  });

  test('gemini callProvider', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ candidates:[{content:{parts:[{text:'hello gemini'}]}}]}),
    } as any);
    const text = await callProvider('gemini',{apiKey:'AIza', model:'gemini-1.5-flash', prompt:'hi'});
    expect(text).toBe('hello gemini');
  });

  test('anthropic callProvider', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ content:[{text:'hello claude'}]}),
    } as any);
    const text = await callProvider('anthropic',{apiKey:'sk-ant', model:'claude-3-haiku-20240307', prompt:'hi'});
    expect(text).toBe('hello claude');
  });

  test('openrouter callProvider', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok:true,
      json: async () => ({ choices:[{message:{content:'hello or'}}]}),
    } as any);
    const text = await callProvider('openrouter',{apiKey:'sk-or', model:'openai/gpt-3.5-turbo', prompt:'hi'});
    expect(text).toBe('hello or');
  });

  test('callProvider throws on !ok with status', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok:false, status:401, json: async()=>({error:'unauthorized'})} as any);
    await expect(callProvider('openai',{apiKey:'bad',model:'gpt-3.5-turbo',prompt:'hi'})).rejects.toThrow();
  });
});

describe('chatWithFallback loop', () => {
  const origFetch = global.fetch;
  beforeEach(async () => {
    await _clearAiProvidersMemory();
    await _clearSecureMemory();
  });
  afterEach(() => { (global as any).fetch = origFetch; });

  test('tries active then fallback on failure', async () => {
    await saveProviderKey('openai','sk-openai');
    await saveProviderKey('gemini','AIza-gemini');
    await saveProviderModel('openai','gpt-3.5-turbo');
    await saveProviderModel('gemini','gemini-1.5-flash');
    await setActiveProvider('openai');
    await setFallbackOrder(['gemini'] as any);

    // openai fails, gemini succeeds
    (global as any).fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok:false, status:500, json: async()=>({})} as any)) // openai chat
      .mockImplementationOnce(() => Promise.resolve({ ok:true, json: async()=>({ candidates:[{content:{parts:[{text:'from gemini'}]}}]})} as any)); // gemini

    const res = await chatWithFallback('hello');
    expect(res.provider).toBe('gemini');
    expect(res.text).toBe('from gemini');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
  });

  test('succeeds on first provider', async () => {
    await saveProviderKey('openai','sk-ok');
    await saveProviderModel('openai','gpt-3.5-turbo');
    await setActiveProvider('openai');
    (global as any).fetch = jest.fn().mockResolvedValue({ ok:true, json: async()=>({ choices:[{message:{content:'ok'}}]})} as any);
    const res = await chatWithFallback('hi');
    expect(res.provider).toBe('openai');
    expect(res.text).toBe('ok');
  });

  test('throws if no provider configured', async () => {
    await expect(chatWithFallback('hi')).rejects.toThrow('Nenhum provider configurado');
  });

  test('skips provider without key', async () => {
    await saveProviderKey('gemini','AIza-ok');
    await saveProviderModel('gemini','gemini-1.5-flash');
    await setActiveProvider('openai'); // openai has no key, should skip to fallback
    await setFallbackOrder(['gemini'] as any);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok:true, json: async()=>({ candidates:[{content:{parts:[{text:'fallback ok'}]}}]})} as any);
    const res = await chatWithFallback('hi');
    expect(res.provider).toBe('gemini');
  });
});

describe('Orb component wrapping reacticx', () => {
  test('renders fallback Orb when reacticx missing', () => {
    const { getByTestId, getByText } = render(<Orb size="lg" color="#9c44dc" testID="orb-test" />);
    expect(getByTestId('orb-test')).toBeTruthy();
    expect(getByText('IA')).toBeTruthy();
  });
  test('Orb size variants', () => {
    const { getByTestId: g1 } = render(<Orb size="sm" testID="orb-sm" />);
    expect(g1('orb-sm')).toBeTruthy();
    const { getByTestId: g2 } = render(<Orb size={64} testID="orb-num" />);
    expect(g2('orb-num')).toBeTruthy();
  });
});
