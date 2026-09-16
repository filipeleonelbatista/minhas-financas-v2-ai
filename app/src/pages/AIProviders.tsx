import React, { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
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
  type ProviderId,
} from '../utils/aiProviders';

type KeysMap = Record<string, string>;
type ModelsMap = Record<string, string[]>;
type SelectedModelsMap = Record<string, string>;

export default function AIProviders(): React.JSX.Element {
  const navigation: any = useNavigation();
  const isFocused: boolean = useIsFocused();

  const [keys, setKeys] = useState<KeysMap>({});
  const [models, setModels] = useState<ModelsMap>({});
  const [selectedModels, setSelectedModels] = useState<SelectedModelsMap>({});
  const [active, setActive] = useState<ProviderId | null>(null);
  const [fallback, setFallback] = useState<ProviderId[]>([]);

  // modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalProvider, setModalProvider] = useState<ProviderId>(PROVIDERS[0] as ProviderId);
  const [modalKey, setModalKey] = useState<string>('');
  const [modalModels, setModalModels] = useState<string[]>([]);
  const [modalSelectedModel, setModalSelectedModel] = useState<string>('');
  const [modalLoadingModels, setModalLoadingModels] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    const newKeys: KeysMap = {};
    const newModels: ModelsMap = {};
    const newSelected: SelectedModelsMap = {};
    for (const p of PROVIDERS) {
      try { newKeys[p] = (await getProviderKey(p)) ?? ''; } catch { newKeys[p] = ''; }
      try { newSelected[p] = (await getProviderModel(p as ProviderId)) ?? (FALLBACK_MODELS as any)[p]?.[0] ?? ''; } catch { newSelected[p] = (FALLBACK_MODELS as any)[p]?.[0] ?? ''; }
      newModels[p] = (FALLBACK_MODELS as any)[p] ?? [];
    }
    let act: ProviderId | null = null;
    let fb: ProviderId[] = [];
    try { act = await getActiveProvider(); } catch {}
    try { fb = await getFallbackOrder(); } catch {}
    setKeys(newKeys);
    setModels(newModels);
    setSelectedModels(newSelected);
    setActive(act);
    setFallback(fb ?? []);
  }, []);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  const registeredProviders: string[] = (PROVIDERS as readonly string[]).filter((p) => keys[p] && keys[p].length > 0);

  const handleSearchModelsModal = async (): Promise<void> => {
    const key: string = modalKey.trim();
    if (!key) return;
    setModalLoadingModels(true);
    try {
      const list: string[] = await fetchModels(modalProvider, key);
      setModalModels(list);
      if (list.length > 0) setModalSelectedModel(list[0]);
      else setModalSelectedModel('');
    } catch {
      setModalModels((FALLBACK_MODELS as any)[modalProvider] ?? []);
      const fb: string[] = (FALLBACK_MODELS as any)[modalProvider] ?? [];
      if (fb.length > 0) setModalSelectedModel(fb[0]);
    } finally {
      setModalLoadingModels(false);
    }
  };

  const handleSaveProvider = async (): Promise<void> => {
    const key: string = modalKey.trim();
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
      Alert.alert('Sucesso', `${(PROVIDER_META as any)[modalProvider].label} salvo`);
      // volta para tela de configurações dos provedores (já está nela, apenas fecha modal)
    } catch (e: any) {
      Alert.alert('Erro', String(e?.message ?? e));
    }
  };

  const handleDeleteProvider = async (provider: string): Promise<void> => {
    Alert.alert('Remover provedor', `Remover ${(PROVIDER_META as any)[provider].label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          try {
            await deleteProviderKey(provider);
            await saveProviderModel(provider as ProviderId, '');
            // remove from fallback
            const nextFb: ProviderId[] = (fallback as string[]).filter((p) => p !== provider) as ProviderId[];
            setFallback(nextFb);
            await setFallbackOrder(nextFb);
            if (active === provider) {
              const nextActive: string | null = registeredProviders.filter((p) => p !== provider)[0] ?? null;
              if (nextActive) {
                await setActiveProvider(nextActive as ProviderId);
                setActive(nextActive as ProviderId);
              } else {
                // clear active
                try { await setActiveProvider((registeredProviders[0] ?? 'openai') as ProviderId); } catch {}
                setActive(null);
              }
            }
            await load();
          } catch (e: any) {
            Alert.alert('Erro', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const handleSetActive = async (provider: string): Promise<void> => {
    setActive(provider as ProviderId);
    try { await setActiveProvider(provider as ProviderId); } catch {}
  };

  const handleToggleFallback = async (provider: string): Promise<void> => {
    let next: ProviderId[];
    if ((fallback as string[]).includes(provider)) next = (fallback as string[]).filter((p) => p !== provider) as ProviderId[];
    else next = [...fallback, provider as ProviderId];
    // filtra apenas cadastrados
    next = next.filter((p) => registeredProviders.includes(p) || p === provider) as ProviderId[];
    setFallback(next);
    try { await setFallbackOrder(next); } catch {}
  };

  const moveFallback = async (index: number, dir: number): Promise<void> => {
    const next: ProviderId[] = [...fallback];
    const target: number = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp: ProviderId = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setFallback(next);
    try { await setFallbackOrder(next); } catch {}
  };

  // FallbackCard só se houver cadastrados
  const FallbackCard = (): React.JSX.Element | null => {
    if (registeredProviders.length === 0) return null;
    const visibleFallback: string[] = (fallback as string[]).filter((p) => registeredProviders.includes(p));
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
            {visibleFallback.map((p: string, idx: number) => (
              <View key={p} testID={`fallback-item-${p}`} className="flex-row items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-2" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: '#581C87', marginRight: 8 }}>{idx + 1}.</Text>
                  <Text style={{ fontWeight: '600', color: '#374151' }}>{(PROVIDER_META as any)[p]?.label ?? p}</Text>
                  {active === p && <Text style={{ marginLeft: 6, fontSize: 10, color: '#9c44dc', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>ativo</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity testID={`fallback-up-${p}`} onPress={() => void moveFallback((fallback as string[]).indexOf(p), -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                    <Feather name="chevron-up" size={18} color="#581C87" />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`fallback-down-${p}`} onPress={() => void moveFallback((fallback as string[]).indexOf(p), 1)} disabled={idx === visibleFallback.length - 1} style={{ padding: 6, opacity: idx === visibleFallback.length - 1 ? 0.3 : 1 }}>
                    <Feather name="chevron-down" size={18} color="#581C87" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {registeredProviders.filter((p) => p !== active).map((p: string) => (
            <TouchableOpacity
              key={`toggle-${p}`}
              testID={`toggle-fallback-${p}`}
              onPress={() => void handleToggleFallback(p)}
              style={{
                borderWidth: 1,
                borderColor: (fallback as string[]).includes(p) ? '#9c44dc' : '#e5e7eb',
                backgroundColor: (fallback as string[]).includes(p) ? '#f3e8ff' : 'white',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Feather name={(fallback as string[]).includes(p) ? 'check' : 'plus'} size={14} color={(fallback as string[]).includes(p) ? '#581C87' : '#6b7280'} />
              <Text style={{ marginLeft: 6, fontSize: 13, color: (fallback as string[]).includes(p) ? '#581C87' : '#374151' }}>{(PROVIDER_META as any)[p].label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const openAddModal = (): void => {
    // escolhe primeiro não cadastrado ou primeiro
    const firstNotRegistered: string = (PROVIDERS as readonly string[]).find((p) => !keys[p]) ?? (PROVIDERS[0] as string);
    setModalProvider(firstNotRegistered as ProviderId);
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
            {registeredProviders.map((p: string) => {
              const isActive: boolean = active === p;
              return (
                <View key={p} testID={`registered-card-${p}`} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: isActive ? 2 : 1, borderColor: isActive ? '#9c44dc' : '#f3f4f6', elevation: 1 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1f2937' }}>{(PROVIDER_META as any)[p].label}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{selectedModels[p] ?? ''}</Text>
                    {isActive && <Text style={{ fontSize: 11, color: '#9c44dc', marginTop: 2 }}>Ativo</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity testID={`btn-active-${p}`} onPress={() => void handleSetActive(p)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: isActive ? '#581C87' : 'white', borderWidth: 1, borderColor: isActive ? '#581C87' : '#e5e7eb' }}>
                      <Text style={{ color: isActive ? 'white' : '#374151', fontWeight: '700', fontSize: 12 }}>{isActive ? 'Ativo' : 'Ativar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID={`btn-delete-${p}`} onPress={() => void handleDeleteProvider(p)} style={{ padding: 8 }}>
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
                onValueChange={(v: ProviderId) => { setModalProvider(v); setModalModels([]); setModalSelectedModel(''); }}
                style={{ height: 48 } as any}
              >
                {(PROVIDERS as readonly string[]).map((p: string) => (
                  <Picker.Item key={p} label={(PROVIDER_META as any)[p].label} value={p} />
                ))}
              </Picker>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Chave API</Text>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: 'white', paddingHorizontal: 12, marginBottom: 12 }}>
              <TextInput
                testID="input-key-modal"
                placeholder={(PROVIDER_META as any)[modalProvider]?.placeholder ?? 'sk-...'}
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
              onPress={() => void handleSearchModelsModal()}
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
                    onValueChange={(v: string) => setModalSelectedModel(v)}
                    style={{ height: 48 } as any}
                  >
                    {modalModels.map((m: string) => (
                      <Picker.Item key={m} label={m} value={m} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            {modalSelectedModel ? (
              <TouchableOpacity testID="btn-save-provider" onPress={() => void handleSaveProvider()} style={{ backgroundColor: '#581C87', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 }}>
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
