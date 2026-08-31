import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSettingsStore } from "../stores/settings";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Switch,
  ToastAndroid,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as DocumentPicker from "expo-document-picker";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { jsonToCSV, readString } from "react-native-csv";
import userImg from "../assets/icon.png";
import Header from "../components/Header";
import { useFinanceStore } from "../stores/finance";
import { useRunsStore } from "../stores/runs";
import { useMarketStore } from "../stores/market";
import { useListsStore } from "../stores/lists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { financeRepo } from "../repositories/finance";
import { marketRepo } from "../repositories/market";
import { listRepo } from "../repositories/list";
import { runRepo } from "../repositories/run";

export default function AboutUs() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const colorMode = colorModeState;
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const theme = {
    colors: {
      warmGray: { 50: "#f5f5f4" },
      gray: { 200: "#e4e4e7", 400: "#a1a1aa", 600: "#52525b", 800: "#27272a", 900: "#1c1e21" },
      purple: { 600: "#9c44dc", 900: "#581c87" },
      green: { 500: "#22c55e", 600: "#16a34a" },
      red: { 500: "#ef4444", 600: "#dc2626" },
      yellow: { 400: "#facc15" },
      white: "#fff",
    },
  };
  const navigation = useNavigation();
  const toggleColorMode = useSettingsStore((s) => s.toggleColorMode);
  const handleToggleTheme = toggleColorMode;
  // map settings store booleans and handlers
  const s = useSettingsStore();
  const isEnableTitheCard = !!s.isEnableTitheCard;
  const handleSwitchViewTitheCard = (v) => s.update('isEnableTitheCard', v ? 1 : 0);
  const willAddFuelToTransactionList = !!s.willAddFuelToTransactionList;
  const handleToggleWillAddFuel = (v) => s.update('willAddFuelToTransactionList', v ? 1 : 0);
  const willUsePrefixToRemoveTihteSum = !!s.willUsePrefixToRemoveTihteSum;
  const handleWillRemovePrefixToRemove = (v) => s.update('willUsePrefixToRemoveTihteSum', v ? 1 : 0);
  const prefixTithe = s.prefixTithe;
  const handleSetPrefixTithe = (v) => s.update('prefixTithe', v);
  const isEnableTotalHistoryCard = !!s.isEnableTotalHistoryCard;
  const handleSwitchViewTotalHistoryCard = (v) => s.update('isEnableTotalHistoryCard', v ? 1 : 0);
  const simpleFinancesItem = !!s.simpleFinancesItem;
  const handleSetSimpleFinancesItem = (v) => s.update('simpleFinancesItem', v ? 1 : 0);
  const marketSimplifiedItems = !!s.marketSimplifiedItems;
  const handleSetmarketSimplifiedItems = (v) => s.update('marketSimplifiedItems', v ? 1 : 0);
  const isShowLabelOnNavigation = !!s.isShowLabelOnNavigation;
  const handleSetIsShowLabelOnNavigation = (v) => s.update('isShowLabelOnNavigation', v ? 1 : 0);
  const isAiEnabled = !!s.isAiEnabled;
  const handleSetIsAiEnabled = (v) => s.update('isAiEnabled', v ? 1 : 0);
  const selectedFolderToSave = s.selectedFolderToSave;
  const handleUpdateSelectedFolderToSave = (v) => s.update('selectedFolderToSave', v);
  const handleResetConfigs = async () => { if (s.reset) await s.reset(); };
  const handleCleanStorage = async () => { await s.update('isEnableTitheCard', 0); };
  const apiKey = s.apiKey;
  const handleSaveApiKey = (v) => s.update('apiKey', v);
  // finance/lists/market/runs repos via stores
  const financeState = useFinanceStore();
  const transactionsList = financeState.transactionsList;
  const importTransactions = async (list) => { for (const item of list) await financeState.add(item); };
  const setTransactionsList = (list) => useFinanceStore.setState({ transactionsList: list });
  const runsState = useRunsStore();
  const setFuelList = (list) => useRunsStore.setState({ runsList: list });
  const handleImportRuns = async () => { const { ToastAndroid } = require('react-native'); ToastAndroid.show("Importação disponível em breve", ToastAndroid.SHORT); };
  const handleExportRuns = async () => { const { ToastAndroid } = require('react-native'); ToastAndroid.show("Exportação disponível em breve", ToastAndroid.SHORT); };
  const marketState = useMarketStore();
  const handleImportStock = async () => { const { ToastAndroid } = require('react-native'); ToastAndroid.show("Importação disponível em breve", ToastAndroid.SHORT); };
  const handleExportStock = async () => { const { ToastAndroid } = require('react-native'); ToastAndroid.show("Exportação disponível em breve", ToastAndroid.SHORT); };
  const loadTransactions = marketState.load;
  const listsState = useListsStore();
  const loadTransactionsLists = listsState.load;
  const handleImportList = async () => { const { ToastAndroid } = require('react-native'); ToastAndroid.show("Importação disponível em breve", ToastAndroid.SHORT); };

  // migrated from native-base useColorMode -> zustand
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const colorMode = colorModeState;
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  // keep theme colors via hardcoded map (replaces useTheme)
// migrated duplicate theme:   const theme = {
    colors: {
      warmGray: { 50: "#f5f5f4" },
      gray: { 200: "#e4e4e7", 400: "#a1a1aa", 600: "#52525b", 800: "#27272a", 900: "#1c1e21" },
      purple: { 600: "#9c44dc", 900: "#581c87" },
      green: { 500: "#22c55e", 600: "#16a34a" },
      red: { 500: "#ef4444", 600: "#dc2626" },
      yellow: { 400: "#facc15" },
      white: "#fff",
    },
  };

// migrated:   const navigation = useNavigation();

// migrated:   const { apiKey, handleSaveApiKey } = useOpenAi();

  const isFocused = useIsFocused();
  const [inputOpenAiText, setInputOpenAiText] = useState("");

  const { transactionsList, importTransactions, setTransactionsList } =
    usePayments();

// migrated:   const { setFuelList, handleImportRuns, handleExportRuns } = useRuns();

  const { handleImportStock, handleExportStock, loadTransactions } =
    useMarket();

  const { loadTransactions: loadTransactionsLists, handleImportList } =
    useLists();

  const {
    isEnableTitheCard,
    handleSwitchViewTitheCard,
    willAddFuelToTransactionList,
    handleToggleWillAddFuel,
    willUsePrefixToRemoveTihteSum,
    handleWillRemovePrefixToRemove,
    prefixTithe,
    handleSetPrefixTithe,
    isEnableTotalHistoryCard,
    handleSwitchViewTotalHistoryCard,
    handleCleanStorage,
    simpleFinancesItem,
    handleSetSimpleFinancesItem,
    marketSimplifiedItems,
    handleSetmarketSimplifiedItems,
    isShowLabelOnNavigation,
    handleSetIsShowLabelOnNavigation,
    handleToggleTheme,
    handleSetIsAiEnabled,
    isAiEnabled,
    selectedFolderToSave,
    handleUpdateSelectedFolderToSave,
    handleResetConfigs,
  } = useSettings();

  async function getAllDataAsJSON() {
    try {
      // Obtenha todas as chaves do AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Mapeie as chaves para objetos JSON contendo chave e valor
      const data = await Promise.all(
        keys.map(async (key) => {
          const value = await AsyncStorage.getItem(key);
          return { key, value };
        })
      );

      return data;
    } catch (error) {
      console.error("Erro ao obter dados do AsyncStorage: ", error);
      throw error;
    }
  }

  async function exportSomeData(data, format, filePrefix) {
    try {
      const currentDate = new Date();

      const currentDateString = `${
        currentDate.getDate() < 10
          ? "0" + currentDate.getDate()
          : currentDate.getDate()
      }-${
        currentDate.getMonth() + 1 < 10
          ? "0" + (currentDate.getMonth() + 1)
          : currentDate.getMonth() + 1
      }-${currentDate.getFullYear()}_${currentDate.getHours()}-${currentDate.getMinutes()}`.replaceAll(
        " ",
        ""
      );

      const directoryUri = selectedFolderToSave;
      const fileName = `${filePrefix.replace(
        /[^\w\s]/gi,
        ""
      )}-${currentDateString}.${format}`;

      const result = await checkPermissions();
      if (result) {
        const createdFile =
          await FileSystem.StorageAccessFramework.createFileAsync(
            directoryUri,
            fileName,
            "text/*"
          );
        const writedFile =
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            createdFile,
            data,
            { encoding: "utf8" }
          );

        ToastAndroid.show(
          `Exportação ${filePrefix.replace(
            /[^\w\s]/gi,
            ""
          )} realizada com sucesso!`,
          ToastAndroid.SHORT
        );
      } else {
        ToastAndroid.show(
          `Houve um problema ao exportar ${filePrefix.replace(
            /[^\w\s]/gi,
            ""
          )}!`,
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      console.log(error);
      ToastAndroid.show(
        `Houve um problema ao exportar ${filePrefix.replace(/[^\w\s]/gi, "")}!`,
        ToastAndroid.SHORT
      );
    }
  }

  async function saveStorageToExportedFile() {
    let storageStringfyData = (await getAllDataAsJSON()) ?? "";

    for (const table of storageStringfyData) {
      await exportSomeData(table.value, "txt", table.key);
    }
  }

  async function handleClearMarket() {
    Alert.alert(
      "Deseja realmente deletar esses registros?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => console.log("Não pressed"),
        },
        {
          text: "Apagar Listas",
          onPress: async () => {
            try {
              const allLists = await listRepo.getAll();
              for (const item of allLists) {
                await listRepo.delete(item.id);
              }
              if (listRepo.clearItems) {
                // fallback clear via memory if available
                try { await listRepo.clearMemory(); } catch {}
              }
            } catch {}

            await loadTransactionsLists();

            ToastAndroid.show(
              "Listas de compras removidas com sucesso!",
              ToastAndroid.SHORT
            );
          },
        },
        {
          text: "Apagar estoque",
          onPress: async () => {
            try {
              if (marketRepo.clearMemory) await marketRepo.clearMemory();
              const allStock = await marketRepo.getAll();
              for (const item of allStock) {
                await marketRepo.delete(item.id);
              }
            } catch {}

            await loadTransactions();

            ToastAndroid.show(
              "Estoque removido com sucesso!",
              ToastAndroid.SHORT
            );
          },
        },
        {
          text: "Apagar tudo",
          onPress: async () => {
            try {
              if (marketRepo.clearMemory) await marketRepo.clearMemory();
              const allStock = await marketRepo.getAll();
              for (const item of allStock) {
                await marketRepo.delete(item.id);
              }
              const allLists = await listRepo.getAll();
              for (const item of allLists) {
                await listRepo.delete(item.id);
              }
              if (listRepo.clearMemory) try { await listRepo.clearMemory(); } catch {}
            } catch {}

            await loadTransactions();
            await loadTransactionsLists();

            ToastAndroid.show(
              "Compras removidas com sucesso!",
              ToastAndroid.SHORT
            );
          },
        },
      ]
    );
  }

  async function handleClearFinances() {
    Alert.alert(
      "Deseja realmente deletar esses registros?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        {
          text: "Não",
          style: "cancel",
          onPress: () => console.log("Não pressed"),
        },
        {
          text: "Sim",
          onPress: async () => {
            try {
              if (financeRepo.clearMemory) await financeRepo.clearMemory();
              const allFinances = await financeRepo.getAll();
              for (const item of allFinances) {
                await financeRepo.delete(item.id);
              }
            } catch {}
            setTransactionsList([]);

            ToastAndroid.show(
              "Finanças removidas com sucesso!",
              ToastAndroid.SHORT
            );
          },
        },
      ]
    );
  }

  async function handleResetSettings() {
    Alert.alert("Deseja realmente redefinir as configurações?", "", [
      {
        text: "Não",
        style: "cancel",
        onPress: () => console.log("Não pressed"),
      },
      {
        text: "Sim",
        onPress: async () => {
          await handleResetConfigs();

          ToastAndroid.show(
            "Configs. redefinidas com sucesso!",
            ToastAndroid.SHORT
          );
        },
      },
    ]);
  }

  async function handleClearRuns() {
    Alert.alert(
      "Deseja realmente deletar esses registros?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        {
          text: "Não",
          style: "cancel",
          onPress: () => console.log("Não pressed"),
        },
        {
          text: "Sim",
          onPress: async () => {
            try {
              if (runRepo.clearMemory) await runRepo.clearMemory();
              const allRuns = await runRepo.getAll();
              for (const item of allRuns) {
                await runRepo.delete(item.id);
              }
            } catch {}

            setFuelList([]);

            ToastAndroid.show(
              "Finanças removidas com sucesso!",
              ToastAndroid.SHORT
            );
          },
        },
      ]
    );
  }

  const checkPermissions = async () => {
    try {
      const result = await MediaLibrary.getPermissionsAsync();

      if (!result) {
        console.log("Vamo lá");
        const granted = await MediaLibrary.requestPermissionsAsync();

        console.log("checkPermissions", granted);

        if (granted === MediaLibrary.PermissionStatus.GRANTED) {
          console.log("Você pode usar a camera");
          return true;
        } else {
          Alert.alert("Error", "As permissões não foram concedidas");

          console.log("Camera permission denied");
          return false;
        }
      } else {
        return true;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  async function handleGenerateCSV() {
    const currentDate = new Date();
    try {
      const CSV = jsonToCSV(transactionsList);
      const directoryUri = selectedFolderToSave;
      const fileName = `financas-${
        currentDate.getDate() < 10
          ? "0" + currentDate.getDate()
          : currentDate.getDate()
      }-${
        currentDate.getMonth() + 1 < 10
          ? "0" + (currentDate.getMonth() + 1)
          : currentDate.getMonth() + 1
      }-${currentDate.getFullYear()}_${currentDate.getHours()}-${currentDate.getMinutes()}.csv`;
      const result = await checkPermissions();
      if (result) {
        const createdFile =
          await FileSystem.StorageAccessFramework.createFileAsync(
            directoryUri,
            fileName,
            "text/*"
          );
        const writedFile =
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            createdFile,
            CSV,
            { encoding: "utf8" }
          );

        ToastAndroid.show(
          "Finanças exportadas com sucesso para a pasta selecionada",
          ToastAndroid.SHORT
        );
      } else {
        ToastAndroid.show(
          "Houve um problema ao exportar as finanças!",
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      console.log(error);
      ToastAndroid.show(
        "Houve um problema ao exportar as finanças!",
        ToastAndroid.SHORT
      );
    }
  }

  async function handleCSVtoArrayFormat(data) {
    const [headers, ...rows] = data;
    let newArray = [];

    for (const row of rows) {
      let i = 0;
      let newRowObject = {};
      for (const header of headers) {
        newRowObject[header] = row[i];
        i = i + 1;
      }
      newArray.push(newRowObject);
    }

    if (newArray[newArray.length - 1].description === undefined) {
      newArray.pop();
    }

    return newArray;
  }

  async function handleImportCSV() {
    try {
      const result = await checkPermissions();
      if (result) {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: false,
          type: "text/*",
        });
        if (result.type === "success") {
          let fileContent = await FileSystem.readAsStringAsync(result.uri, {
            encoding: "utf8",
          });
          const dataFromCSV = readString(fileContent);
          const csvFormated = await handleCSVtoArrayFormat(dataFromCSV.data);
          if (csvFormated) {
            const importedTransactions = csvFormated.map((item) => {
              const row = {
                amount: Number(item.amount),
                date: item.date !== "" ? Number(item.date) : "",
                paymentDate: item.paymentDate !== "" ? Number(item.date) : "",
                description: item.description,
                category: item.category,
                paymentStatus: item.paymentStatus,
                isEnabled: item.isEnabled,
                isFavorited: item.isFavorited,
              };

              return row;
            });
            await importTransactions(importedTransactions);
          } else {
            ToastAndroid.show(
              "Houve um problema ao exportar as finanças!",
              ToastAndroid.SHORT
            );
          }
        }
      }
    } catch (error) {
      console.log(error);
      ToastAndroid.show(
        "Houve um problema ao importar as finanças!",
        ToastAndroid.SHORT
      );
    }
  }

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

  useEffect(() => {
    if (isFocused) {
      setInputOpenAiText(apiKey);
    }
  }, [apiKey]);

  return (
    <View style={{flex:1}}>
      <View flex={1} bg={bg}>
      <ScrollView flex={1} w={"100%"} h={"100%"}>
        <Header
          title="Configuraçõe"
          isLeftIconComponent={
            <TouchableOpacity
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

        <View alignItems={"center"} mt={-16}>
          <View
            borderRadius={"full"}
            w={32}
            h={32}
            borderWidth={6}
            borderColor={theme.colors.purple[900]}
            bg={bg}
            alignItems={"center"}
            justifyContent={"center"}
          >
            <Image
              alt="logo"
              source={userImg}
              borderRadius={"full"}
              size={105}
            />
          </View>
        </View>
        <View space={2} px={4}>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                colorMode === "dark"
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleToggleTheme}
              value={colorMode === "dark"}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Habilitar Tema Escuro
            </Text>
          </View>

          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                isShowLabelOnNavigation
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSetIsShowLabelOnNavigation}
              value={isShowLabelOnNavigation}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Titulos nos icones da navegação
            </Text>
          </View>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                isAiEnabled ? theme.colors.purple[600] : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSetIsAiEnabled}
              value={isAiEnabled}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Habilitar Inteligência artificial (Beta)
            </Text>
          </View>

          {isAiEnabled && (
            <View space={1}>
              <Text color={text} fontSize={16}>
                Chave de API
              </Text>
              <TextInput
                placeholder="Chave de API"
                onChangeText={(text) => {
                  setInputOpenAiText(text);
                }}
                value={inputOpenAiText}
                editable={isAiEnabled}
                rightElement={
                  <TouchableOpacity
                    size="xs"
                    rounded="none"
                    w="1/6"
                    p={0}
                    h="full"
                    bgColor={theme.colors.purple[600]}
                    onPress={() => {
                      handleSaveApiKey(inputOpenAiText);
                    }}
                  >
                    <Feather name="save" size={24} color="#FFF" />
                  </TouchableOpacity>
                }
              />
              <Text color="gray.400">
                Coloque aqui sua Chave de Api da OpenAI
              </Text>
              <TouchableOpacity
                href={"https://platform.openai.com/account/api-keys"}
                _text={{ color: "purple.500" }}
              >
                Toque aqui para obter uma Chave de API OpenAi
              </TouchableOpacity>
            </View>
          )}

          <View my={2}>
            <View />
          </View>
        </View>

        <View space={2} px={4}>
          <Text color={text} bold fontSize={22}>
            Finanças
          </Text>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                simpleFinancesItem
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSetSimpleFinancesItem}
              value={simpleFinancesItem}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Usar formulário simplificado de itens
            </Text>
          </View>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                isEnableTotalHistoryCard
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSwitchViewTotalHistoryCard}
              value={isEnableTotalHistoryCard}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Habilitar card de Saldo
            </Text>
          </View>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                isEnableTitheCard
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSwitchViewTitheCard}
              value={isEnableTitheCard}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Habilitar card de Dízimo
            </Text>
          </View>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                willUsePrefixToRemoveTihteSum
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleWillRemovePrefixToRemove}
              value={willUsePrefixToRemoveTihteSum}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Remover itens com o prefixo da soma do Dízimo
            </Text>
          </View>

          <View space={2}>
            <Text color={text} fontSize={16}>
              Prefixo
            </Text>
            <TextInput
              placeholder="Prefixo"
              onChangeText={handleSetPrefixTithe}
              value={prefixTithe}
              editable={willUsePrefixToRemoveTihteSum}
            />
            <Text color="gray.400">
              Se o título da transação tiver este prefixo não será contado na
              soma do dízimo
            </Text>
          </View>
        </View>

        <View px={4} space={2} my={2}>
          <TouchableOpacity
            onPress={handleGenerateCSV}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Exportar finanças
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportCSV}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Importar finanças
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Use um arquivo{" "}
            <Text color={text} bold fontSize={16}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleClearFinances}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="trash" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Apagar finanças
          </TouchableOpacity>
        </View>

        <View px={4} my={2}>
          <View />
        </View>

        <View space={2} px={4} py={2}>
          <Text color={text} bold fontSize={22}>
            Corridas
          </Text>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                willAddFuelToTransactionList
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleToggleWillAddFuel}
              value={willAddFuelToTransactionList}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Habilitar adicionar abastecimento automaticamente em finanças
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportRuns}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Exportar Abastecimentos
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportRuns}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Importar Abastecimentos
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Use um arquivo{" "}
            <Text color={text} bold fontSize={16}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleClearRuns}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="trash" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Apagar Abastecimentos
          </TouchableOpacity>
        </View>

        <View px={4} my={2}>
          <View />
        </View>

        <View space={2} px={4} py={2}>
          <Text color={text} bold fontSize={22}>
            Compras
          </Text>
          <View alignItems={"center"}>
            <Switch
              trackColor={{
                false: theme.colors.gray[400],
                true: theme.colors.gray[400],
              }}
              thumbColor={
                marketSimplifiedItems
                  ? theme.colors.purple[600]
                  : theme.colors.gray[600]
              }
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSetmarketSimplifiedItems}
              value={marketSimplifiedItems}
            />
            <Text color={text} fontSize={16} maxW={"90%"} numberOfLines={2}>
              Usar formulário simplificado de itens
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportStock}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Exportar Estoque
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportStock}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Importar Estoque
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Use um arquivo{" "}
            <Text color={text} bold fontSize={16}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleImportList}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Importar Lista de compras
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Para exportar pressione e segure o card da lista que quer exportar.
          </Text>

          <TouchableOpacity
            onPress={handleClearMarket}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="trash" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Apagar Compras
          </TouchableOpacity>
        </View>

        <View px={4} my={2}>
          <View />
        </View>

        <View space={2} px={4} py={2}>
          <Text color={text} bold fontSize={22}>
            Geral
          </Text>

          <TouchableOpacity
            onPress={handleResetSettings}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="settings" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Redefinir configurações
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCleanStorage}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="trash" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Apagar tabelas
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Essa opção apagará todos os registros do app.
          </Text>

          <TouchableOpacity
            onPress={async () => {
              const requestedDirPerm =
                await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              await handleUpdateSelectedFolderToSave(
                requestedDirPerm.directoryUri
              );
              ToastAndroid.show("Pasta selecionada!", ToastAndroid.SHORT);
            }}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="folder" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Alterar pasta de exportação
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveStorageToExportedFile}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="file-text" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Exportar finanças antigo
          </TouchableOpacity>

          <Text color={text} px={2} textAlign="center">
            Essa opção exporta o modelo de finanças do app antigo.
          </Text>
        </View>

        <View px={4} my={2}>
          <View />
        </View>

        <View space={2} px={4} py={2}>
          <TouchableOpacity
            onPress={() => {
              Linking.openURL("https://filipeleonelbatista.vercel.app/");
            }}
            shadow={2}
            colorScheme={"purple"}
            borderRadius={"full"}
            leftIcon={<Feather name="globe" size={24} color="#FFF" />}
            _text={{
              color: "white",
              fontSize: 16,
            }}
            _pressed={{
              bgColor: theme.colors.purple[900],
            }}
          >
            Sobre o desenvolvedor
          </TouchableOpacity>

          <Text textAlign={"center"} fontSize={12} color={text} my={6}>
            Versão {Constants.manifest.version}
          </Text>
        </View>
      </ScrollView>
    </View>
    </View>
  );
}
