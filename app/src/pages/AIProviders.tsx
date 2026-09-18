import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ThemedPicker from '../components/ui/ThemedPicker';
import Orb from '../components/ui/Orb';
import SolidAlert from '../components/ui/SolidAlert';
import ThemedAlert from '../components/ui/ThemedAlert';
import { useSettingsStore, type SettingsState } from '../stores/settings';
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
  const insets = useSafeAreaInsets();
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark = colorModeState === 'dark';
  const bg = isDark ? '#1c1e21' : '#f5f5f4';
  const bgCard = isDark ? '#27272a' : 'white';
  const bgElevated = isDark ? '#3f3f46' : '#f9fafb';
  const text = isDark ? '#e4e4e7' : '#1f2937';
  const subText = isDark ? '#a1a1aa' : '#6b7280';
  const mutedText = isDark ? '#71717a' : '#9ca3af';
  const borderColor = isDark ? '#3f3f46' : '#e5e7eb';
  const purple = '#9c44dc';
  const purpleDark = '#581C87';

  const [keys, setKeys] = useState<KeysMap>({});
  const [models, setModels] = useState<ModelsMap>({});
  const [selectedModels, setSelectedModels] = useState<SelectedModelsMap>({});
  const [active, setActive] = useState<ProviderId | null>(null);
  const [fallback, setFallback] = useState<ProviderId[]>([]);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalProvider, setModalProvider] = useState<ProviderId>(PROVIDERS[0] as ProviderId);
  const [modalKey, setModalKey] = useState<string>('');
  const [modalModels, setModalModels] = useState<string[]>([]);
  const [modalSelectedModel, setModalSelectedModel] = useState<string>('');
  const [modalLoadingModels, setModalLoadingModels] = useState<boolean>(false);

  const [saveAlert, setSaveAlert] = useState<{ variant: 'success' | 'danger' | 'warning' | 'info'; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      setSaveAlert({ variant: 'danger', message: 'Preencha a chave e selecione um modelo' });
      return;
    }
    try {
      await saveProviderKey(modalProvider, key);
      await saveProviderModel(modalProvider, modalSelectedModel);
      if (!active) {
        await setActiveProvider(modalProvider);
        setActive(modalProvider);
      }
      setModalVisible(false);
      setModalKey('');
      setModalModels([]);
      setModalSelectedModel('');
      await load();
      setSaveAlert({ variant: 'success', message: `${(PROVIDER_META as any)[modalProvider].label} salvo` });
    } catch (e: any) {
      setSaveAlert({ variant: 'danger', message: String(e?.message ?? e) });
    }
  };

  const handleDeleteProvider = async (provider: string): Promise<void> => {
    setDeleteTarget(provider);
  };

  const confirmDeleteProvider = async (): Promise<void> => {
    const provider: string | null = deleteTarget;
    if (!provider) return;
    setDeleteTarget(null);
    try {
      await deleteProviderKey(provider);
      await saveProviderModel(provider as ProviderId, '');
      const nextFb: ProviderId[] = (fallback as string[]).filter((p) => p !== provider) as ProviderId[];
      setFallback(nextFb);
      await setFallbackOrder(nextFb);
      if (active === provider) {
        const nextActive: string | null = registeredProviders.filter((p) => p !== provider)[0] ?? null;
        if (nextActive) {
          await setActiveProvider(nextActive as ProviderId);
          setActive(nextActive as ProviderId);
        } else {
          try { await setActiveProvider((registeredProviders[0] ?? 'openai') as ProviderId); } catch {}
          setActive(null);
        }
      }
      await load();
      setSaveAlert({ variant: 'success', message: `${(PROVIDER_META as any)[provider].label} removido` });
    } catch (e: any) {
      setSaveAlert({ variant: 'danger', message: String(e?.message ?? e) });
    }
  };

  const handleSetActive = async (provider: string): Promise<void> => {
    setActive(provider as ProviderId);
    try { await setActiveProvider(provider as ProviderId); } catch {}
  };

  const handleToggleFallback = async (provider: string): Promise<void> => {
    let next: ProviderId[];
    if ((fallback as string[]).includes(provider)) next = (fallback as string[]).filter((p) => p !== provider) as ProviderId[];
    else next = [...fallback, provider as ProviderId];
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

  const FallbackCard = (): React.JSX.Element | null => {
    if (registeredProviders.length === 0) return null;
    const visibleFallback: string[] = (fallback as string[]).filter((p) => registeredProviders.includes(p));
    return (
      <View style={{ backgroundColor: bgCard, borderRadius: 16, padding: 14, marginHorizontal: 16, marginTop: 14, borderWidth: 1, borderColor, elevation: isDark ? 0 : 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(156,68,220,0.15)' : '#f3e8ff', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="shuffle" size={14} color={purple} />
          </View>
          <Text style={{ fontWeight: '800', color: text, fontSize: 14, flex: 1 }}>Ordem de fallback</Text>
          <View style={{ backgroundColor: isDark ? '#3f3f46' : bgElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ fontSize: 11, color: subText, fontWeight: '600' }}>{visibleFallback.length} ativo{visibleFallback.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: subText, marginBottom: 10, lineHeight: 16 }}>Se o provider ativo falhar, tentará na ordem abaixo.</Text>
        {visibleFallback.length === 0 ? (
          <View style={{ backgroundColor: bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor, borderStyle: 'dashed' }}>
            <Text testID="fallback-empty" style={{ color: mutedText, fontSize: 12, textAlign: 'center' }}>Nenhum fallback selecionado — marque providers abaixo</Text>
          </View>
        ) : (
          <View testID="fallback-list">
            {visibleFallback.map((p: string, idx: number) => (
              <View key={p} testID={`fallback-item-${p}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bgElevated, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: purple, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{idx + 1}</Text>
                  </View>
                  <Text style={{ fontWeight: '700', color: text, flexShrink: 1 }} numberOfLines={1}>{(PROVIDER_META as any)[p]?.label ?? p}</Text>
                  {active === p && <View style={{ backgroundColor: isDark ? 'rgba(156,68,220,0.2)' : '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, marginLeft: 4 }}><Text style={{ fontSize: 10, color: purple, fontWeight: '700' }}>ativo</Text></View>}
                </View>
                <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
                  <TouchableOpacity testID={`fallback-up-${p}`} onPress={() => void moveFallback((fallback as string[]).indexOf(p), -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1, backgroundColor: bgCard, borderRadius: 8, borderWidth: 1, borderColor }}>
                    <Feather name="chevron-up" size={14} color={purple} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`fallback-down-${p}`} onPress={() => void moveFallback((fallback as string[]).indexOf(p), 1)} disabled={idx === visibleFallback.length - 1} style={{ padding: 6, opacity: idx === visibleFallback.length - 1 ? 0.3 : 1, backgroundColor: bgCard, borderRadius: 8, borderWidth: 1, borderColor }}>
                    <Feather name="chevron-down" size={14} color={purple} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {registeredProviders.filter((p) => p !== active).map((p: string) => {
            const selected = (fallback as string[]).includes(p);
            return (
              <TouchableOpacity
                key={`toggle-${p}`}
                testID={`toggle-fallback-${p}`}
                onPress={() => void handleToggleFallback(p)}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? purple : borderColor,
                  backgroundColor: selected ? (isDark ? 'rgba(156,68,220,0.15)' : '#f3e8ff') : bgCard,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Feather name={selected ? 'check' : 'plus'} size={12} color={selected ? purple : subText} />
                <Text style={{ marginLeft: 6, fontSize: 12, color: selected ? purpleDark : text, fontWeight: '600' }}>{(PROVIDER_META as any)[p].label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const openAddModal = (): void => {
    const firstNotRegistered: string = (PROVIDERS as readonly string[]).find((p) => !keys[p]) ?? (PROVIDERS[0] as string);
    setModalProvider(firstNotRegistered as ProviderId);
    setModalKey('');
    setModalModels([]);
    setModalSelectedModel('');
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Header
        title="Provedores IA"
        isShort
        isLeftIconComponent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 999 }} testID="back-button">
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
        }
      />
      {saveAlert && (
        <SolidAlert
          variant={saveAlert.variant}
          message={saveAlert.message}
          onClose={() => setSaveAlert(null)}
          style={{ marginHorizontal: 16, marginTop: 8 }}
          testID="ai-provider-alert"
        />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {/* Hero redesigned */}
        <View style={{ marginHorizontal: 16, backgroundColor: isDark ? '#2a1050' : purpleDark, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: isDark ? '#6d28d9' : '#7c3aed', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Orb size={54} color={purple} testID="ai-providers-orb" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>IA multi-provider</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2, lineHeight: 16 }}>1 ativo + fallback • chaves em SecureStore</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{registeredProviders.length} cadastrado{registeredProviders.length !== 1 ? 's' : ''}</Text>
              </View>
              {active ? (
                <View style={{ backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ color: purpleDark, fontSize: 11, fontWeight: '700' }}>Ativo: {(PROVIDER_META as any)[active]?.label}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="cpu" size={16} color="white" />
          </View>
        </View>

        <FallbackCard />

        {/* Lista cadastrados redesigned */}
        {registeredProviders.length > 0 ? (
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontWeight: '800', color: text, fontSize: 14 }}>Provedores cadastrados</Text>
              <View style={{ backgroundColor: bgCard, borderWidth: 1, borderColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, color: subText }}>{registeredProviders.length} total</Text>
              </View>
            </View>
            {registeredProviders.map((p: string) => {
              const isActive: boolean = active === p;
              const modelLabel = selectedModels[p] ?? '';
              const metaLabel = (PROVIDER_META as any)[p]?.label ?? p;
              return (
                <View key={p} testID={`registered-card-${p}`} style={{ backgroundColor: bgCard, borderRadius: 16, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: isActive ? 1.5 : 1, borderColor: isActive ? purple : borderColor, elevation: isDark ? 0 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isActive ? purple : bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isActive ? purple : borderColor }}>
                      <Feather name="cpu" size={16} color={isActive ? 'white' : subText} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontWeight: '700', color: text, flexShrink: 1 }} numberOfLines={1}>{metaLabel}</Text>
                        {isActive && <View style={{ backgroundColor: isDark ? 'rgba(156,68,220,0.2)' : '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, color: purple, fontWeight: '700' }}>ATIVO</Text></View>}
                      </View>
                      <Text style={{ fontSize: 11, color: subText }} numberOfLines={1} ellipsizeMode="tail">{modelLabel || 'sem modelo'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginLeft: 8 }}>
                    <TouchableOpacity testID={`btn-active-${p}`} onPress={() => void handleSetActive(p)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: isActive ? purpleDark : bgElevated, borderWidth: 1, borderColor: isActive ? purpleDark : borderColor }}>
                      <Text style={{ color: isActive ? 'white' : text, fontWeight: '700', fontSize: 11 }}>{isActive ? 'Ativo' : 'Ativar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID={`btn-delete-${p}`} onPress={() => void handleDeleteProvider(p)} style={{ padding: 8, backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', borderRadius: 999, borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}>
                      <Feather name="trash-2" size={14} color={isDark ? '#fca5a5' : '#dc2626'} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: bgCard, borderRadius: 16, padding: 22, alignItems: 'center', borderWidth: 1, borderColor, borderStyle: 'dashed' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor }}>
              <Feather name="cpu" size={24} color={mutedText} />
            </View>
            <Text style={{ color: text, fontWeight: '700', marginTop: 10 }}>Nenhum provedor cadastrado</Text>
            <Text style={{ color: subText, fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 16 }}>Adicione OpenAI, Gemini, Anthropic, OpenRouter ou Zen para usar a IA</Text>
          </View>
        )}

        <TouchableOpacity testID="btn-add-provider" onPress={openAddModal} style={{ backgroundColor: purple, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: isDark ? 0 : 2 }}>
          <Feather name="plus" size={16} color="white" />
          <Text style={{ color: 'white', fontWeight: '700' }}>Adicionar provedor de IA</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Modal adicionar provedor - dark aware + ThemedPicker sem corte */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '92%', borderWidth: 1, borderColor, paddingBottom: insets.bottom + 16 }}>
            <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(156,68,220,0.15)' : '#f3e8ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="plus" size={16} color={purple} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: text }}>Adicionar provedor</Text>
              </View>
              <TouchableOpacity testID="btn-close-modal" onPress={() => setModalVisible(false)} style={{ padding: 8, backgroundColor: bgElevated, borderRadius: 999, borderWidth: 1, borderColor }}>
                <Feather name="x" size={16} color={subText} />
              </TouchableOpacity>
            </View>

            {saveAlert && (
              <SolidAlert
                variant={saveAlert.variant}
                message={saveAlert.message}
                onClose={() => setSaveAlert(null)}
                style={{ marginBottom: 12 }}
                testID="ai-provider-modal-alert"
              />
            )}
            <Text style={{ fontSize: 12, fontWeight: '700', color: text, marginBottom: 6 }}>Provedor</Text>
            <View testID="picker-provider-wrap" style={{ marginBottom: 12 }}>
              <ThemedPicker
                testID="picker-provider"
                selectedValue={modalProvider}
                onValueChange={(v: string) => { setModalProvider(v as ProviderId); setModalModels([]); setModalSelectedModel(''); }}
                items={(PROVIDERS as readonly string[]).map((p: string) => ({ label: (PROVIDER_META as any)[p].label, value: p }))}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: text, marginBottom: 6 }}>Chave API</Text>
            <View style={{ borderWidth: 1, borderColor, borderRadius: 12, backgroundColor: bgElevated, paddingHorizontal: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="key" size={14} color={mutedText} style={{ marginRight: 8 }} />
              <TextInput
                testID="input-key-modal"
                placeholder={(PROVIDER_META as any)[modalProvider]?.placeholder ?? 'sk-...'}
                placeholderTextColor={mutedText}
                value={modalKey}
                onChangeText={setModalKey}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, paddingVertical: 12, fontSize: 13, color: text }}
              />
            </View>

            <TouchableOpacity
              testID="btn-search-models"
              onPress={() => void handleSearchModelsModal()}
              disabled={!modalKey.trim() || modalLoadingModels}
              style={{ backgroundColor: !modalKey.trim() || modalLoadingModels ? (isDark ? '#3f3f46' : '#d1d5db') : purple, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: !modalKey.trim() ? 0.6 : 1 }}
            >
              {modalLoadingModels ? <ActivityIndicator color="white" size="small" /> : <Feather name="search" size={14} color="white" />}
              <Text style={{ color: 'white', fontWeight: '700', marginLeft: 6 }}>{modalLoadingModels ? 'Buscando...' : 'Pesquisar modelos'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: subText, marginTop: 6, lineHeight: 14 }}>Busca modelos disponíveis usando a chave. Se falhar, usa lista fallback local.</Text>

            {modalModels.length > 0 && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '700', color: text, marginTop: 14, marginBottom: 6 }}>Modelo</Text>
                <View testID="picker-model-wrap">
                  <ThemedPicker
                    testID="picker-model-modal"
                    selectedValue={modalSelectedModel}
                    onValueChange={(v: string) => setModalSelectedModel(v)}
                    items={modalModels.map((m: string) => ({ label: m, value: m }))}
                  />
                </View>
                <Text style={{ fontSize: 11, color: subText, marginTop: 6 }} numberOfLines={1} ellipsizeMode="tail">{modalModels.length} modelos • ex: {modalModels[0]}</Text>
              </>
            )}

            {modalSelectedModel ? (
              <TouchableOpacity testID="btn-save-provider" onPress={() => void handleSaveProvider()} style={{ backgroundColor: purpleDark, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Salvar provedor</Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: 8 }} />
          </View>
        </View>
      </Modal>

      <ThemedAlert
        visible={!!deleteTarget}
        title="Remover provedor"
        message={deleteTarget ? `Remover ${(PROVIDER_META as any)[deleteTarget].label}?` : undefined}
        variant="danger"
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={() => void confirmDeleteProvider()}
        onCancel={() => setDeleteTarget(null)}
        onClose={() => setDeleteTarget(null)}
        testID="confirm-delete-provider"
        confirmTestID="confirm-delete-provider-confirm"
        cancelTestID="confirm-delete-provider-cancel"
      />
    </View>
  );
}
