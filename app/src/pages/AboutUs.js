import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSettingsStore } from "../stores/settings";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
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
let MediaLibrary: any = null;
try {
  MediaLibrary = require("expo-media-library");
} catch {}
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
import { isBiometricAvailable } from "../utils/biometry";

export default function AboutUs() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const colorMode = colorModeState;
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";
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
  let themeHook: any = null;
  try {
    const { useTheme } = require("../components/organisms/theme-switch/context");
    themeHook = useTheme();
  } catch { themeHook = null; }
  const handleToggleTheme = async (e?: any) => {
    try {
      if (themeHook?.toggleTheme) {
        const { AnimationType, EasingType } = require("../components/organisms/theme-switch/types");
        const touchX = e?.nativeEvent?.pageX ?? e?.nativeEvent?.locationX ?? undefined;
        const touchY = e?.nativeEvent?.pageY ?? e?.nativeEvent?.locationY ?? undefined;
        await themeHook.toggleTheme({ animationType: AnimationType.CircularBlur, animationDuration: 1600, easing: EasingType.EaseInOut, touchX, touchY });
        return;
      }
    } catch {}
    return toggleColorMode();
  };
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
  const isAiEnabled = !!s.isAiEnabled;
  const handleSetIsAiEnabled = (v) => s.update('isAiEnabled', v ? 1 : 0);
  const isTitheMenuEnabled = !!s.isTitheMenuEnabled;
  const handleToggleTitheMenu = (v) => s.update('isTitheMenuEnabled', v ? 1 : 0);
  const isBiometricEnabled = !!s.isBiometricEnabled;
  const handleSetIsBiometricEnabled = (v) => s.update('isBiometricEnabled', v ? 1 : 0);
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
  const loadRuns = runsState.load ?? (async () => { try { const all = await runRepo.getAll(); useRunsStore.setState({ runsList: all }); } catch {} });
  const handleImportRuns = async () => {
    const { ToastAndroid } = require('react-native');
    try {
      const ok = await checkPermissions();
      if (!ok) return;
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false, type: "text/*" });
      if (res.canceled || res.type === "cancel") return;
      const uri = res.assets?.[0]?.uri ?? res.uri;
      if (!uri) return;
      const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
      const parsed = readString(content);
      const rows = await handleCSVtoArrayFormat(parsed.data);
      for (const item of rows) {
        try {
          const dto = { currentDistance: Number(item.currentDistance ?? item.current_distance ?? 0), unityAmount: Number(item.unityAmount ?? 0), amount: Number(item.amount ?? 0), type: String(item.type ?? "gasolina"), date: Number(item.date ?? Date.now()), location: String(item.location ?? "") };
          if (!isFinite(dto.amount) || !dto.location) continue;
          await runRepo.add(dto);
        } catch {}
      }
      await loadRuns();
      ToastAndroid.show("Abastecimentos importados!", ToastAndroid.SHORT);
    } catch (e) { console.log(e); ToastAndroid.show("Falha ao importar abastecimentos", ToastAndroid.SHORT); }
  };
  const handleExportRuns = async () => {
    const { ToastAndroid } = require('react-native');
    try {
      const all = await runRepo.getAll();
      if (!all || all.length === 0) { ToastAndroid.show("Nenhum abastecimento para exportar", ToastAndroid.SHORT); return; }
      const csv = jsonToCSV(all);
      await exportSomeData(csv, "csv", "abastecimentos");
    } catch (e) { console.log(e); ToastAndroid.show("Falha ao exportar", ToastAndroid.SHORT); }
  };
  const marketState = useMarketStore();
  const loadTransactions = marketState.load;
  const handleImportStock = async () => {
    const { ToastAndroid } = require('react-native');
    try {
      const ok = await checkPermissions();
      if (!ok) return;
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false, type: "text/*" });
      if (res.canceled || res.type === "cancel") return;
      const uri = res.assets?.[0]?.uri ?? res.uri;
      if (!uri) return;
      const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
      const parsed = readString(content);
      const rows = await handleCSVtoArrayFormat(parsed.data);
      for (const item of rows) {
        const dto = { description: String(item.description ?? ""), category: String(item.category ?? "Outros"), amount: Number(item.amount ?? 0), quantity: Number(item.quantity ?? 0), quantityDesired: Number(item.quantityDesired ?? item.desiredQuantity ?? 1) };
        if (!dto.description) continue;
        await marketRepo.add(dto);
      }
      await loadTransactions();
      ToastAndroid.show("Estoque importado!", ToastAndroid.SHORT);
    } catch (e) { console.log(e); ToastAndroid.show("Falha ao importar estoque", ToastAndroid.SHORT); }
  };
  const handleExportStock = async () => {
    const { ToastAndroid } = require('react-native');
    try {
      const all = await marketRepo.getAll();
      if (!all || all.length === 0) { ToastAndroid.show("Nenhum item no estoque", ToastAndroid.SHORT); return; }
      const csv = jsonToCSV(all);
      await exportSomeData(csv, "csv", "estoque");
    } catch (e) { console.log(e); ToastAndroid.show("Falha ao exportar", ToastAndroid.SHORT); }
  };
  const listsState = useListsStore();
  const loadTransactionsLists = listsState.load;
  const handleImportList = async () => {
    const { ToastAndroid } = require('react-native');
    try {
      const ok = await checkPermissions();
      if (!ok) return;
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false, type: "text/*" });
      if (res.canceled || res.type === "cancel") return;
      const uri = res.assets?.[0]?.uri ?? res.uri;
      if (!uri) return;
      const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
      const parsed = readString(content);
      const rows = await handleCSVtoArrayFormat(parsed.data);
      if (rows.length === 0) { ToastAndroid.show("Arquivo vazio", ToastAndroid.SHORT); return; }
      // Heuristic: if rows contain list header (description+location) treat as lists export, else as generic
      for (const item of rows) {
        if (item.description && item.location !== undefined && item.amount !== undefined) {
          await listRepo.add({ description: String(item.description), location: String(item.location ?? ""), amount: Number(item.amount ?? 0), quantity: Number(item.quantity ?? 0), date: Number(item.date ?? Date.now()) });
        }
      }
      await loadTransactionsLists();
      ToastAndroid.show("Listas importadas!", ToastAndroid.SHORT);
    } catch (e) { console.log(e); ToastAndroid.show("Falha ao importar listas", ToastAndroid.SHORT); }
  };

  const isFocused = useIsFocused();
  const [inputOpenAiText, setInputOpenAiText] = useState("");
  const [bioAvailable, setBioAvailable] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const avail = await isBiometricAvailable();
        if (mounted) setBioAvailable(avail);
      } catch { if (mounted) setBioAvailable(false); }
    })();
    return () => { mounted = false; };
  }, [isFocused]);

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

      const fileName = `${filePrefix.replace(/[^\w\s]/gi, "")}-${currentDateString}.${format}`;

      const result = await checkPermissions();
      if (!result) {
        ToastAndroid.show(`Houve um problema ao exportar ${filePrefix.replace(/[^\w\s]/gi, "")}!`, ToastAndroid.SHORT);
        return;
      }
      try {
        if (Platform.OS === 'android') {
          const directoryUri = selectedFolderToSave;
          if (!directoryUri) {
            Alert.alert("Selecione pasta", "Escolha a pasta em Configurações → Alterar pasta de exportação");
            return;
          }
          const createdFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, "text/*");
          await FileSystem.StorageAccessFramework.writeAsStringAsync(createdFile, data, { encoding: "utf8" });
        } else {
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, data, { encoding: "utf8" });
          Alert.alert("Exportado", `Arquivo salvo em ${fileUri}`);
        }
        ToastAndroid.show(`Exportação ${filePrefix.replace(/[^\w\s]/gi, "")} realizada com sucesso!`, ToastAndroid.SHORT);
      } catch (e) {
        console.log(e);
        ToastAndroid.show(`Falha ao exportar ${filePrefix}`, ToastAndroid.SHORT);
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
    if (!MediaLibrary || !MediaLibrary.getPermissionsAsync) return true;
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
      if (!result) {
        ToastAndroid.show("Houve um problema ao exportar as finanças!", ToastAndroid.SHORT);
        return;
      }
      try {
        if (Platform.OS === 'android') {
          const directoryUri = selectedFolderToSave;
          if (!directoryUri) {
            Alert.alert("Selecione pasta", "Escolha a pasta em Configurações → Alterar pasta de exportação");
            return;
          }
          const createdFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, "text/*");
          await FileSystem.StorageAccessFramework.writeAsStringAsync(createdFile, CSV, { encoding: "utf8" });
          ToastAndroid.show("Finanças exportadas com sucesso para a pasta selecionada", ToastAndroid.SHORT);
        } else {
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, CSV, { encoding: "utf8" });
          Alert.alert("Exportado", `Arquivo salvo em ${fileUri}`);
          ToastAndroid.show("Finanças exportadas com sucesso!", ToastAndroid.SHORT);
        }
      } catch (e) {
        console.log(e);
        ToastAndroid.show("Houve um problema ao exportar as finanças!", ToastAndroid.SHORT);
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
      // auto-migrate legacy apiKey -> secureStore openai provider (one-shot)
      if (apiKey && isFocused) {
        (async () => {
          try {
            const { getProviderKey, saveProviderKey } = require("../utils/secureStore");
            const existing = await getProviderKey("openai");
            if (!existing && apiKey) await saveProviderKey("openai", apiKey);
          } catch {}
        })();
      }
    }
  }, [apiKey, isFocused]);

  return (
    <View style={{flex:1, backgroundColor:bg}}>
      <View style={{flex:1, backgroundColor:bg}}>
      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:24}} showsVerticalScrollIndicator={false}>
        <Header
          title="Configuraçõe"
          isShort
          isLeftIconComponent={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="arrow-left" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        <View style={{alignItems:"center", marginTop:16, marginBottom:16}}>
          <View
            style={{width:128, height:128, borderRadius:999, borderWidth:6, borderColor:theme.colors.purple[900], backgroundColor:bg, alignItems:"center", justifyContent:"center"}}
          >
            <Image
              alt="logo"
              source={userImg}
              style={{width:105, height:105, borderRadius:999}}
            />
          </View>
        </View>
        <View style={{gap:8, paddingHorizontal:16, marginTop:4}}>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar Tema Escuro</Text>
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
          </View>

          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar Inteligência artificial (Beta)</Text>
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
          </View>

          {isAiEnabled && (
            <View style={{gap:8, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", padding:12}} testID="ia-providers-card">
              <View style={{flexDirection:"row", alignItems:"center", gap:8}}>
                <View style={{width:36, height:36, borderRadius:18, backgroundColor: theme.colors.purple[600], alignItems:"center", justifyContent:"center"}}>
                  <Feather name="cpu" size={18} color="#FFF" />
                </View>
                <View style={{flex:1}}>
                  <Text style={{color:text, fontSize:15, fontWeight:"700"}}>Provedores de IA</Text>
                  <Text style={{color:subText, fontSize:12}} numberOfLines={2}>OpenAI • Gemini • Anthropic • OpenRouter • Zen — 1 ativo + fallback</Text>
                </View>
              </View>
              <Text style={{color: subText, fontSize:12}}>
                Chaves ficam em SecureStore. Modelos são buscados automaticamente após salvar a chave.
              </Text>
              <TouchableOpacity
                testID="btn-open-ai-providers"
                onPress={() => navigation.navigate("AIProviders")}
                style={{ backgroundColor: theme.colors.purple[600], borderRadius: 12, paddingVertical: 12, alignItems:"center", flexDirection:"row", justifyContent:"center", gap:8 }}
              >
                <Feather name="settings" size={18} color="#FFF" />
                <Text style={{ color: "white", fontWeight:"700" }}>Gerenciar provedores e modelos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="btn-open-ia-chat"
                onPress={() => navigation.navigate("IAPage")}
                style={{ backgroundColor: isDark ? "#3f3f46" : "white", borderWidth:1, borderColor: theme.colors.purple[600], borderRadius: 12, paddingVertical: 12, alignItems:"center", flexDirection:"row", justifyContent:"center", gap:8 }}
              >
                <Feather name="message-circle" size={18} color={theme.colors.purple[600]} />
                <Text style={{ color: theme.colors.purple[600], fontWeight:"700" }}>Abrir chat IA</Text>
              </TouchableOpacity>
              {apiKey ? (
                <View style={{backgroundColor: isDark ? "#422006" : "#fffbeb", borderWidth:1, borderColor:"#fde68a", borderRadius:8, padding:8}}>
                  <Text style={{color:"#92400e", fontSize:12, fontWeight:"600"}}>Chave legada OpenAI detectada</Text>
                  <Text style={{color:"#b45309", fontSize:11}}>Migre para “Gerenciar provedores” — salve como OpenAI para manter o histórico.</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={{height:1, backgroundColor: isDark ? "#3f3f46" : "#e4e4e7", marginVertical:16}} />
        </View>

        <View style={{gap:8, paddingHorizontal:16}}>
          <Text style={{color:text, fontWeight:"700", fontSize:20}}>Privacidade</Text>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <View style={{flex:1, marginRight:12}}>
              <Text style={{color:text, fontSize:15, fontWeight:"500"}} numberOfLines={1}>Exigir biometria ao abrir</Text>
              <Text style={{color:subText, fontSize:12}} numberOfLines={2}>
                {bioAvailable === null ? "Verificando..." : bioAvailable ? "Usa biometria/PIN do sistema" : "Biometria não disponível neste aparelho"}
              </Text>
            </View>
            <Switch
              testID="biometry-switch"
              trackColor={{false: theme.colors.gray[400], true: theme.colors.gray[400]}}
              thumbColor={isBiometricEnabled ? theme.colors.purple[600] : theme.colors.gray[600]}
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleSetIsBiometricEnabled}
              value={isBiometricEnabled}
              disabled={bioAvailable === false}
            />
          </View>
          {bioAvailable === false && (
            <Text testID="biometry-unavailable" style={{color:subText, fontSize:12, textAlign:"center"}}>
              Configure biometria/PIN nas configurações do sistema para ativar.
            </Text>
          )}
        </View>
        <View style={{height:1, backgroundColor: isDark ? "#3f3f46" : "#e4e4e7", marginVertical:16, marginHorizontal:16}} />

        <View style={{gap:12, paddingHorizontal:16, paddingVertical:8}}>
          <Text style={{color:text, fontWeight:"700", fontSize:20}}>
            Finanças
          </Text>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Usar formulário simplificado de itens</Text>
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
          </View>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar card de Saldo</Text>
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
          </View>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar card de Dízimo</Text>
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
          </View>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar menu Dízimo (JFA)</Text>
            <Switch
              trackColor={{ false: theme.colors.gray[400], true: theme.colors.gray[400] }}
              thumbColor={isTitheMenuEnabled ? theme.colors.purple[600] : theme.colors.gray[600]}
              ios_backgroundColor={theme.colors.gray[600]}
              onValueChange={handleToggleTitheMenu}
              value={isTitheMenuEnabled}
            />
          </View>
          <TouchableOpacity
            testID="btn-open-tithe-settings"
            onPress={() => navigation.navigate("TitheSettings")}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius:12, paddingVertical:12, paddingHorizontal:12, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}
          >
            <Feather name="heart" size={18} color="white" />
            <Text style={{ color: "white", fontWeight:"700", fontSize:14 }}>Conf. Religiosidade Dizimo</Text>
            <Feather name="chevron-right" size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{gap:12, paddingHorizontal:16, marginVertical:8}}>
          <TouchableOpacity
            onPress={handleGenerateCSV}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Exportar finanças"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportCSV}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Importar finanças"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
            Use um arquivo{" "}
            <Text style={{color:text, fontWeight:"700", fontSize:16}}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleClearFinances}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="trash" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Apagar finanças"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{paddingHorizontal:16, marginVertical:8}}>
          <View />
        </View>

        <View style={{gap:12, paddingHorizontal:16, paddingVertical:12}}>
          <Text style={{color:text, fontWeight:"700", fontSize:20}}>
            Corridas
          </Text>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Habilitar adicionar abastecimento automaticamente em finanças</Text>
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
          </View>
          <TouchableOpacity
            onPress={handleExportRuns}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Exportar Abastecimentos"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportRuns}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Importar Abastecimentos"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
            Use um arquivo{" "}
            <Text style={{color:text, fontWeight:"700", fontSize:16}}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleClearRuns}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="trash" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Apagar Abastecimentos"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{paddingHorizontal:16, marginVertical:8}}>
          <View />
        </View>

        <View style={{gap:12, paddingHorizontal:16, paddingVertical:12}}>
          <Text style={{color:text, fontWeight:"700", fontSize:20}}>
            Compras
          </Text>
          <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8, paddingHorizontal:12, backgroundColor: isDark ? "#27272a" : "white", borderRadius:12, borderWidth:1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", marginBottom:8}}>
            <Text style={{color:text, fontSize:15, fontWeight:"500", flex:1, marginRight:12}} numberOfLines={2}>Usar formulário simplificado de itens</Text>
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
          </View>
          <TouchableOpacity
            onPress={handleExportStock}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Exportar Estoque"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportStock}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Importar Estoque"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
            Use um arquivo{" "}
            <Text style={{color:text, fontWeight:"700", fontSize:16}}>
              .csv{" "}
            </Text>
            gerado pelo sistema para importar os dados de um amigo ou familiar.
          </Text>

          <TouchableOpacity
            onPress={handleImportList}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Importar Lista de compras"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
            Para exportar pressione e segure o card da lista que quer exportar.
          </Text>

          <TouchableOpacity
            onPress={handleClearMarket}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="trash" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Apagar Compras"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{paddingHorizontal:16, marginVertical:8}}>
          <View />
        </View>

        <View style={{gap:12, paddingHorizontal:16, paddingVertical:12}}>
          <Text style={{color:text, fontWeight:"700", fontSize:20}}>
            Geral
          </Text>

          <TouchableOpacity
            onPress={handleResetSettings}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Redefinir configurações"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCleanStorage}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="trash" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Apagar tabelas"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
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
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="folder" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>Alterar pasta de exportação</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveStorageToExportedFile}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{"Exportar finanças antigo"}</Text>
          </TouchableOpacity>

          <Text style={{color:text, paddingHorizontal:8, textAlign:"center"}}>
            Essa opção exporta o modelo de finanças do app antigo.
          </Text>
        </View>

        <View style={{paddingHorizontal:16, marginVertical:8}}>
          <View />
        </View>

        <View style={{gap:8, paddingHorizontal:16, paddingVertical:8}}>
          <TouchableOpacity
            onPress={() => {
              Linking.openURL("https://www.linkedin.com/in/filipeleonelbatista");
            }}
            style={{ backgroundColor: theme.colors.purple[600], borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, gap: 8 }}
            activeOpacity={0.8}
          >
            <Feather name="globe" size={20} color="#FFF" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>Sobre o desenvolvedor</Text>
          </TouchableOpacity>

          <Text textAlign={"center"} fontSize={12} color={text} my={6} style={{ textAlign: "center", fontSize: 12, color: text, marginVertical: 24 }}>
            Versão {Constants.expoConfig?.version ?? Constants.manifest?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "2.2.2"}
          </Text>
        </View>
      </ScrollView>
    </View>
    </View>
  );
}
