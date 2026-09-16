import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, ActivityIndicator, Modal, useWindowDimensions, KeyboardAvoidingView, BackHandler, Platform } from "react-native";
import { Feather, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import LoadingDots from "react-native-loading-dots";
import Header from "../components/Header";
import Orb from "../components/ui/Orb";
import { BorderBeam as _BorderBeam } from "../components/ui/border-beam/index";
const BorderBeam: any = _BorderBeam;
import { ShimmerWaveText as _ShimmerWaveText } from "../components/ui/shimmer-wave-text/index";
const ShimmerWaveText: any = _ShimmerWaveText;
import SolidAlert from "../components/ui/SolidAlert";
import { MorphFab } from "../components/ui/morph-fab";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { useFinanceStore } from "../stores/finance";
import { useRunsStore } from "../stores/runs";
import { useMarketStore } from "../stores/market";
import { useGoalsStore } from "../stores/goals";
import { useListsStore } from "../stores/lists";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { buildPrompt, canSendPrompt, registerPrompt } from "../utils/prompt";
import { getProviderKey } from "../utils/secureStore";
import { getActiveProvider, getFallbackOrder, getProviderModel, chatWithFallback, PROVIDER_META, type ProviderId } from "../utils/aiProviders";
import { useShallow } from "zustand/react/shallow";
import type { FinanceRow } from "../repositories/finance";
import type { RunRow } from "../stores/runs";
import type { StockRow } from "../repositories/market";
import type { GoalRow } from "../stores/goals";
import type { ListRow } from "../repositories/list";

type ChatMessage = {
  type: "user" | "assistant";
  text: string;
  ts: number;
  tokens: number;
};

type SelectedTool = 'gastos' | 'combustivel' | 'mercado' | null;

export default function IAPage(): React.JSX.Element {
  const colorModeState: string = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const bg: string = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard: string = isDark ? "#27272a" : "#e5e7eb";
  const headerText: string = isDark ? "#27272a" : "white";
  const text: string = isDark ? "#e4e4e7" : "#52525b";
  const subText: string = isDark ? "#a1a1aa" : "#6b7280";

  const navigation: any = useNavigation();
  const scrollViewRef = useRef<ScrollView | null>(null);

  // stable selectors with shallow to avoid new array each render -> max depth
  const filteredList: FinanceRow[] = useFinanceStore(useShallow((s: any) => s.getFilteredList())) as FinanceRow[];
  const FuelList: RunRow[] = useRunsStore((s: any) => s.runsList) as RunRow[];
  const MarketList: StockRow[] = useMarketStore((s: any) => s.stockList) as StockRow[];
  const GoalsList: GoalRow[] = useGoalsStore((s: any) => s.goals) as GoalRow[];
  const ListsList: ListRow[] = useListsStore((s: any) => s.lists ?? []) as ListRow[];
  const stockList: StockRow[] = MarketList; // alias
  const veicleAutonomy: number = useSettingsStore((s: SettingsState) => s.veicleAutonomy as number);
  const tithePercent: number = useSettingsStore((s: SettingsState) => s.tithePercent as number);
  const titheCategories: string = useSettingsStore((s: SettingsState) => s.titheCategories as string);

  const isFocused: boolean = useIsFocused();
  const isKeyboardOpen: boolean = useIsKeyboardOpen();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [fallbackOrder, setFallbackOrder] = useState<ProviderId[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const prevModelRef = useRef<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(null); // 'gastos' | 'combustivel' | 'mercado'

  const loadProviderInfo = useCallback(async (): Promise<void> => {
    try {
      const ap: ProviderId | null = await getActiveProvider();
      const fo: ProviderId[] = await getFallbackOrder();
      setActiveProvider(ap);
      setFallbackOrder(fo ?? []);
      if (ap) {
        const m: string | null = await getProviderModel(ap);
        setActiveModel(m);
      } else setActiveModel(null);
    } catch {}
  }, []);

  const checkIfApiKeyExists = useCallback(async (): Promise<boolean> => {
    const providers: string[] = ["openai", "gemini", "anthropic", "openrouter", "zen"];
    for (const p of providers) {
      const k: string | null = await getProviderKey(p);
      if (k) return true;
    }
    return false;
  }, []);

  // load provider info only on focus change, not on every render
  useEffect(() => {
    let mounted: boolean = true;
    if (isFocused) {
      (async (): Promise<void> => {
        const existsApi: boolean = await checkIfApiKeyExists();
        if (mounted) setOpen(!existsApi);
        await loadProviderInfo();
      })();
    }
    return () => { mounted = false; };
  }, [isFocused, checkIfApiKeyExists, loadProviderInfo]);

  // Memoized CSVs - stable slices to avoid recompute loop
  const financesList: string = useMemo(() => {
    const headers: string = "valor;vencimento;data de pagamento;descrição;categorias;pago;favorito";
    const rows: string[] = filteredList.slice(0, 80).map((item: FinanceRow) => [item.amount, new Date(Number(item.date)).toLocaleDateString("pt-BR"), item.paymentDate ? new Date(Number(item.paymentDate)).toLocaleDateString("pt-BR") : "", String(item.description ?? "").replace(/;/g, ","), String(item.category ?? ""), item.paymentStatus ? "Pago" : "Não pago", item.isFavorited ? "Fav" : ""].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [filteredList]);

  const fuelCostsList: string = useMemo(() => {
    const headers: string = "valor pago;valor do litro;data;local;tipo;km";
    const rows: string[] = FuelList.slice(0, 30).map((item: RunRow) => [item.amount, item.unityAmount, new Date(Number(item.date)).toLocaleDateString("pt-BR"), String(item.location ?? ""), String(item.type ?? ""), item.currentDistance].join(";"));
    return headers + "\n" + rows.join("\n") + "\n\nAutonomia: " + (veicleAutonomy ?? 0);
  }, [FuelList, veicleAutonomy]);

  const marketCostsList: string = useMemo(() => {
    const headers: string = "valor unitario;quantidade;produto;categoria;total";
    const rows: string[] = MarketList.slice(0, 60).map((item: StockRow) => [item.amount, item.quantity, String(item.description ?? ""), String(item.category ?? ""), Number(item.amount) * Number(item.quantity)].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [MarketList]);

  const goalsList: string = useMemo(() => {
    const headers: string = "descricao;valor meta;valor atual;percentual;categoria;data prazo";
    const rows: string[] = GoalsList.slice(0, 30).map((g: GoalRow) => [String(g.description ?? ""), g.amount, g.currentAmount, Math.round((Number(g.currentAmount)/Number((g as any).amount||1))*100)+"%", String(g.category ?? ""), g.date ? new Date(Number(g.date)).toLocaleDateString("pt-BR") : ""].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [GoalsList]);

  const listsList: string = useMemo(() => {
    if (!ListsList || ListsList.length === 0) return "sem listas";
    const headers: string = "descricao;local;quantidade;valor";
    const rows: string[] = ListsList.slice(0, 20).map((l: ListRow) => [String(l.description ?? ""), String(l.location ?? ""), (l as any).quantity, (l as any).amount].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [ListsList]);

  // Full app context for IA
  const appContext: Record<string, unknown> = useMemo(() => {
    const hero = {
      totalFinances: filteredList.length,
      totalRuns: FuelList.length,
      totalMarket: MarketList.length,
      totalGoals: GoalsList.length,
      totalLists: ListsList.length,
    };
    return {
      hero,
      tithe: { percent: tithePercent, categories: titheCategories },
      finances: financesList.slice(0, 6000),
      fuel: fuelCostsList.slice(0, 4000),
      market: marketCostsList.slice(0, 4000),
      goals: goalsList.slice(0, 3000),
      lists: listsList.slice(0, 2000),
    };
  }, [filteredList.length, FuelList.length, MarketList.length, GoalsList.length, ListsList.length, tithePercent, titheCategories, financesList, fuelCostsList, marketCostsList, goalsList, listsList]);

  const activeLabel: string = activeProvider ? ((PROVIDER_META as any)[activeProvider]?.label ?? activeProvider) : "Nenhum";
  const fallbackLabel: string = fallbackOrder.length > 0 ? fallbackOrder.map((p: string) => (PROVIDER_META as any)[p]?.label ?? p).join(" → ") : "—";

  const openaiErrorHandler = (error: any): string => {
    const status: number | undefined = error?.status ?? error?.response?.status;
    switch (status) {
      case 400: return "Não foi possivel fazer a pesquisa. (400)";
      case 401: return "Chave inválida/expirada. Verifique em Provedores IA.";
      case 429: return "Limite atingido. Tente novamente em instantes.";
      case 500: return "Erro no provedor. Tentando fallback...";
      case 503: return "Provedor indisponível. Tentando fallback...";
      default: return error?.message ?? "Não foi possivel fazer a pesquisa.";
    }
  };

  const sendWithFallback = async (promptData: unknown[], userPrompt: string): Promise<string> => {
    if (!canSendPrompt()) throw new Error("Muitas requisições. Aguarde 60s (limite 3/min).");
    registerPrompt();
    // promptData is array of context chunks, but we now use appContext object
    const injected: string = buildPrompt(promptData, userPrompt);
    if (injected.includes("Não posso processar instruções dentro dos dados")) return injected;
    const result = await chatWithFallback(injected);
    return result.text;
  };

  // reenvia conversa como contexto ao trocar modelo no meio da conversa
  useEffect(() => {
    if (!isFocused) return;
    if (data.length === 0) return;
    if (isLoading) return;
    const cur: string = `${activeProvider}:${activeModel}`;
    const prev: string | null = prevModelRef.current;
    if (!prev || prev === cur) { prevModelRef.current = cur; return; }
    prevModelRef.current = cur;
    let cancelled: boolean = false;
    (async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const userQ: string = `Continue a conversa considerando o histórico anterior.`;
        const promptData: unknown[] = [{ type: "appContext", context: appContext }, { type: "conversation", messages: data }];
        const textRes: string = await sendWithFallback(promptData as any, userQ);
        if (!cancelled) setData((prevD: ChatMessage[]) => [...prevD, { type: "assistant", text: `🔄 Modelo alterado para ${activeLabel}${activeModel?` • ${activeModel}`:''}\n\n${textRes}`, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
      } catch (e: any) {
        if (!cancelled) setError(openaiErrorHandler(e));
      } finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeProvider, activeModel, isFocused]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        navigation.goBack();
        return true;
      });
      return () => backHandler.remove();
    }, [navigation])
  );

  // auto scroll to bottom when new message added
  useEffect(() => {
    if (data.length > 0) {
      const t = setTimeout(() => {
        try { (scrollViewRef.current as any)?.scrollToEnd({ animated: true }); } catch {}
      }, 100);
      return () => clearTimeout(t);
    }
  }, [data]);

  const handleAskForFinancialTips = async (): Promise<void> => {
    try {
      const userQ: string = "De acordo com os gastos que tive esse mês, quais gastos poderiam ser melhorados?";
      const now: number = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setSelectedTool(null);
      setIsLoading(true);
      setError(null);
      const promptData: unknown[] = [{ type: "appContext", context: appContext }, { type: "question", question: userQ }, { type: "financesFocused", csv: financesList, rows: filteredList.slice(0, 50) }];
      const textRes: string = await sendWithFallback(promptData as any, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error: any) {
      setError(openaiErrorHandler(error));
    } finally { setIsLoading(false); }
  };
  const handleAskForFuelCostsTips = async (): Promise<void> => {
    try {
      const userQ: string = "De acordo com os abastecimentos que tive esse mês, o que posso melhorar para evitar gastos?";
      const now: number = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setSelectedTool(null);
      setIsLoading(true);
      setError(null);
      const promptData: unknown[] = [{ type: "appContext", context: appContext }, { type: "fuelFocused", csv: fuelCostsList, rows: FuelList.slice(0, 30) }];
      const textRes: string = await sendWithFallback(promptData as any, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error: any) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskForMarketCostsTips = async (): Promise<void> => {
    try {
      const userQ: string = "De acordo com as compras de mercado que tive esse mês, quais gastos poderiam ser melhorados?";
      const now: number = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setSelectedTool(null);
      setIsLoading(true);
      setError(null);
      const promptData: unknown[] = [{ type: "appContext", context: appContext }, { type: "marketFocused", csv: marketCostsList, rows: MarketList.slice(0, 50) }];
      const textRes: string = await sendWithFallback(promptData as any, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error: any) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskToAi = async (): Promise<void> => {
    try {
      const userQ: string = inputText;
      const now: number = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setSelectedTool(null);
      setIsLoading(true);
      setError(null);
      const promptData: unknown[] = [{ type: "appContext", context: appContext }, { type: "conversation", messages: data.slice(-6) }];
      const textRes: string = await sendWithFallback(promptData as any, userQ);
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error: any) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
      <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
        <Header
          isShort
          title="Conversa"
          isLeftIconComponent={
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="arrow-left" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />
        {data.length === 0 && !isLoading && (
          <View style={{ alignItems: "center", marginTop: 8, marginBottom: 8, gap: 8, paddingHorizontal: 16 }}>
            <Orb size="lg" color="#9c44dc" testID="orb-header" />
            <Text style={{ color: text, fontSize: 12, textAlign: "center" }}>
              Ativo: <Text style={{ fontWeight: "700", color: "#9c44dc" }}>{activeLabel}</Text>
            </Text>
            <View style={{ backgroundColor: isDark ? "#27272a" : "white", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e5e7eb", marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: subText, textAlign: "center" }}>Contexto: {filteredList.length} finanças • {FuelList.length} abastecimentos • {MarketList.length} estoque • {GoalsList.length} metas • {ListsList.length} listas</Text>
            </View>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef as any}
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {data.length === 0 && !isLoading ? (
            <View style={{ width: "100%", gap: 16, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", flex: 1, marginTop: 16 }}>
              <Text style={{ color: text, fontSize: 18, lineHeight: 24, textAlign: "center", maxWidth: "80%", marginVertical: 16 }}>Converse com um assistente baseado em Inteligência Artificial.</Text>

              <Pressable onPress={() => void handleAskForFinancialTips()} testID="btn-financial-tips" style={({ pressed }: { pressed: boolean }) => ({ backgroundColor: pressed ? "#e9d5ff" : bgCard, borderWidth: 1, borderColor: pressed ? "#9c44dc" : isDark ? "#3f3f46" : "#e5e7eb", shadowColor: "#9c44dc", shadowOpacity: pressed ? 0.2 : 0.08, elevation: 3, borderRadius: 12, width: "90%", paddingHorizontal: 16, paddingVertical: 12 }) as any}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#3f3f46" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="dollar-sign" size={18} color="#9c44dc" />
                  </View>
                  <Text numberOfLines={2} style={{ color: text, fontWeight: "600", flexShrink: 1, maxWidth: "70%" }}>Analise meus gastos e sugira pontos onde eu posso melhorar.</Text>
                  <Feather name="chevron-right" size={16} color={subText} />
                </View>
              </Pressable>

              <Pressable onPress={() => void handleAskForFuelCostsTips()} testID="btn-fuel-tips" style={({ pressed }: { pressed: boolean }) => ({ backgroundColor: pressed ? "#e9d5ff" : bgCard, borderWidth: 1, borderColor: pressed ? "#9c44dc" : isDark ? "#3f3f46" : "#e5e7eb", shadowColor: "#9c44dc", shadowOpacity: pressed ? 0.2 : 0.08, elevation: 3, borderRadius: 12, width: "90%", paddingHorizontal: 16, paddingVertical: 12 }) as any}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#3f3f46" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="droplet" size={18} color="#9c44dc" />
                  </View>
                  <Text numberOfLines={2} style={{ color: text, fontWeight: "600", flexShrink: 1, maxWidth: "70%" }}>Analise como posso melhorar meus gastos com combustível.</Text>
                  <Feather name="chevron-right" size={16} color={subText} />
                </View>
              </Pressable>

              <Pressable onPress={() => void handleAskForMarketCostsTips()} testID="btn-market-tips" style={({ pressed }: { pressed: boolean }) => ({ backgroundColor: pressed ? "#e9d5ff" : bgCard, borderWidth: 1, borderColor: pressed ? "#9c44dc" : isDark ? "#3f3f46" : "#e5e7eb", shadowColor: "#9c44dc", shadowOpacity: pressed ? 0.2 : 0.08, elevation: 3, borderRadius: 12, width: "90%", paddingHorizontal: 16, paddingVertical: 12 }) as any}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#3f3f46" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="shopping-cart" size={18} color="#9c44dc" />
                  </View>
                  <Text numberOfLines={2} style={{ color: text, fontWeight: "600", flexShrink: 1, maxWidth: "70%" }}>Analise meus gastos com mercado e sugira pontos onde eu posso melhorar a alimentação.</Text>
                  <Feather name="chevron-right" size={16} color={subText} />
                </View>
              </Pressable>

              <Text style={{ color: text, fontSize: 14, lineHeight: 16, textAlign: "center", maxWidth: "80%", marginTop: 24 }}>ou digite seu texto para iniciar a conversa.</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center", width: "100%", gap: 16, paddingHorizontal: 16 }}>
              {data.map((m: ChatMessage, i: number) => {
                const ts: string = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const tokens: number = m.tokens ?? Math.ceil(String(m.text).length / 4);
                return m.type === "assistant" ? (
                  <View key={i} style={{ width: "100%", paddingHorizontal: 0, paddingVertical: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Orb size={32 as any} color="#9c44dc" testID={`orb-${i}`} />
                    <View style={{ flex: 1 }}>
                      <Markdown style={{ body: { color: text, fontSize: 15, lineHeight: 22 }, strong: { fontWeight: "700", color: isDark ? "#e9d5ff" : "#581C87" } }}>{m.text}</Markdown>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <Text style={{ color: subText, fontSize: 11 }}>{ts} • {tokens} tokens</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: isDark ? "#3f3f46" : "#e5e7eb", marginTop: 8 }} />
                    </View>
                  </View>
                ) : (
                  <View key={i} style={{ alignSelf: "flex-end", maxWidth: "75%", backgroundColor: "#a855f7", borderRadius: 16, padding: 12, marginVertical: 8, marginRight: 0 }}>
                    <Text style={{ color: "white" }}>{m.text}</Text>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 6 }}>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }}>{ts} • {tokens} tokens</Text>
                    </View>
                  </View>
                );
              })}
              {isLoading && (
                <View style={{ flexDirection: "row", gap: 4, alignItems: "center", width: "100%", paddingHorizontal: 0, paddingVertical: 12 }}>
                  <Orb size={32 as any} color="#9c44dc" testID="orb-loading" />
                                    <ShimmerWaveText
                    text="Pensando na sua solicitação..."
                    textColor={isDark ? "#ffffff" : "#000000"}
                    textStyle={{ fontSize: 13, fontWeight: "600" }}
                    containerStyle={{ marginLeft: -8, marginTop: -10 }}
                    shimmerConfig={{ duration: 2600, width: 0.8, colors: ["transparent","rgba(156,68,220,0.25)","rgba(156,68,220,0.85)","rgba(233,213,255,1)","rgba(156,68,220,0.5)","transparent"] }}
                    floatConfig={{ distance: 6, scaleAmount: 0.15 }}
                    testID="shimmer-loading"
                  />
                </View>
              )}
            </View>
          )}
          <View style={{ width: "100%", height: 24 }} />
        </ScrollView>
        {error && (
          <SolidAlert variant="danger" message={String(error)} onClose={() => setError(null)} style={{ marginHorizontal: 16, marginBottom: 8 }} testID="error-alert" />
        )}
        <View style={{ position: 'absolute', left: 28, bottom: insets.bottom + 26, zIndex: 10 }}>
          <MorphFab.Root direction="up" align="start" spacing={10} triggerColor={"#9c44dc"} color={"#9c44dc"} style={{}}>
            <MorphFab.Trigger size={32 as any} >
              <Feather name="plus" size={14} color="white" />
            </MorphFab.Trigger>
            <MorphFab.Item value="gastos" size={32 as any} onSelect={()=>{ setSelectedTool('gastos'); setInputText("Analise meus gastos e sugira pontos onde eu posso melhorar."); }}>
              <MorphFab.ItemIcon><Feather name="dollar-sign" size={12} color="white" /></MorphFab.ItemIcon>
            </MorphFab.Item>
            <MorphFab.Item value="combustivel" size={32 as any} onSelect={()=>{ setSelectedTool('combustivel'); setInputText("Analise como posso melhorar meus gastos com combustível."); }}>
              <MorphFab.ItemIcon><Feather name="droplet" size={12} color="white" /></MorphFab.ItemIcon>
            </MorphFab.Item>
            <MorphFab.Item value="mercado" size={32 as any} onSelect={()=>{ setSelectedTool('mercado'); setInputText("Analise meus gastos com mercado e sugira pontos onde eu posso melhorar a alimentação."); }}>
              <MorphFab.ItemIcon><Feather name="shopping-cart" size={12} color="white" /></MorphFab.ItemIcon>
            </MorphFab.Item>
          </MorphFab.Root>
        </View>
        <BorderBeam testID="border-beam" borderRadius={16} borderWidth={1} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{marginHorizontal:16, marginBottom: insets.bottom + 12, alignSelf:'stretch'}}>
          <View style={{backgroundColor: isDark?'#27272a':'white', borderRadius:16, padding:12, gap:12, width:'100%'}}>
            <TextInput testID="input-ask" multiline numberOfLines={4} placeholder="Digite sua pergunta aqui..." value={inputText} onChangeText={setInputText} style={{color:text, minHeight:48, maxHeight:120, textAlignVertical:'top', paddingTop:8, paddingBottom:8} as any} placeholderTextColor="#a1a1aa" editable={!isLoading} onSubmitEditing={() => { if (inputText.length > 0 && !isLoading) { setError(null); void handleAskToAi(); } }} />
            <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
              <Pressable testID="model-select" disabled={isLoading} onPress={()=>{ if(!isLoading) navigation.navigate("AIProviders"); }} style={{flexDirection:'row', alignItems:'center', gap:4, backgroundColor: isDark?'#3f3f46':'#f3e8ff', paddingHorizontal:10, paddingVertical:6, borderRadius:20, opacity: isLoading?0.5:1, marginLeft: 36, maxWidth: 110, flexShrink: 1} as any}>
                <Feather name="cpu" size={12} color="#9c44dc" />
                <Text numberOfLines={1} ellipsizeMode="tail" style={{color:text, fontSize:11, fontWeight:'600', flexShrink: 1}}>{activeLabel} ▾</Text>
              </Pressable>
              {selectedTool && (
                <Pressable onPress={()=>{ setSelectedTool(null); setInputText(""); }} style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor: '#9c44dc', borderColor: '#581C87', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, maxWidth: 90, flexShrink: 1 } as any}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: 'white', fontSize: 10, fontWeight: '700', flexShrink: 1 }}>{selectedTool==='gastos'?'Finanças':selectedTool==='combustivel'?'Combustível':'Estoque'}</Text>
                  <Feather name="x" size={10} color="white" />
                </Pressable>
              )}
              <View style={{flex:1}}/>
              <TouchableOpacity testID="btn-send" disabled={isLoading || !inputText} onPress={() => { if (inputText.length === 0) setError("Digite uma mensagem para continuar"); else { setError(null); void handleAskToAi(); } }} style={{width:36,height:36,borderRadius:18, backgroundColor: (isLoading || !inputText)?'#d1d5db':'#9c44dc', alignItems:'center', justifyContent:'center', opacity: (isLoading || !inputText)?0.6:1}}>
                {isLoading ? <ActivityIndicator color="white"/> : <Octicons name="paper-airplane" size={16} color="white"/>}
              </TouchableOpacity>
            </View>
          </View>
        </BorderBeam>
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: height * 0.9 }}>
            <View style={{ gap: 16, padding: 16, alignItems: "center" }}>
              <View testID="orb-sheet"><Orb size="md" color="#9c44dc" /></View>
              <Text style={{ color: text, textAlign: "center", fontWeight: "700", fontSize: 22 }}>Chave de api necessária</Text>
              <Text style={{ color: text, textAlign: "center" }}>Configure ao menos um provedor de IA para usar o chat. Suportamos OpenAI, Gemini, Anthropic, OpenRouter e Zen. Modelos são carregados automaticamente após salvar a chave.</Text>
              <TouchableOpacity testID="btn-go-providers" onPress={() => { setOpen(false); navigation.navigate("AIProviders"); }} style={{ backgroundColor: "#9c44dc", width: "100%", padding: 12, borderRadius: 12, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Configurar provedores</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setOpen(false); navigation.goBack(); }} style={{ borderWidth: 1, borderColor: "#9c44dc", width: "100%", padding: 12, borderRadius: 12, alignItems: "center" }}>
                <Text style={{ color: "#9c44dc", fontWeight: "700" }}>Voltar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 32, width: "100%" }} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
