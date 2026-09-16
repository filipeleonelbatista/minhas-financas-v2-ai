import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, FlatList, useWindowDimensions } from "react-native";
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
import RunCard from "../components/ui/RunCard";
import SwipeableRunRow from "../components/SwipeableRunRow";
import ThemedAlert from "../components/ui/ThemedAlert";
import EditFuelForm from "../components/EditFuelForm";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import ErrorSheet from "../components/ErrorSheet";
import EditVeicleForm from "../components/EditVeicleForm";
import { Sheet, useSheetRef } from "../components/nativewindui/Sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let BorderBeam: any = null;
try { BorderBeam = require("../components/ui/border-beam").BorderBeam || require("../components/ui/border-beam/index").BorderBeam || require("../components/ui/border-beam/index").default || null; } catch {}

const PURPLE_600 = "#9c44dc";

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
  const [selectedRun, setSelectedRun] = useState(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isRunEditMode, setIsRunEditMode] = useState(false);
  const [confirmDeleteRun, setConfirmDeleteRun] = useState(null);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const filterSheetRef = useSheetRef();

  const [startDate, setStartDate] = useState(dayjs().subtract(5, "month").startOf("month").format("DD/MM/YYYY"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("DD/MM/YYYY"));

  const FuelList = useRunsStore((s) => s.runsList);
  const remove = useRunsStore((s) => s.remove);

  const handleViewRun = (item) => {
    setSelectedRun(item);
    setIsRunEditMode(false);
    setIsRunModalOpen(true);
  };
  const handleEditRun = (item) => {
    setSelectedRun(item);
    setIsRunEditMode(true);
    setIsRunModalOpen(true);
  };
  const handleDeleteRun = (item) => setConfirmDeleteRun(item);
  const handleConfirmDeleteRun = async () => {
    if (!confirmDeleteRun) return;
    await remove(confirmDeleteRun.id ?? confirmDeleteRun);
    setConfirmDeleteRun(null);
  };
  const onCloseRunModal = () => {
    setIsRunModalOpen(false);
    setIsRunEditMode(false);
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
          <View style={{ marginHorizontal: 4, backgroundColor: "#581c87", minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-km-estimado">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "white", fontSize: 18 }}>Km Estimado</Text>
              <Feather name="dollar-sign" size={48} color="white" />
            </View>
            <Text style={{ color: "white", fontSize: Number(currentEstimative) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">{currentEstimative} km</Text>
          </View>

          <TouchableOpacity
            onPress={() => { setSelectedSheetOpen("autonomy"); onOpen(); }}
            activeOpacity={0.8}
            style={{ marginHorizontal: 4, backgroundColor: isDark ? "#27272a" : "white", minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: isDark ? 0.15 : 0.08, borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e7e5e4" }}
            testID="card-autonomia"
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Autonomia</Text>
              <Feather name="arrow-up-circle" size={48} color="#22c55e" />
            </View>
            <Text style={{ color: text, fontSize: (veicleAutonomy ?? 0) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">{veicleAutonomy ?? 0} km/L</Text>
          </TouchableOpacity>

          <View style={{ marginHorizontal: 4, backgroundColor: isDark ? "#27272a" : "white", minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: isDark ? 0.15 : 0.08, borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e7e5e4" }} testID="card-km-atual">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Km Atual</Text>
              <Feather name="arrow-up-circle" size={48} color="#22c55e" />
            </View>
            <Text style={{ color: text, fontSize: (filteredList[0]?.currentDistance ?? 0) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">{filteredList[0]?.currentDistance ?? 0} km</Text>
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
          {filteredList.length === 0 ? (
            <EmptyMessage />
          ) : (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <Text style={{ color: text, marginBottom: 8, fontSize: 12 }}>
                Deslize para a direita para excluir • Deslize para a esquerda para editar • Segure para visualizar
              </Text>
              <FlatList
                data={filteredList}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <SwipeableRunRow item={item} onEdit={handleEditRun} onDelete={handleDeleteRun}>
                    <RunCard item={item} onPress={() => {}} onLongPress={handleViewRun} testID={`run-card-${item.id}`} />
                  </SwipeableRunRow>
                )}
                testID="runs-flatlist"
                ListFooterComponent={
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                    <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
                    <Text style={{ color: text, fontSize: 18, fontWeight: "700", flex: 1, textAlign: "right" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} ellipsizeMode="tail">
                      {listTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

      {(() => {
        const fabSize = 64;
        const fabBottom = tabBarHeight + 16;
        const onPressVehicle = () => { setSelectedSheetOpen("veicle"); onOpen(); };
        if (BorderBeam) {
          return (
            <View style={{ position: "absolute", bottom: fabBottom, right: 16, zIndex: 10 }} testID="vehicle-info-button-wrapper">
              <BorderBeam borderRadius={fabSize/2} borderWidth={2} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2 }}>
                <TouchableOpacity testID="vehicle-info-button" onPress={onPressVehicle} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2, backgroundColor: PURPLE_600, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="car-sport-outline" size={28} color="white" />
                </TouchableOpacity>
              </BorderBeam>
            </View>
          );
        }
        return (
          <TouchableOpacity
            testID="vehicle-info-button"
            onPress={onPressVehicle}
            style={{ position: "absolute", bottom: fabBottom, right: 16, width: 56, height: 56, backgroundColor: PURPLE_600, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, zIndex: 10 }}
          >
            <Ionicons name="car-sport-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        );
      })()}

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

      <Modal visible={isRunModalOpen} animationType="slide" onRequestClose={onCloseRunModal} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onCloseRunModal} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedRun && <EditFuelForm onClose={onCloseRunModal} selectedRun={selectedRun} initialEditable={isRunEditMode} />}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>

      <ThemedAlert
        visible={!!confirmDeleteRun}
        title="Excluir abastecimento"
        message={confirmDeleteRun ? `Deseja excluir abastecimento em "${confirmDeleteRun.location}"?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteRun}
        onCancel={() => setConfirmDeleteRun(null)}
        onClose={() => setConfirmDeleteRun(null)}
        testID="run-delete-alert"
        confirmTestID="confirm-delete-run"
        cancelTestID="cancel-delete-run"
      />

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
