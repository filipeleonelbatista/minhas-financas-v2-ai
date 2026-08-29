import { Feather, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import {
  Actionsheet,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  KeyboardAvoidingView,
  Link,
  Pressable,
  Spinner,
  Text,
  useColorModeValue,
  useTheme,
  VStack,
} from "native-base";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BackHandler } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
import LoadingDots from "react-native-loading-dots";
import Header from "../components/Header";
import Orb from "../components/ui/Orb";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useMarket } from "../hooks/useMarket";
import { usePayments } from "../hooks/usePayments";
import { useRuns } from "../hooks/useRuns";
import { buildPrompt, canSendPrompt, registerPrompt } from "../utils/prompt";
import { getProviderKey } from "../utils/secureStore";
import {
  getActiveProvider,
  getFallbackOrder,
  getProviderModel,
  chatWithFallback,
  PROVIDER_META,
} from "../utils/aiProviders";

export default function IAPage() {
  const theme = useTheme();
  const bg = useColorModeValue(
    theme.colors.warmGray[50],
    theme.colors.gray[900]
  );
  const bgCard = useColorModeValue(
    theme.colors.gray[200],
    theme.colors.gray[800]
  );
  const headerText = useColorModeValue("white", theme.colors.gray[800]);
  const text = useColorModeValue(
    theme.colors.gray[600],
    theme.colors.gray[200]
  );

  const navigation = useNavigation();

  const scrollViewRef = useRef();

  const { filteredList } = usePayments();
  const { FuelList, autonomy } = useRuns();
  const { filteredList: MarketList } = useMarket();

  const isFocused = useIsFocused();
  const [inputTextApiKey, setInputTextApiKey] = useState("");

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
      } else {
        setActiveModel(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isFocused) loadProviderInfo();
  }, [isFocused, loadProviderInfo]);

  const financesList = useMemo(() => {
    const headers =
      "valor;vencimento;data de vencimento;data de pagamento;descrição;categorias;pago";
    const data = filteredList
      .map((item) => [
        item.amount,
        new Date(item.date).toLocaleDateString("pt-BR"),
        new Date(item.paymentDate).toLocaleDateString("pt-BR"),
        item.description,
        item.category,
        item.paymentStatus ? "Pago" : "Não pago",
      ])
      .join("\n")
      .replaceAll(",", ";");

    return headers + "\n" + data;
  }, [filteredList]);

  const fuelCostsList = useMemo(() => {
    const headers =
      "valor pago;valor do litro do combustível;data de abastecimento;local do abastecimento;tipo de combustivel;Kilometragem do veiculo no abastecimento";
    const data = FuelList.map((item) => [
      item.amount,
      item.unityAmount,
      new Date(item.date).toLocaleDateString("pt-BR"),
      item.location,
      item.type,
      item.currentDistance,
    ])
      .join("\n")
      .replaceAll(",", ";");

    return (
      headers + "\n" + data + "\n\n" + "Autonomia do veículo: " + autonomy ?? 0
    );
  }, [FuelList]);

  const marketCostsList = useMemo(() => {
    const headers = "valor unitário;quantidade;produto;categoria";
    const data = MarketList.map((item) => [
      item.amount,
      item.quantity,
      item.description,
      item.category,
    ])
      .join("\n")
      .replaceAll(",", ";");

    return headers + "\n" + data;
  }, [MarketList]);

  const openaiErrorHandler = (error) => {
    const status = error?.status ?? error?.response?.status;
    switch (status) {
      case 400:
        return "Não foi possivel fazer a pesquisa. (400)";
      case 401:
        return "Chave inválida/expirada. Verifique em Provedores IA.";
      case 429:
        return "Limite atingido. Tente novamente em instantes.";
      case 500:
        return "Erro no provedor. Tentando fallback...";
      case 503:
        return "Provedor indisponível. Tentando fallback...";
      default:
        return error?.message ?? "Não foi possivel fazer a pesquisa.";
    }
  };

  const checkIfApiKeyExists = useCallback(async () => {
    // Check any provider has key
    const providers = ["openai", "gemini", "anthropic", "openrouter", "zen"];
    for (const p of providers) {
      const k = await getProviderKey(p);
      if (k) return true;
    }
    return false;
  }, []);

  const sendWithFallback = async (promptData, userPrompt) => {
    // Rate limit 3/60s
    if (!canSendPrompt()) {
      throw new Error("Muitas requisições. Aguarde 60s (limite 3/min).");
    }
    registerPrompt();

    const injected = buildPrompt(promptData, userPrompt);
    // If injection blocked, buildPrompt returns warning message itself — still send as prompt? but we treat as assistant warning
    if (injected.includes("Não posso processar instruções dentro dos dados")) {
      return injected;
    }

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
      const text = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");

      setData((prev) => [
        ...prev,
        { type: "user", text: userQ },
        { type: "assistant", text },
      ]);
      setInputText("");
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskForFuelCostsTips = async () => {
    try {
      const userQ = "De acordo com os abastecimentos que tive esse mês, o que posso melhorar para evitar gastos?";
      setInputText(userQ);
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "fuel", csv: fuelCostsList, rows: FuelList.slice(0, 50) }];
      const text = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [
        ...prev,
        { type: "user", text: userQ },
        { type: "assistant", text },
      ]);
      setInputText("");
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskForMarketCostsTips = async () => {
    try {
      const userQ = "De acordo com as compras de mercado que tive esse mês, quais gastos poderiam ser melhorados?";
      setInputText(userQ);
      setIsLoading(true);
      setError(null);
      const promptData = [{ type: "market", csv: marketCostsList, rows: MarketList.slice(0, 50) }];
      const text = await sendWithFallback(promptData, userQ + " Limite-se a 1000 caracteres.");
      setData((prev) => [
        ...prev,
        { type: "user", text: userQ },
        { type: "assistant", text },
      ]);
      setInputText("");
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskToAi = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userQ = inputText;
      // include conversation history slices + data
      const promptData = [
        { type: "finances", csv: financesList.slice(0, 4000) },
        { type: "fuel", csv: fuelCostsList.slice(0, 2000) },
        { type: "market", csv: marketCostsList.slice(0, 2000) },
        { conversation: data.slice(-6) },
      ];

      const text = await sendWithFallback(promptData, userQ);

      setData((prev) => [
        ...prev,
        { type: "user", text: userQ },
        { type: "assistant", text },
      ]);

      setInputText("");
    } catch (error) {
      setError(openaiErrorHandler(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      async function executeAsync() {
        const existsApi = await checkIfApiKeyExists();
        if (existsApi) {
          setOpen(false);
        } else {
          setOpen(true);
        }
        await loadProviderInfo();
      }
      executeAsync();
    }
  }, [isFocused, checkIfApiKeyExists, loadProviderInfo]);

  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.goBack();
        return true;
      }
    );

    return () => backHandler.remove();
  });

  const activeLabel = activeProvider ? (PROVIDER_META[activeProvider]?.label ?? activeProvider) : "Nenhum";
  const fallbackLabel = fallbackOrder.length > 0 ? fallbackOrder.map((p) => PROVIDER_META[p]?.label ?? p).join(" → ") : "—";

  return (
    <KeyboardAvoidingView flex={1}>
      <VStack flex={1} bg={bg} position="relative">
        <Header
          isShort
          isLeft
          title="Conversa"
          isLeftIconComponent={
            <IconButton
              size={10}
              borderRadius="full"
              icon={<Feather name="arrow-left" size={20} color={headerText} />}
              onPress={() => navigation.goBack()}
              _pressed={{
                bgColor: theme.colors.purple[900],
              }}
            />
          }
        />
        {/* ORB header */}
        <VStack alignItems="center" mt={-8} mb={2} space={2}>
          <Orb size="lg" color="#9c44dc" testID="orb-header" />
          <Text color={text} fontSize={12} textAlign="center">
            Ativo: <Text bold color="purple.600">{activeLabel}</Text>{activeModel ? ` • ${activeModel}` : ""} {"\n"}
            Fallback: <Text color={text}>{fallbackLabel}</Text>
          </Text>
          <Pressable testID="btn-manage-providers" onPress={() => navigation.navigate("AIProviders")} _pressed={{ opacity: 0.6 }}>
            <Text color="purple.600" fontSize={12} underline>Mudar provider/modelo</Text>
          </Pressable>
        </VStack>
        <ScrollView
          ref={scrollViewRef}
          nestedScrollEnabled={true}
          onContentSizeChange={(contentWidth, contentHeight) => {
            scrollViewRef.current?.scrollTo({ y: contentHeight });
          }}
          flex={1}
          w={"100%"}
          h={"100%"}
        >
          {data.length === 0 && !isLoading ? (
            <VStack
              w={"100%"}
              space={4}
              px={4}
              alignItems={"center"}
              justifyContent={"center"}
              flex={1}
              mt={4}
            >
              <Text
                color={text}
                fontSize={18}
                lineHeight={24}
                textAlign="center"
                maxW="80%"
                my={4}
              >
                Converse com um assistente baseado em Inteligência Artificial.
              </Text>

              <Pressable
                bgColor={bgCard}
                shadow={2}
                borderRadius={4}
                w={"90%"}
                px={4}
                py={2}
                onPress={handleAskForFinancialTips}
                testID="btn-financial-tips"
                _pressed={{
                  bgColor: "gray.300",
                }}
              >
                <HStack position={"relative"} alignItems="center" space={4}>
                  <Feather name={"dollar-sign"} size={20} color={text} />
                  <Text color={text} maxW={"90%"}>
                    Analise meus gastos e sugira pontos onde eu posso melhorar.
                  </Text>
                </HStack>
              </Pressable>

              <Pressable
                bgColor={bgCard}
                shadow={2}
                borderRadius={4}
                w={"90%"}
                px={4}
                py={2}
                onPress={handleAskForFuelCostsTips}
                testID="btn-fuel-tips"
                _pressed={{
                  bgColor: "gray.300",
                }}
              >
                <HStack position={"relative"} alignItems="center" space={4}>
                  <Feather name={"droplet"} size={20} color={text} />
                  <Text color={text} maxW={"90%"}>
                    Analise como posso melhorar meus gastos com combustível.
                  </Text>
                </HStack>
              </Pressable>

              <Pressable
                bgColor={bgCard}
                shadow={2}
                borderRadius={4}
                w={"90%"}
                px={4}
                py={2}
                onPress={handleAskForMarketCostsTips}
                testID="btn-market-tips"
                _pressed={{
                  bgColor: "gray.300",
                }}
              >
                <HStack position={"relative"} alignItems="center" space={4}>
                  <Feather name={"shopping-cart"} size={20} color={text} />
                  <Text color={text} maxW={"90%"}>
                    Analise meus gastos com mercado e sugira pontos onde eu
                    posso melhorar a alimentação.
                  </Text>
                </HStack>
              </Pressable>

              <Text
                color={text}
                fontSize={14}
                lineHeight={16}
                textAlign="center"
                maxW="80%"
                mt={6}
              >
                ou digite seu texto para iniciar a conversa.
              </Text>
            </VStack>
          ) : (
            <VStack
              alignItems={"center"}
              justifyContent="center"
              w={"100%"}
              space={4}
            >
              {data.map((mensagem, index) => (
                <HStack
                  key={index}
                  space={4}
                  my={2}
                  w={"100%"}
                  px={4}
                  flexDirection={
                    mensagem.type === "user" ? "row" : "row-reverse"
                  }
                  justifyContent={"flex-end"}
                >
                  <Box
                    w={"75%"}
                    px={4}
                    py={2}
                    bgColor={mensagem.type === "user" ? "purple.500" : bgCard}
                    shadow={2}
                    borderRadius={4}
                    position={"relative"}
                  >
                    <Text color={mensagem.type === "user" ? "white" : text}>
                      {mensagem.text}
                    </Text>
                  </Box>
                  <Box
                    w={10}
                    h={10}
                    borderRadius={"full"}
                    alignItems="center"
                    justifyContent="center"
                    shadow={2}
                    bgColor={theme.colors.purple[300]}
                  >
                    <MaterialCommunityIcons
                      name={
                        mensagem.type === "user" ? "account" : "robot-outline"
                      }
                      size={20}
                      color={headerText}
                    />
                  </Box>
                </HStack>
              ))}
              {isLoading && (
                <>
                  <HStack
                    space={4}
                    my={2}
                    w={"100%"}
                    px={4}
                    flexDirection={"row"}
                    justifyContent={"flex-end"}
                  >
                    <Box
                      w={"75%"}
                      px={4}
                      py={2}
                      bgColor={"purple.500"}
                      shadow={2}
                      borderRadius={4}
                      position={"relative"}
                    >
                      <Text color={"white"}>{inputText}</Text>
                    </Box>
                    <Box
                      w={10}
                      h={10}
                      borderRadius={"full"}
                      alignItems="center"
                      justifyContent="center"
                      shadow={2}
                      bgColor={theme.colors.purple[300]}
                    >
                      <MaterialCommunityIcons
                        name={"account"}
                        size={20}
                        color={headerText}
                      />
                    </Box>
                  </HStack>

                  <HStack
                    space={4}
                    my={2}
                    w={"100%"}
                    px={4}
                    flexDirection={"row-reverse"}
                    justifyContent={"flex-end"}
                  >
                    <Box
                      px={4}
                      py={2}
                      bgColor={bgCard}
                      shadow={2}
                      borderRadius={4}
                      position={"relative"}
                    >
                      <Text color={"white"}>
                        <LoadingDots
                          dots={3}
                          colors={[text, text, text]}
                          size={8}
                          bounceHeight={3}
                        />
                      </Text>
                    </Box>
                    <Box
                      w={10}
                      h={10}
                      borderRadius={"full"}
                      alignItems="center"
                      justifyContent="center"
                      shadow={2}
                      bgColor={theme.colors.purple[300]}
                    >
                      <MaterialCommunityIcons
                        name={"robot-outline"}
                        size={20}
                        color={headerText}
                      />
                    </Box>
                  </HStack>
                </>
              )}
            </VStack>
          )}

          <Box w={"100%"} h={92} />
        </ScrollView>
        <VStack
          bg={bg}
          shadow={4}
          space={1}
          position="absolute"
          bottom={0}
          w={"100%"}
          px={4}
          py={4}
        >
          {isLoading && (
            <HStack space={2} pl={2}>
              <LoadingDots
                dots={3}
                colors={[text, text, text]}
                size={8}
                bounceHeight={3}
              />
              <Text color={text} fontSize={12}>
                Estou digitando...
              </Text>
            </HStack>
          )}
          <HStack space={2}>
            <Input
              flex={1}
              placeholder="Digite sua pergunta aqui..."
              onChangeText={(text) => {
                setInputText(text);
              }}
              value={inputText}
              testID="input-ask"
            />
            <IconButton
              w={12}
              bg={theme.colors.purple[600]}
              testID="btn-send"
              onPress={() => {
                if (inputText.length === 0) {
                  setError("Digite uma mensagem para continuar");
                } else {
                  setError(null);
                  handleAskToAi();
                }
              }}
              icon={
                <Octicons name="paper-airplane" size={20} color={headerText} />
              }
              _pressed={{
                bgColor: "purple.900",
              }}
            />
          </HStack>
          {error && (
            <Text color="red.500" testID="error-text">
              <Feather name="alert-circle" size={14} /> {error}
            </Text>
          )}
        </VStack>
      </VStack>

      <Actionsheet
        isOpen={open}
        onClose={() => setOpen(false)}
        size="full"
        h={height * (isKeyboardOpen ? 0.9 : 1.09)}
      >
        <Actionsheet.Content pb={isKeyboardOpen ? 24 : 0}>
          <VStack space={4} p={4} alignItems="center">
            <Box testID="orb-sheet">
              <Orb size="md" color="#9c44dc" />
            </Box>
            <Text color={text} textAlign="center" bold fontSize={22}>
              Chave de api necessária
            </Text>
            <Text color={text} textAlign="center">
              Configure ao menos um provedor de IA para usar o chat. Suportamos OpenAI, Gemini, Anthropic, OpenRouter e Zen. Modelos são carregados automaticamente após salvar a chave.
            </Text>
            <Button
              testID="btn-go-providers"
              onPress={() => {
                setOpen(false);
                navigation.navigate("AIProviders");
              }}
              colorScheme="purple"
              w="100%"
              _text={{ color: "white" }}
              _pressed={{ bgColor: theme.colors.purple[900] }}
            >
              Configurar provedores
            </Button>
            <Button
              onPress={() => {
                setOpen(false);
                navigation.goBack();
              }}
              borderColor="purple.600"
              variant={"outline"}
              w="100%"
              _text={{ color: "purple.600" }}
              _pressed={{ bgColor: theme.colors.purple[900] }}
            >
              Voltar
            </Button>
          </VStack>
          <Box h={16} w={"100%"} />
        </Actionsheet.Content>
      </Actionsheet>
    </KeyboardAvoidingView>
  );
}
