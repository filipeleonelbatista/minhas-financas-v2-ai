import React, { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import Header from '../components/Header';
import { getProviderKey, saveProviderKey, deleteProviderKey } from '../utils/secureStore';
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

  const [keys, setKeys] = useState({});
  const [models, setModels] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const [active, setActive] = useState(null);
  const [fallback, setFallback] = useState([]);

  // modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProvider, setModalProvider] = useState(PROVIDERS[0]);
  const [modalKey, setModalKey] = useState('');
  const [modalModels, setModalModels] = useState([]);
  const [modalSelectedModel, setModalSelectedModel] = useState('');
  const [modalLoadingModels, setModalLoadingModels] = useState(false);

  const load = useCallback(async () => {
    const newKeys = {};
    const newModels = {};
    const newSelected = {};
    for (const p of PROVIDERS) {
      try { newKeys[p] = (await getProviderKey(p)) ?? ''; } catch { newKeys[p] = ''; }
      try { newSelected[p] = (await getProviderModel(p)) ?? FALLBACK_MODELS[p]?.[0] ?? ''; } catch { newSelected[p] = FALLBACK_MODELS[p]?.[0] ?? ''; }
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
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const registeredProviders = PROVIDERS.filter((p) => keys[p] && keys[p].length > 0);

  const handleSearchModelsModal = async () => {
    const key = modalKey.trim();
    if (!key) return;
    setModalLoadingModels(true);
    try {
      const list = await fetchModels(modalProvider, key);
      setModalModels(list);
      if (list.length > 0) setModalSelectedModel(list[0]);
      else setModalSelectedModel('');
    } catch {
      setModalModels(FALLBACK_MODELS[modalProvider] ?? []);
      const fb = FALLBACK_MODELS[modalProvider] ?? [];
      if (fb.length > 0) setModalSelectedModel(fb[0]);
    } finally {
      setModalLoadingModels(false);
    }
  };

  const handleSaveProvider = async () => {
    const key = modalKey.trim();
    if (!key || !modalSelectedModel) {
      Alert.alert('Erro', 'Preencha a chave e selecione um modelo');
      return;
    }
    try {
      await saveProviderKey(modalProvider, key);
      await saveProviderModel(modalProvider, modalSelectedModel);
      // if no active yet, set this as active
      if (!active) {
        await setActiveProvider(modalProvider);
        setActive(modalProvider);
      }
      setModalVisible(false);
      setModalKey('');
      setModalModels([]);
      setModalSelectedModel('');
      await load();
      Alert.alert('Sucesso', `${PROVIDER_META[modalProvider].label} salvo`);
      // volta para tela de configurações dos provedores (já está nela, apenas fecha modal)
    } catch (e) {
      Alert.alert('Erro', String(e?.message ?? e));
    }
  };

  const handleDeleteProvider = async (provider) => {
    Alert.alert('Remover provedor', `Remover ${PROVIDER_META[provider].label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProviderKey(provider);
            await saveProviderModel(provider, '');
            // remove from fallback
            const nextFb = fallback.filter((p) => p !== provider);
            setFallback(nextFb);
            await setFallbackOrder(nextFb);
            if (active === provider) {
              const nextActive = registeredProviders.filter((p) => p !== provider)[0] ?? null;
              if (nextActive) {
                await setActiveProvider(nextActive);
                setActive(nextActive);
              } else {
                // clear active
                try { await setActiveProvider(registeredProviders[0] ?? 'openai'); } catch {}
                setActive(null);
              }
            }
            await load();
          } catch (e) {
            Alert.alert('Erro', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const handleSetActive = async (provider) => {
    setActive(provider);
    try { await setActiveProvider(provider); } catch {}
  };

  const handleToggleFallback = async (provider) => {
    let next;
    if (fallback.includes(provider)) next = fallback.filter((p) => p !== provider);
    else next = [...fallback, provider];
    // filtra apenas cadastrados
    next = next.filter((p) => registeredProviders.includes(p) || p === provider);
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

  // FallbackCard só se houver cadastrados
  const FallbackCard = () => {
    if (registeredProviders.length === 0) return null;
    const visibleFallback = fallback.filter((p) => registeredProviders.includes(p));
    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mt-4" style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 16, elevation: 2 }}>
        <Text className="font-bold text-gray-700" style={{ fontWeight: '700', color: '#374151', fontSize: 16, marginBottom: 8 }}>
          Ordem de fallback
        </Text>
        <Text className="text-xs text-gray-500 mb-3" style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Se o provider ativo falhar, tentará na ordem abaixo.
        </Text>
        {visibleFallback.length === 0 ? (
          <Text testID="fallback-empty" style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Nenhum fallback selecionado — marque providers abaixo</Text>
        ) : (
          <View testID="fallback-list">
            {visibleFallback.map((p, idx) => (
              <View key={p} testID={`fallback-item-${p}`} className="flex-row items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-2" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: '#581C87', marginRight: 8 }}>{idx + 1}.</Text>
                  <Text style={{ fontWeight: '600', color: '#374151' }}>{PROVIDER_META[p]?.label ?? p}</Text>
                  {active === p && <Text style={{ marginLeft: 6, fontSize: 10, color: '#9c44dc', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>ativo</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity testID={`fallback-up-${p}`} onPress={() => moveFallback(fallback.indexOf(p), -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                    <Feather name="chevron-up" size={18} color="#581C87" />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`fallback-down-${p}`} onPress={() => moveFallback(fallback.indexOf(p), 1)} disabled={idx === visibleFallback.length - 1} style={{ padding: 6, opacity: idx === visibleFallback.length - 1 ? 0.3 : 1 }}>
                    <Feather name="chevron-down" size={18} color="#581C87" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {registeredProviders.filter((p) => p !== active).map((p) => (
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
  };

  const openAddModal = () => {
    // escolhe primeiro não cadastrado ou primeiro
    const firstNotRegistered = PROVIDERS.find((p) => !keys[p]) ?? PROVIDERS[0];
    setModalProvider(firstNotRegistered);
    setModalKey('');
    setModalModels([]);
    setModalSelectedModel('');
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }} className="flex-1 bg-warmGray-50">
      <Header
        title="Provedores IA"
        isShort
        isLeftIconComponent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 999 }} testID="back-button">
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

        <FallbackCard />

        {/* Lista de provedores cadastrados - simples */}
        {registeredProviders.length > 0 ? (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: '#374151', fontSize: 15, marginBottom: 8 }}>Provedores cadastrados</Text>
            {registeredProviders.map((p) => {
              const isActive = active === p;
              return (
                <View key={p} testID={`registered-card-${p}`} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: isActive ? 2 : 1, borderColor: isActive ? '#9c44dc' : '#f3f4f6', elevation: 1 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1f2937' }}>{PROVIDER_META[p].label}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{selectedModels[p] ?? ''}</Text>
                    {isActive && <Text style={{ fontSize: 11, color: '#9c44dc', marginTop: 2 }}>Ativo</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity testID={`btn-active-${p}`} onPress={() => handleSetActive(p)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: isActive ? '#581C87' : 'white', borderWidth: 1, borderColor: isActive ? '#581C87' : '#e5e7eb' }}>
                      <Text style={{ color: isActive ? 'white' : '#374151', fontWeight: '700', fontSize: 12 }}>{isActive ? 'Ativo' : 'Ativar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID={`btn-delete-${p}`} onPress={() => handleDeleteProvider(p)} style={{ padding: 8 }}>
                      <Feather name="trash-2" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 1 }}>
            <Feather name="cpu" size={32} color="#9ca3af" />
            <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>Nenhum provedor cadastrado</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, textAlign: 'center' }}>Adicione um provedor para começar a usar a IA</Text>
          </View>
        )}

        <TouchableOpacity testID="btn-add-provider" onPress={openAddModal} style={{ backgroundColor: '#9c44dc', marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Feather name="plus" size={18} color="white" />
          <Text style={{ color: 'white', fontWeight: '700' }}>Adicionar provedor de IA</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal adicionar provedor */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Adicionar provedor</Text>
              <TouchableOpacity testID="btn-close-modal" onPress={() => setModalVisible(false)} style={{ padding: 8 }}>
                <Feather name="x" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Provedor</Text>
            <View testID="picker-provider-wrap" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: 'white', overflow: 'hidden', marginBottom: 12 }}>
              <Picker
                testID="picker-provider"
                selectedValue={modalProvider}
                onValueChange={(v) => { setModalProvider(v); setModalModels([]); setModalSelectedModel(''); }}
                style={{ height: 48 }}
              >
                {PROVIDERS.map((p) => (
                  <Picker.Item key={p} label={PROVIDER_META[p].label} value={p} />
                ))}
              </Picker>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Chave API</Text>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: 'white', paddingHorizontal: 12, marginBottom: 12 }}>
              <TextInput
                testID="input-key-modal"
                placeholder={PROVIDER_META[modalProvider]?.placeholder ?? 'sk-...'}
                placeholderTextColor="#9ca3af"
                value={modalKey}
                onChangeText={setModalKey}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ paddingVertical: 12, fontSize: 14, color: '#111827' }}
              />
            </View>

            <TouchableOpacity
              testID="btn-search-models"
              onPress={handleSearchModelsModal}
              disabled={!modalKey.trim() || modalLoadingModels}
              style={{ backgroundColor: !modalKey.trim() || modalLoadingModels ? '#d1d5db' : '#9c44dc', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: !modalKey.trim() ? 0.6 : 1 }}
            >
              {modalLoadingModels ? <ActivityIndicator color="white" size="small" /> : <Feather name="search" size={16} color="white" />}
              <Text style={{ color: 'white', fontWeight: '700', marginLeft: 6 }}>{modalLoadingModels ? 'Buscando...' : 'Pesquisar modelos'}</Text>
            </TouchableOpacity>

            {modalModels.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 }}>Modelo</Text>
                <View testID="picker-model-wrap" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: 'white', overflow: 'hidden' }}>
                  <Picker
                    testID="picker-model-modal"
                    selectedValue={modalSelectedModel}
                    onValueChange={(v) => setModalSelectedModel(v)}
                    style={{ height: 48 }}
                  >
                    {modalModels.map((m) => (
                      <Picker.Item key={m} label={m} value={m} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            {modalSelectedModel ? (
              <TouchableOpacity testID="btn-save-provider" onPress={handleSaveProvider} style={{ backgroundColor: '#581C87', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Salvar provedor</Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: 24 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
