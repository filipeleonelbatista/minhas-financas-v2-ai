import React, { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import Header from '../components/Header';
import { getProviderKey, saveProviderKey } from '../utils/secureStore';
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
} from '../utils/aiProviders';

export default function AIProviders() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [keys, setKeys] = useState({}); // provider -> key
  const [models, setModels] = useState({}); // provider -> string[]
  const [selectedModels, setSelectedModels] = useState({}); // provider -> string
  const [active, setActive] = useState(null);
  const [fallback, setFallback] = useState([]);
  const [loadingModels, setLoadingModels] = useState({}); // provider -> bool
  const [savingKey, setSavingKey] = useState({});

  const load = useCallback(async () => {
    const newKeys = {};
    const newModels = {};
    const newSelected = {};
    for (const p of PROVIDERS) {
      try { newKeys[p] = (await getProviderKey(p)) ?? ''; } catch { newKeys[p] = ''; }
      try { newSelected[p] = (await getProviderModel(p)) ?? FALLBACK_MODELS[p]?.[0] ?? ''; } catch { newSelected[p] = FALLBACK_MODELS[p]?.[0] ?? ''; }
      // init models with fallback until fetch
      newModels[p] = FALLBACK_MODELS[p] ?? [];
    }
    let act = null;
    let fb = [];
    try { act = await getActiveProvider(); } catch {}
    try { fb = await getFallbackOrder(); } catch {}
    setKeys(newKeys);
    setModels(newModels);
    setSelectedModels(newSelected);
    setActive(act);
    setFallback(fb ?? []);
    // auto-fetch models where key exists
    for (const p of PROVIDERS) {
      if (newKeys[p]) {
        handleFetchModels(p, newKeys[p], newSelected);
      }
    }
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const handleFetchModels = async (provider, apiKeyOverride, selectedOverride) => {
    const key = apiKeyOverride ?? keys[provider];
    if (!key) {
      setModels((prev) => ({ ...prev, [provider]: FALLBACK_MODELS[provider] ?? [] }));
      return;
    }
    setLoadingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const list = await fetchModels(provider, key);
      setModels((prev) => ({ ...prev, [provider]: list }));
      // if current selected not in list, pick first
      const curSel = (selectedOverride ?? selectedModels[provider]) ?? '';
      if (!list.includes(curSel) && list.length > 0) {
        const next = list[0];
        setSelectedModels((prev) => ({ ...prev, [provider]: next }));
        await saveProviderModel(provider, next);
      }
    } catch (e) {
      setModels((prev) => ({ ...prev, [provider]: FALLBACK_MODELS[provider] ?? [] }));
    } finally {
      setLoadingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider) => {
    const key = keys[provider]?.trim() ?? '';
    setSavingKey((prev) => ({ ...prev, [provider]: true }));
    try {
      await saveProviderKey(provider, key);
      if (key) {
        await handleFetchModels(provider, key);
        Alert.alert('Chave salva', `${PROVIDER_META[provider].label} chave salva com sucesso.`);
      } else {
        Alert.alert('Chave removida', `${PROVIDER_META[provider].label} chave removida.`);
      }
    } catch (e) {
      Alert.alert('Erro', String(e?.message ?? e));
    } finally {
      setSavingKey((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSelectModel = async (provider, model) => {
    setSelectedModels((prev) => ({ ...prev, [provider]: model }));
    try { await saveProviderModel(provider, model); } catch {}
  };

  const handleSetActive = async (provider) => {
    setActive(provider);
    try { await setActiveProvider(provider); } catch {}
  };

  const handleToggleFallback = async (provider) => {
    let next;
    if (fallback.includes(provider)) {
      next = fallback.filter((p) => p !== provider);
    } else {
      next = [...fallback, provider];
    }
    setFallback(next);
    try { await setFallbackOrder(next); } catch {}
  };

  const moveFallback = async (index, dir) => {
    const next = [...fallback];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setFallback(next);
    try { await setFallbackOrder(next); } catch {}
  };

  const FallbackCard = () => (
    <View className="bg-white rounded-2xl p-4 mx-4 mt-4" style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 16, elevation: 2 }}>
      <Text className="font-bold text-gray-700" style={{ fontWeight: '700', color: '#374151', fontSize: 16, marginBottom: 8 }}>
        Ordem de fallback
      </Text>
      <Text className="text-xs text-gray-500 mb-3" style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        Se o provider ativo falhar, tentará na ordem abaixo.
      </Text>
      {fallback.length === 0 ? (
        <Text testID="fallback-empty" style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Nenhum fallback selecionado — marque providers abaixo</Text>
      ) : (
        <View testID="fallback-list">
          {fallback.map((p, idx) => (
            <View key={p} testID={`fallback-item-${p}`} className="flex-row items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-2" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#581C87', marginRight: 8 }}>{idx + 1}.</Text>
                <Text style={{ fontWeight: '600', color: '#374151' }}>{PROVIDER_META[p]?.label ?? p}</Text>
                {active === p && <Text style={{ marginLeft: 6, fontSize: 10, color: '#9c44dc', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>ativo</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity testID={`fallback-up-${p}`} onPress={() => moveFallback(idx, -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                  <Feather name="chevron-up" size={18} color="#581C87" />
                </TouchableOpacity>
                <TouchableOpacity testID={`fallback-down-${p}`} onPress={() => moveFallback(idx, 1)} disabled={idx === fallback.length - 1} style={{ padding: 6, opacity: idx === fallback.length - 1 ? 0.3 : 1 }}>
                  <Feather name="chevron-down" size={18} color="#581C87" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {PROVIDERS.filter((p) => p !== active).map((p) => (
          <TouchableOpacity
            key={`toggle-${p}`}
            testID={`toggle-fallback-${p}`}
            onPress={() => handleToggleFallback(p)}
            style={{
              borderWidth: 1,
              borderColor: fallback.includes(p) ? '#9c44dc' : '#e5e7eb',
              backgroundColor: fallback.includes(p) ? '#f3e8ff' : 'white',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Feather name={fallback.includes(p) ? 'check' : 'plus'} size={14} color={fallback.includes(p) ? '#581C87' : '#6b7280'} />
            <Text style={{ marginLeft: 6, fontSize: 13, color: fallback.includes(p) ? '#581C87' : '#374151' }}>{PROVIDER_META[p].label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }} className="flex-1 bg-warmGray-50">
      <Header
        title="Provedores IA"
        isLeft
        isLeftIconComponent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 999 }} testID="back-button">
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 -mt-6" style={{ paddingHorizontal: 16, marginTop: -16 }}>
          <View style={{ backgroundColor: '#581C87', borderRadius: 16, padding: 16, marginBottom: 8 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>IA multi-provider</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
              5 provedores — escolha 1 ativo + fallback. Chaves ficam em SecureStore. Modelos são buscados via API quando a chave é inserida.
            </Text>
          </View>
        </View>

        <FallbackCard />

        {PROVIDERS.map((provider) => {
          const meta = PROVIDER_META[provider];
          const isActive = active === provider;
          const isFallback = fallback.includes(provider);
          const modelList = models[provider] ?? FALLBACK_MODELS[provider] ?? [];
          const selected = selectedModels[provider] ?? modelList[0] ?? '';
          const hasKey = !!(keys[provider] && keys[provider].length > 0);
          return (
            <View
              key={provider}
              testID={`provider-card-${provider}`}
              className="bg-white rounded-2xl p-4 mx-4 mt-4"
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                marginHorizontal: 16,
                marginTop: 16,
                elevation: 2,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? '#9c44dc' : '#f3f4f6',
                shadowColor: isActive ? '#581C87' : 'transparent',
                shadowOpacity: isActive ? 0.12 : 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isActive ? '#9c44dc' : '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name={hasKey ? 'key' : 'lock'} size={18} color={isActive ? 'white' : '#6b7280'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text testID={`provider-label-${provider}`} style={{ fontWeight: '700', color: '#1f2937', fontSize: 16 }}>{meta.label}</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }} numberOfLines={1}>{provider} • {isActive ? 'Ativo' : isFallback ? `Fallback #${fallback.indexOf(provider)+1}` : 'Inativo'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  testID={`radio-active-${provider}`}
                  onPress={() => handleSetActive(provider)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isActive ? '#9c44dc' : '#d1d5db',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isActive ? '#9c44dc' : 'white',
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  {isActive && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' }} />}
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' }}>Chave API</Text>
              <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="key" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  {/* Inner TextInput */}
                  {React.createElement(require('react-native').TextInput, {
                    testID: `input-key-${provider}`,
                    placeholder: meta.placeholder,
                    placeholderTextColor: '#9ca3af',
                    value: keys[provider] ?? '',
                    onChangeText: (t) => setKeys((prev) => ({ ...prev, [provider]: t })),
                    secureTextEntry: false,
                    autoCapitalize: 'none',
                    autoCorrect: false,
                    style: { paddingVertical: 10, fontSize: 13, color: '#111827' },
                  })}
                </View>
                <TouchableOpacity
                  testID={`btn-save-key-${provider}`}
                  onPress={() => handleSaveKey(provider)}
                  disabled={!!savingKey[provider]}
                  style={{ backgroundColor: '#9c44dc', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 8 }}
                >
                  {savingKey[provider] ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Salvar</Text>}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Modelo</Text>
                <TouchableOpacity testID={`btn-refresh-models-${provider}`} onPress={() => handleFetchModels(provider)} disabled={!hasKey || !!loadingModels[provider]} style={{ flexDirection: 'row', alignItems: 'center', padding: 4, opacity: !hasKey ? 0.4 : 1 }}>
                  {loadingModels[provider] ? <ActivityIndicator size="small" color="#9c44dc" /> : <Feather name="refresh-cw" size={14} color="#9c44dc" />}
                  <Text style={{ marginLeft: 4, fontSize: 12, color: '#9c44dc', fontWeight: '600' }}>Atualizar</Text>
                </TouchableOpacity>
              </View>

              <View testID={`picker-wrap-${provider}`} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: 'white', overflow: 'hidden' }}>
                <Picker
                  testID={`picker-model-${provider}`}
                  selectedValue={selected}
                  onValueChange={(v) => handleSelectModel(provider, v)}
                  style={{ height: 48 }}
                  enabled={modelList.length > 0}
                >
                  {modelList.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {hasKey ? `${modelList.length} modelos disponíveis` : 'Insira a chave e salve para buscar modelos'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  testID={`btn-set-active-${provider}`}
                  onPress={() => handleSetActive(provider)}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? '#581C87' : 'white',
                    borderWidth: 1,
                    borderColor: isActive ? '#581C87' : '#e5e7eb',
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="star" size={16} color={isActive ? 'white' : '#6b7280'} />
                  <Text style={{ marginLeft: 6, color: isActive ? 'white' : '#374151', fontWeight: '700', fontSize: 13 }}>{isActive ? 'Ativo' : 'Ativar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`btn-toggle-fallback-${provider}`}
                  onPress={() => handleToggleFallback(provider)}
                  style={{
                    flex: 1,
                    backgroundColor: isFallback ? '#f3e8ff' : 'white',
                    borderWidth: 1,
                    borderColor: isFallback ? '#9c44dc' : '#e5e7eb',
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name={isFallback ? 'check-circle' : 'plus-circle'} size={16} color={isFallback ? '#9c44dc' : '#6b7280'} />
                  <Text style={{ marginLeft: 6, color: isFallback ? '#581C87' : '#374151', fontWeight: '700', fontSize: 13 }}>{isFallback ? 'No fallback' : 'Add fallback'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
