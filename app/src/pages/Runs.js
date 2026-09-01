import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import AIComponent from "../components/AIComponent";
import AutonomyForm from "../components/AutonomyForm";
import EmptyMessage from "../components/EmptyMessage";
import Header from "../components/Header";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import ErrorSheet from "../components/ErrorSheet";
import EditVeicleForm from "../components/EditVeicleForm";
import { Sheet, useSheetRef } from "../components/nativewindui/Sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function Runs() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "white";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed = isDark ? "#3f3f46" : "#f5f5f4";
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);
  const veicleAutonomy = useSettingsStore((s) => s.veicleAutonomy);

  const { setSelectedSheet } = usePagesStore();
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) setSelectedSheet("Combustível");
  }, [isFocused]);

  const isKeyboardOpen = useIsKeyboardOpen();
  const tabBarHeight = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const filterSheetRef = useSheetRef();

  const [startDate, setStartDate] = useState(dayjs().subtract(5, "month").startOf("month").format("DD/MM/YYYY"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("DD/MM/YYYY"));

  const FuelList = useRunsStore((s) => s.runsList);
  const remove = useRunsStore((s) => s.remove);

  const deleteTransaction = (dto) => {
    const { Alert, ToastAndroid } = require("react-native");
    Alert.alert("Deseja realmente deletar esse registro?", "Esta ação é irreversível! Deseja continuar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        onPress: async () => {
          await remove(dto.id ?? dto);
          ToastAndroid.show("Abastecimento Removido", ToastAndroid.SHORT);
        },
      },
    ]);
  };

  const filteredList = useMemo(() => {
    if (FuelList.length > 0) {
      const filteredByPeriod = FuelList.filter((item) => {
        const itemDate = dayjs(item.date);
        const currentStartDate = dayjs(`${startDate.split("/")[2]}-${startDate.split("/")[1]}-${startDate.split("/")[0]}`);
        const currentEndDate = dayjs(`${endDate.split("/")[2]}-${endDate.split("/")[1]}-${endDate.split("/")[0]}`);
        return itemDate.isSameOrAfter(currentStartDate) && itemDate.isSameOrBefore(currentEndDate);
      });
      const sortedByDateArray = filteredByPeriod.sort((a, b) => {
        const dateA = dayjs(a.date);
        const dateB = dayjs(b.date);
        if (dateA.isBefore(dateB)) return 1;
        if (dateA.isAfter(dateB)) return -1;
        return 0;
      });
      return sortedByDateArray;
    }
    return [];
  }, [FuelList, startDate, endDate]);

  const listTotal = useMemo(() => {
    let TotalList = 0.0;
    for (const item of filteredList) TotalList = TotalList + item.amount;
    return TotalList;
  }, [filteredList]);

  const currentEstimative = useMemo(() => {
    const result = filteredList[0] ? (Number(veicleAutonomy) * Number(filteredList[0]?.amount)) / Number(filteredList[0]?.unityAmount) + Number(filteredList[0]?.currentDistance) : 0;
    return result.toFixed(0);
  }, [filteredList, veicleAutonomy]);

  const onChangeStartDate = (_, selectedDate) => {
    if (selectedDate) setStartDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };
  const onChangeEndDate = (_, selectedDate) => {
    if (selectedDate) setEndDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };

  const [selectedSheetOpen, setSelectedSheetOpen] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <TouchableOpacity
        style={{ position: "absolute", bottom: isAiEnabled ? 82 : 8, left: 16, backgroundColor: "#9c44dc", width: 40, height: 40, zIndex: 100, alignItems: "center", justifyContent: "center", borderRadius: 999 }}
        onPress={() => { setSelectedSheetOpen("veicle"); onOpen(); }}
      >
        <Ionicons name="car-sport-outline" size={20} color="white" />
      </TouchableOpacity>

      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <Header
          title="Corrida"
          isRightIconComponent={
            <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="settings" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        <ScrollView horizontal style={{ width: "100%", marginTop: -50, height: 150 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ height: 130, paddingHorizontal: 8 }}>
          <View style={{ marginHorizontal: 4, backgroundColor: "#581c87", minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "white", fontSize: 18 }}>Km Estimado</Text>
              <Feather name="dollar-sign" size={48} color="white" />
            </View>
            <Text style={{ color: "white", fontSize: currentEstimative < 10000 ? 26 : 20 }} numberOfLines={1}>{currentEstimative}</Text>
          </View>

          <Pressable
            onPress={() => { setSelectedSheetOpen("autonomy"); onOpen(); }}
            style={({ pressed }) => ({ marginHorizontal: 4, backgroundColor: pressed ? bgCardPressed : bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Autonomia</Text>
              <Feather name="arrow-up-circle" size={48} color="#22c55e" />
            </View>
            <Text style={{ color: text, fontSize: (veicleAutonomy ?? 0) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>{veicleAutonomy ?? 0}L</Text>
          </Pressable>

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Km Atual</Text>
              <Feather name="arrow-up-circle" size={48} color="#22c55e" />
            </View>
            <Text style={{ color: text, fontSize: (filteredList[0]?.currentDistance ?? 0) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>{filteredList[0]?.currentDistance ?? 0}</Text>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, marginTop: -36, gap: 8 }}>
          <Text style={{ fontSize: 14, color: text }}>* Totais referentes ao ultimo abastecimento</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Período</Text>
            <TouchableOpacity
              onPress={() => filterSheetRef.current?.present()}
              style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 6, borderWidth: 1, borderRadius: 20, backgroundColor: "transparent", borderColor: "#9c44dc" }}
            >
              <Text style={{ fontSize: 16, color: "#9c44dc" }}>
                <Feather name="filter" size={18} color="#9c44dc" /> Filtros
              </Text>
            </TouchableOpacity>
          </View>
          <View>
            <Text style={{ color: text }}>Clique no item para excluir</Text>
          </View>
          {filteredList.length === 0 ? (
            <EmptyMessage />
          ) : (
            <>
              {filteredList.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => ({ backgroundColor: pressed ? bgCardPressed : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, padding: 8 })}
                  onPress={() => deleteTransaction(item)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", width: "100%", gap: 8 }}>
                    <MaterialCommunityIcons name="fuel" size={28} color="#12a454" />
                    <View style={{ alignItems: "flex-start", flex: 1 }}>
                      <Text style={{ color: text, fontSize: 18 }}>{item.location}</Text>
                      <Text style={{ color: text }}>Km no Abast.: {item.currentDistance}</Text>
                      <Text style={{ color: text, fontSize: 16 }}>{new Date(item.date).toLocaleDateString("pt-BR")}</Text>
                      <Text style={{ color: text }}>
                        {item.unityAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })} - {(item.amount / item.unityAmount).toFixed(2)} Litros
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", width: "34%" }}>
                      <Text style={{ color: text, fontSize: 18 }} numberOfLines={1}>
                        {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
                <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
                <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>
                  {listTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedSheetOpen === "veicle" ? <EditVeicleForm onClose={onClose} /> : selectedSheetOpen === "autonomy" ? <AutonomyForm onClose={onClose} /> : <ErrorSheet />}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>

      <Sheet ref={filterSheetRef} snapPoints={["55%"]} enableDynamicSizing={false} backgroundStyle={{ backgroundColor: bg }} handleIndicatorStyle={{ backgroundColor: isDark ? "#3f3f46" : "#e4e4e7" }}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 16 }} style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Filtros de período</Text>
            <Text style={{ fontSize: 12, color: text, marginTop: 4 }}>Selecione o intervalo de datas</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Data início</Text>
            <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangeStartDate, isDark })} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, height: 48, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white" }}>
              <TextInput style={{ flex: 1, padding: 8, color: text }} placeholder="Data inicio" value={startDate} editable={false} pointerEvents="none" placeholderTextColor="#a1a1aa" />
              <View style={{ width: 56, backgroundColor: "#9c44dc", height: "100%", alignItems: "center", justifyContent: "center" }}>
                <Feather name="calendar" size={24} color="#FFF" />
              </View>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Data fim</Text>
            <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangeEndDate, isDark })} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, height: 48, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white" }}>
              <TextInput style={{ flex: 1, padding: 8, color: text }} placeholder="Data Fim" value={endDate} editable={false} pointerEvents="none" placeholderTextColor="#a1a1aa" />
              <View style={{ width: 56, backgroundColor: "#9c44dc", height: "100%", alignItems: "center", justifyContent: "center" }}>
                <Feather name="calendar" size={24} color="#FFF" />
              </View>
            </Pressable>
          </View>

          <TouchableOpacity onPress={() => filterSheetRef.current?.dismiss()} style={{ backgroundColor: "#9c44dc", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Aplicar filtros</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </Sheet>
    </View>
  );
}
