import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, ActivityIndicator, Modal, useWindowDimensions, KeyboardAvoidingView, BackHandler } from "react-native";
import { Feather, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import LoadingDots from "react-native-loading-dots";
import Header from "../components/Header";
import Orb from "../components/ui/Orb";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useFinanceStore } from "../stores/finance";
import { useRunsStore } from "../stores/runs";
import { useMarketStore } from "../stores/market";
import { useSettingsStore } from "../stores/settings";
import { buildPrompt, canSendPrompt, registerPrompt } from "../utils/prompt";
import { getProviderKey } from "../utils/secureStore";
import { getActiveProvider, getFallbackOrder, getProviderModel, chatWithFallback, PROVIDER_META } from "../utils/aiProviders";

export default function IAPage() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#e5e7eb";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const navigation = useNavigation();
  const scrollViewRef = useRef();

  const filteredList = useFinanceStore((s) => s.getFilteredList());
  const FuelList = useRunsStore((s) => s.runsList);
  const veicleAutonomy = useSettingsStore((s) => s.veicleAutonomy);
  const MarketList = useMarketStore((s) => s.stockList);

  const isFocused = useIsFocused();
  const isKeyboardOpen = useIsKeyboardOpen();
  const { height } = useWindowDimensions();

  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [fallbackOrder, setFallbackOrder] = useState([]);

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

  useEffect(() => {
    if (isFocused) loadProviderInfo();
  }, [isFocused, loadProviderInfo]);

  const financesList = useMemo(() => {
    const headers = "valor;vencimento;data de vencimento;data de pagamento;descrição;categorias;pago";
    const dataStr = filteredList.map((item) => [item.amount, new Date(item.date).toLocaleDateString("pt-BR"), new Date(item.paymentDate).toLocaleDateString("pt-BR"), item.description, item.category, item.paymentStatus ? "Pago" : "Não pago"]).join("\n").replaceAll(",", ";");
    return headers + "\n" + dataStr;
  }, [filteredList]);

  const fuelCostsList = useMemo(() => {
    const headers = "valor pago;valor do litro do combustível;data de abastecimento;local do abastecimento;tipo de combustivel;Kilometragem do veiculo no abastecimento";
    const dataStr = FuelList.map((item) => [item.amount, item.unityAmount, new Date(item.date).toLocaleDateString("pt-BR"), item.location, item.type, item.currentDistance]).join("\n").replaceAll(",", ";");
    return headers + "\n" + dataStr + "\n\n" + "Autonomia do veículo: " + (veicleAutonomy ?? 0);
  }, [FuelList, veicleAutonomy]);

  const marketCostsList = useMemo(() => {
    const headers = "valor unitário;quantidade;produto;categoria";
    const dataStr = MarketList.map((item) => [item.amount, item.quantity, item.description, item.category]).join("\n").replaceAll(",", ";");
    return headers + "\n" + dataStr;
  }, [MarketList]);

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

  const checkIfApiKeyExists = useCallback(async () => {
    const providers = ["openai", "gemini", "anthropic", "openrouter", "zen"];
    for (const p of providers) {
      const k = await getProviderKey(p);
      if (k) return true;
    }
    return false;
  }, []);

  const sendWithFallback = async (promptData, userPrompt) => {
    if (!canSendPrompt()) throw new Error("Muitas requisições. Aguarde 60s (limite 3/min).");
    registerPrompt();
    const injected = buildPrompt(promptData, userPrompt);
    if (injected.includes("Não posso processar instruções dentro dos dados")) return injected;
    const result = await chatWithFallback(injected);
    return result.text;
  };

  const handleAskForFinancialTips = async () => {
    try {
      const userQ = "De acordo com os gastos que tive esse mês, quais gastos poderiam ser melhorados?";
      setInputText(userQ);
      setIsLoading(true);
      setError(null);
      const dataSlice = filteredList.slice(0, 50);
      const promptData = [{ type: "finances", csv: financesList, rows: dataSlice }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "user", text: userQ }, { type: "assistant", text: textRes }]);
      setInputText("");
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally { setIsLoading(false); }
  };
  const handleAskForFuelCostsTips = async () => {
    try {
      const userQ = "De acordo com os abastecimentos que tive esse mês, o que posso melhorar para evitar gastos?";
      setInputText(userQ);
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "fuel", csv: fuelCostsList, rows: FuelList.slice(0, 50) }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "user", text: userQ }, { type: "assistant", text: textRes }]);
      setInputText("");
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskForMarketCostsTips = async () => {
    try {
      const userQ = "De acordo com as compras de mercado que tive esse mês, quais gastos poderiam ser melhorados?";
      setInputText(userQ);
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "market", csv: marketCostsList, rows: MarketList.slice(0, 50) }];
      const textRes = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [...prev, { type: "user", text: userQ }, { type: "assistant", text: textRes }]);
      setInputText("");
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };
  const handleAskToAi = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userQ = inputText;
      const promptData = [{ type: "finances", csv: financesList.slice(0, 4000) }, { type: "fuel", csv: fuelCostsList.slice(0, 2000) }, { type: "market", csv: marketCostsList.slice(0, 2000) }, { conversation: data.slice(-6) }];
      const textRes = await sendWithFallback(promptData, userQ);
      setData((prev) => [...prev, { type: "user", text: userQ }, { type: "assistant", text: textRes }]);
      setInputText("");
    } catch (error) { setError(openaiErrorHandler(error)); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (isFocused) {
      async function executeAsync() {
        const existsApi = await checkIfApiKeyExists();
        if (existsApi) setOpen(false); else setOpen(true);
        await loadProviderInfo();
      }
      executeAsync();
    }
  }, [isFocused, checkIfApiKeyExists, loadProviderInfo]);

  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => { navigation.goBack(); return true; });
    return () => backHandler.remove();
  });

  const activeLabel = activeProvider ? (PROVIDER_META[activeProvider]?.label ?? activeProvider) : "Nenhum";
  const fallbackLabel = fallbackOrder.length > 0 ? fallbackOrder.map((p) => PROVIDER_META[p]?.label ?? p).join(" → ") : "—";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: bg, position: "relative" }} className="flex-1 bg-gray-50 dark:bg-gray-900">
        <Header
          isShort
          isLeft
          title="Conversa"
          isLeftIconComponent={
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="arrow-left" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />
        <View style={{ alignItems: "center", marginTop: -8, marginBottom: 8, gap: 8 }}>
          <Orb size="lg" color="#9c44dc" testID="orb-header" />
          <Text style={{ color: text, fontSize: 12, textAlign: "center" }}>
            Ativo: <Text style={{ fontWeight: "700", color: "#9c44dc" }}>{activeLabel}</Text>{activeModel ? ` • ${activeModel}` : ""} {"\n"}
            Fallback: <Text style={{ color: text }}>{fallbackLabel}</Text>
          </Text>
          <Pressable testID="btn-manage-providers" onPress={() => navigation.navigate("AIProviders")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: "#9c44dc", fontSize: 12, textDecorationLine: "underline" }}>Mudar provider/modelo</Text>
          </Pressable>
        </View>
        <ScrollView
          ref={scrollViewRef}
          nestedScrollEnabled={true}
          onContentSizeChange={(cw, ch) => { scrollViewRef.current?.scrollTo({ y: ch }); }}
          style={{ flex: 1, width: "100%", height: "100%" }}
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
            <View style={{ alignItems: "center", justifyContent: "center", width: "100%", gap: 16 }}>
              {data.map((mensagem, index) => (
                <View key={index} style={{ flexDirection: mensagem.type === "user" ? "row" : "row-reverse", gap: 16, marginVertical: 8, width: "100%", paddingHorizontal: 16, justifyContent: "flex-end" }}>
                  <View style={{ width: "75%", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: mensagem.type === "user" ? "#a855f7" : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4 }}>
                    <Text style={{ color: mensagem.type === "user" ? "white" : text }}>{mensagem.text}</Text>
                  </View>
                  <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 2, backgroundColor: "#d8b4fe" }}>
                    <MaterialCommunityIcons name={mensagem.type === "user" ? "account" : "robot-outline"} size={20} color={headerText} />
                  </View>
                </View>
              ))}
              {isLoading && (
                <>
                  <View style={{ flexDirection: "row", gap: 16, marginVertical: 8, width: "100%", paddingHorizontal: 16, justifyContent: "flex-end" }}>
                    <View style={{ width: "75%", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#a855f7", shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4 }}>
                      <Text style={{ color: "white" }}>{inputText}</Text>
                    </View>
                    <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 2, backgroundColor: "#d8b4fe" }}>
                      <MaterialCommunityIcons name="account" size={20} color={headerText} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 16, marginVertical: 8, width: "100%", paddingHorizontal: 16, justifyContent: "flex-end", flexDirection: "row-reverse" }}>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4 }}>
                      <Text style={{ color: "white" }}>
                        <LoadingDots dots={3} colors={[text, text, text]} size={8} bounceHeight={3} />
                      </Text>
                    </View>
                    <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 2, backgroundColor: "#d8b4fe" }}>
                      <MaterialCommunityIcons name="robot-outline" size={20} color={headerText} />
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
          <View style={{ width: "100%", height: 92 }} />
        </ScrollView>
        <View style={{ backgroundColor: bg, shadowColor: "#000", shadowOpacity: 0.1, elevation: 4, gap: 4, position: "absolute", bottom: 0, width: "100%", paddingHorizontal: 16, paddingVertical: 16 }}>
          {isLoading && (
            <View style={{ flexDirection: "row", gap: 8, paddingLeft: 8 }}>
              <LoadingDots dots={3} colors={[text, text, text]} size={8} bounceHeight={3} />
              <Text style={{ color: text, fontSize: 12 }}>Estou digitando...</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              placeholder="Digite sua pergunta aqui..."
              onChangeText={(t) => setInputText(t)}
              value={inputText}
              testID="input-ask"
              style={{ flex: 1, borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, color: text }}
              placeholderTextColor="#a1a1aa"
            />
            <TouchableOpacity
              testID="btn-send"
              onPress={() => {
                if (inputText.length === 0) setError("Digite uma mensagem para continuar");
                else { setError(null); handleAskToAi(); }
              }}
              style={{ width: 48, backgroundColor: "#9c44dc", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
            >
              <Octicons name="paper-airplane" size={20} color={headerText} />
            </TouchableOpacity>
          </View>
          {error && <Text style={{ color: "#ef4444" }} testID="error-text"><Feather name="alert-circle" size={14} /> {error}</Text>}
        </View>
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: height * 0.9 }}>
            <View style={{ gap: 16, padding: 16, alignItems: "center" }}>
              <View testID="orb-sheet"><Orb size="md" color="#9c44dc" /></View>
              <Text style={{ color: text, textAlign: "center", fontWeight: "700", fontSize: 22 }}>Chave de api necessária</Text>
              <Text style={{ color: text, textAlign: "center" }}>Configure ao menos um provedor de IA para usar o chat. Suportamos OpenAI, Gemini, Anthropic, OpenRouter e Zen. Modelos são carregados automaticamente após salvar a chave.</Text>
              <TouchableOpacity testID="btn-go-providers" onPress={() => { setOpen(false); navigation.navigate("AIProviders"); }} style={{ backgroundColor: "#9c44dc", width: "100%", padding: 12, borderRadius: 8, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Configurar provedores</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setOpen(false); navigation.goBack(); }} style={{ borderWidth: 1, borderColor: "#9c44dc", width: "100%", padding: 12, borderRadius: 8, alignItems: "center" }}>
                <Text style={{ color: "#9c44dc", fontWeight: "700" }}>Voltar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 64, width: "100%" }} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
