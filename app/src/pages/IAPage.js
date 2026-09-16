import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, ActivityIndicator, Modal, useWindowDimensions, KeyboardAvoidingView, BackHandler, Platform } from "react-native";
import { Feather, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import LoadingDots from "react-native-loading-dots";
import Header from "../components/Header";
import Orb from "../components/ui/Orb";
import { BorderBeam } from "../components/ui/border-beam";
import { ShimmerWaveText } from "../components/ui/shimmer-wave-text/index";
import SolidAlert from "../components/ui/SolidAlert";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { useFinanceStore } from "../stores/finance";
import { useRunsStore } from "../stores/runs";
import { useMarketStore } from "../stores/market";
import { useGoalsStore } from "../stores/goals";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { buildPrompt, canSendPrompt, registerPrompt } from "../utils/prompt";
import { getProviderKey } from "../utils/secureStore";
import { getActiveProvider, getFallbackOrder, getProviderModel, chatWithFallback, PROVIDER_META } from "../utils/aiProviders";
import { useShallow } from "zustand/react/shallow";

export default function IAPage() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#e5e7eb";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";

  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  // stable selectors with shallow to avoid new array each render -> max depth
  const filteredList = useFinanceStore(useShallow((s) => s.getFilteredList()));
  const FuelList = useRunsStore((s) => s.runsList);
  const MarketList = useMarketStore((s) => s.stockList);
  const GoalsList = useGoalsStore((s) => s.goals);
  const ListsList = useListsStore((s) => s.lists ?? []);
  const stockList = MarketList; // alias
  const veicleAutonomy = useSettingsStore((s) => s.veicleAutonomy);
  const tithePercent = useSettingsStore((s) => s.tithePercent);
  const titheCategories = useSettingsStore((s) => s.titheCategories);

  const isFocused = useIsFocused();
  const isKeyboardOpen = useIsKeyboardOpen();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [fallbackOrder, setFallbackOrder] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const prevModelRef = useRef(null);

  const loadProviderInfo = useCallback(async () => {
    try {
      const ap = await getActiveProvider();
      const fo = await getFallbackOrder();
      setActiveProvider(ap);
      setFallbackOrder(fo ?? []);
      if (ap) {
        const m = await getProviderModel(ap);
        setActiveModel(m);
      } else setActiveModel(null);
    } catch {}
  }, []);

  const checkIfApiKeyExists = useCallback(async () => {
    const providers = ["openai", "gemini", "anthropic", "openrouter", "zen"];
    for (const p of providers) {
      const k = await getProviderKey(p);
      if (k) return true;
    }
    return false;
  }, []);

  // load provider info only on focus change, not on every render
  useEffect(() => {
    let mounted = true;
    if (isFocused) {
      (async () => {
        const existsApi = await checkIfApiKeyExists();
        if (mounted) setOpen(!existsApi);
        await loadProviderInfo();
      })();
    }
    return () => { mounted = false; };
  }, [isFocused, checkIfApiKeyExists, loadProviderInfo]);

  // reenvia conversa como contexto ao trocar modelo no meio da conversa
  useEffect(() => {
    if (!isFocused) return;
    if (data.length === 0) return;
    if (isLoading) return;
    const cur = `${activeProvider}:${activeModel}`;
    const prev = prevModelRef.current;
    if (!prev || prev === cur) { prevModelRef.current = cur; return; }
    prevModelRef.current = cur;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userQ = `Continue a conversa considerando o histórico anterior.`;
        const promptData = [{ type: "appContext", context: appContext }, { type: "conversation", messages: data }];
        const textRes = await sendWithFallback(promptData, userQ);
        if (!cancelled) setData((prevD) => [...prevD, { type: "assistant", text: `🔄 Modelo alterado para ${activeLabel}${activeModel?` • ${activeModel}`:''}\n\n${textRes}`, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
      } catch (e) {
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
        try { scrollViewRef.current?.scrollToEnd({ animated: true }); } catch {}
      }, 100);
      return () => clearTimeout(t);
    }
  }, [data]);

  // Memoized CSVs - stable slices to avoid recompute loop
  const financesList = useMemo(() => {
    const headers = "valor;vencimento;data de pagamento;descrição;categorias;pago;favorito";
    const rows = filteredList.slice(0, 80).map((item) => [item.amount, new Date(Number(item.date)).toLocaleDateString("pt-BR"), item.paymentDate ? new Date(Number(item.paymentDate)).toLocaleDateString("pt-BR") : "", String(item.description ?? "").replace(/;/g, ","), String(item.category ?? ""), item.paymentStatus ? "Pago" : "Não pago", item.isFavorited ? "Fav" : ""].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [filteredList]);

  const fuelCostsList = useMemo(() => {
    const headers = "valor pago;valor do litro;data;local;tipo;km";
    const rows = FuelList.slice(0, 30).map((item) => [item.amount, item.unityAmount, new Date(Number(item.date)).toLocaleDateString("pt-BR"), String(item.location ?? ""), String(item.type ?? ""), item.currentDistance].join(";"));
    return headers + "\n" + rows.join("\n") + "\n\nAutonomia: " + (veicleAutonomy ?? 0);
  }, [FuelList, veicleAutonomy]);

  const marketCostsList = useMemo(() => {
    const headers = "valor unitario;quantidade;produto;categoria;total";
    const rows = MarketList.slice(0, 60).map((item) => [item.amount, item.quantity, String(item.description ?? ""), String(item.category ?? ""), Number(item.amount) * Number(item.quantity)].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [MarketList]);

  const goalsList = useMemo(() => {
    const headers = "descricao;valor meta;valor atual;percentual;categoria;data prazo";
    const rows = GoalsList.slice(0, 30).map((g) => [String(g.description ?? ""), g.amount, g.currentAmount, Math.round((Number(g.currentAmount)/Number(g.amount||1))*100)+"%", String(g.category ?? ""), g.date ? new Date(Number(g.date)).toLocaleDateString("pt-BR") : ""].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [GoalsList]);

  const listsList = useMemo(() => {
    if (!ListsList || ListsList.length === 0) return "sem listas";
    const headers = "descricao;local;quantidade;valor";
    const rows = ListsList.slice(0, 20).map((l) => [String(l.description ?? ""), String(l.location ?? ""), l.quantity, l.amount].join(";"));
    return headers + "\n" + rows.join("\n");
  }, [ListsList]);

  // Full app context for IA
  const appContext = useMemo(() => {
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

  const openaiErrorHandler = (error) => {
    const status = error?.status ?? error?.response?.status;
    switch (status) {
      case 400: return "Não foi possivel fazer a pesquisa. (400)";
      case 401: return "Chave inválida/expirada. Verifique em Provedores IA.";
      case 429: return "Limite atingido. Tente novamente em instantes.";
      case 500: return "Erro no provedor. Tentando fallback...";
      case 503: return "Provedor indisponível. Tentando fallback...";
      default: return error?.message ?? "Não foi possivel fazer a pesquisa.";
    }
  };

  const sendWithFallback = async (promptData, userPrompt) => {
    if (!canSendPrompt()) throw new Error("Muitas requisições. Aguarde 60s (limite 3/min).");
    registerPrompt();
    // promptData is array of context chunks, but we now use appContext object
    const injected = buildPrompt(promptData, userPrompt);
    if (injected.includes("Não posso processar instruções dentro dos dados")) return injected;
    const result = await chatWithFallback(injected);
    return result.text;
  };

  const handleAskForFinancialTips = async () => {
    try {
      const userQ = "De acordo com os gastos que tive esse mês, quais gastos poderiam ser melhorados?";
      const now = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "appContext", context: appContext }, { type: "question", question: userQ }, { type: "financesFocused", csv: financesList, rows: filteredList.slice(0, 50) }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally { setIsLoading(false); }
  };
  const handleAskForFuelCostsTips = async () => {
    try {
      const userQ = "De acordo com os abastecimentos que tive esse mês, o que posso melhorar para evitar gastos?";
      const now = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "appContext", context: appContext }, { type: "fuelFocused", csv: fuelCostsList, rows: FuelList.slice(0, 30) }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskForMarketCostsTips = async () => {
    try {
      const userQ = "De acordo com as compras de mercado que tive esse mês, quais gastos poderiam ser melhorados?";
      const now = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "appContext", context: appContext }, { type: "marketFocused", csv: marketCostsList, rows: MarketList.slice(0, 50) }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskToAi = async () => {
    try {
      const userQ = inputText;
      const now = Date.now();
      setData((prev) => [...prev, { type: "user", text: userQ, ts: now, tokens: Math.ceil(userQ.length/4) }]);
      setInputText("");
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "appContext", context: appContext }, { type: "conversation", messages: data.slice(-6) }];
      const textRes = await sendWithFallback(promptData, userQ);
      setData((prev) => [...prev, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length/4) }]);
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };

  const activeLabel = activeProvider ? (PROVIDER_META[activeProvider]?.label ?? activeProvider) : "Nenhum";
  const fallbackLabel = fallbackOrder.length > 0 ? fallbackOrder.map((p) => PROVIDER_META[p]?.label ?? p).join(" → ") : "—";

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
              Ativo: <Text style={{ fontWeight: "700", color: "#9c44dc" }}>{activeLabel}</Text>{activeModel ? ` • ${activeModel}` : ""} {"\n"}
              Fallback: <Text style={{ color: text }}>{fallbackLabel}</Text>
            </Text>
            <Pressable testID="btn-manage-providers" onPress={() => navigation.navigate("AIProviders")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: "#9c44dc", fontSize: 12, textDecorationLine: "underline" }}>Mudar provider/modelo</Text>
            </Pressable>
            <View style={{ backgroundColor: isDark ? "#27272a" : "white", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e5e7eb", marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: subText, textAlign: "center" }}>Contexto: {filteredList.length} finanças • {FuelList.length} abastecimentos • {MarketList.length} estoque • {GoalsList.length} metas • {ListsList.length} listas</Text>
            </View>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {data.length === 0 && !isLoading ? (
            <View style={{ width: "100%", gap: 16, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", flex: 1, marginTop: 16 }}>
              <Text style={{ color: text, fontSize: 18, lineHeight: 24, textAlign: "center", maxWidth: "80%", marginVertical: 16 }}>Converse com um assistente baseado em Inteligência Artificial.</Text>

              <Pressable onPress={handleAskForFinancialTips} testID="btn-financial-tips" style={({ pressed }) => ({ backgroundColor: pressed ? "#d1d5db" : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, width: "90%", paddingHorizontal: 16, paddingVertical: 8 })}>
                <View style={{ position: "relative", flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Feather name="dollar-sign" size={20} color={text} />
                  <Text style={{ color: text, maxWidth: "90%" }}>Analise meus gastos e sugira pontos onde eu posso melhorar.</Text>
                </View>
              </Pressable>

              <Pressable onPress={handleAskForFuelCostsTips} testID="btn-fuel-tips" style={({ pressed }) => ({ backgroundColor: pressed ? "#d1d5db" : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, width: "90%", paddingHorizontal: 16, paddingVertical: 8 })}>
                <View style={{ position: "relative", flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Feather name="droplet" size={20} color={text} />
                  <Text style={{ color: text, maxWidth: "90%" }}>Analise como posso melhorar meus gastos com combustível.</Text>
                </View>
              </Pressable>

              <Pressable onPress={handleAskForMarketCostsTips} testID="btn-market-tips" style={({ pressed }) => ({ backgroundColor: pressed ? "#d1d5db" : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, width: "90%", paddingHorizontal: 16, paddingVertical: 8 })}>
                <View style={{ position: "relative", flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Feather name="shopping-cart" size={20} color={text} />
                  <Text style={{ color: text, maxWidth: "90%" }}>Analise meus gastos com mercado e sugira pontos onde eu posso melhorar a alimentação.</Text>
                </View>
              </Pressable>

              <Text style={{ color: text, fontSize: 14, lineHeight: 16, textAlign: "center", maxWidth: "80%", marginTop: 24 }}>ou digite seu texto para iniciar a conversa.</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center", width: "100%", gap: 16, paddingHorizontal: 16 }}>
              {data.map((m, i) => {
                const ts = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const tokens = m.tokens ?? Math.ceil(String(m.text).length / 4);
                return m.type === "assistant" ? (
                  <View key={i} style={{ width: "100%", paddingHorizontal: 0, paddingVertical: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Orb size={32} color="#9c44dc" testID={`orb-${i}`} />
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
                  <Orb size={32} color="#9c44dc" testID="orb-loading" />
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
        <BorderBeam testID="border-beam" borderRadius={16} borderWidth={1} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{marginHorizontal:16, marginBottom: insets.bottom + 12, alignSelf:'stretch'}}>
          <View style={{backgroundColor: isDark?'#27272a':'white', borderRadius:16, padding:12, gap:12, width:'100%'}}>
            <TextInput testID="input-ask" multiline numberOfLines={4} placeholder="Digite sua pergunta aqui..." value={inputText} onChangeText={setInputText} style={{color:text, minHeight:48, maxHeight:120, textAlignVertical:'top', paddingTop:8, paddingBottom:8}} placeholderTextColor="#a1a1aa" editable={!isLoading} onSubmitEditing={() => { if (inputText.length > 0 && !isLoading) { setError(null); handleAskToAi(); } }} />
            <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
              <Pressable testID="model-select" disabled={isLoading} onPress={()=>{ if(!isLoading) navigation.navigate("AIProviders"); }} style={{flexDirection:'row', alignItems:'center', gap:6, backgroundColor: isDark?'#3f3f46':'#f3e8ff', paddingHorizontal:12, paddingVertical:8, borderRadius:20, opacity: isLoading?0.5:1}}>
                <Feather name="cpu" size={14} color="#9c44dc" />
                <Text style={{color:text, fontSize:12, fontWeight:'600'}}>{activeLabel}{activeModel?` • ${activeModel}`:''} ▾</Text>
              </Pressable>
              <View style={{flex:1}}/>
              <TouchableOpacity testID="btn-send" disabled={isLoading || !inputText} onPress={() => { if (inputText.length === 0) setError("Digite uma mensagem para continuar"); else { setError(null); handleAskToAi(); } }} style={{width:36,height:36,borderRadius:18, backgroundColor: (isLoading || !inputText)?'#d1d5db':'#9c44dc', alignItems:'center', justifyContent:'center', opacity: (isLoading || !inputText)?0.6:1}}>
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
