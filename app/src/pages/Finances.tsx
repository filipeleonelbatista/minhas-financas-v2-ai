import React, { useState, useEffect, useMemo } from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
} from "react-native";
import {
  Feather,
  FontAwesome,
  Fontisto,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import EditItemForm from "../components/EditItemForm";
import EmptyMessage from "../components/EmptyMessage";
import FinanceCard from "../components/ui/FinanceCard";
import SwipeableFinanceRow from "../components/SwipeableFinanceRow";
import ThemedAlert from "../components/ui/ThemedAlert";
import Header from "../components/Header";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { useFinanceStore } from "../stores/finance";
import { useShallow } from "zustand/react/shallow";
import AIComponent from "../components/AIComponent";
import { Sheet, useSheetRef } from "../components/nativewindui/Sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePagesStore } from "../stores/pages";
import ThemedPicker from "../components/ui/ThemedPicker";
import type { FinanceRow } from "../repositories/finance";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";
const GREEN_500 = "#22c55e";
const GREEN_600 = "#16a34a";
const RED_500 = "#ef4444";
const RED_600 = "#dc2626";
const YELLOW_400 = "#facc15";

const categoriesList: string[] = [
  "Todos",
  "Outros",
  "Bares e Restaurantes",
  "Beleza",
  "Cartão",
  "Emergência",
  "Estudos",
  "Ganhos",
  "Investimentos",
  "Mercado",
  "Moradia",
  "Saúde",
  "Streaming",
  "TV/Internet/Telefone",
  "Transporte",
  "Vestuário",
];

const favoritedFilterLabel: string[] = ["Todos", "Favoritos", "Não favoritados"];
const pamentStatusLabel: string[] = ["Todos", "Pago", "Não Pago"];

export default function Finances(): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const bg: string = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard: string = isDark ? "#27272a" : "#f5f5f4";
  const headerText: string = isDark ? "#27272a" : "white";
  const text: string = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed: string = isDark ? "#3f3f46" : "#e7e5e4";

  // finance store selectors
  const filteredList: FinanceRow[] = useFinanceStore(useShallow((s: any) => s.getFilteredList()));
  const Incomings: number = useFinanceStore((s: any) => s.getIncomings());
  const Expenses: number = useFinanceStore((s: any) => s.getExpenses());
  const Total: number = useFinanceStore((s: any) => s.getListTotal());
  const Saldo: number = useFinanceStore((s: any) => s.getSaldo());
  const tithePercentFin: number = useSettingsStore((s: SettingsState) => s.tithePercent ?? 10);
  const titheCategoriesFinRaw: string = useSettingsStore((s: SettingsState) => s.titheCategories);
  const titheCategoriesFin: string[] = useMemo(() => {
    try { const p = typeof titheCategoriesFinRaw === 'string' ? JSON.parse(titheCategoriesFinRaw) : titheCategoriesFinRaw; if(Array.isArray(p)&&p.length) return p as string[]; } catch {}
    return ['Ganhos'];
  }, [titheCategoriesFinRaw]);
  const Tithe: number = useFinanceStore((s: any) => s.getTithe({ percent: tithePercentFin, categories: titheCategoriesFin }));
  const search: string = useFinanceStore((s: any) => s.search);
  const setSearch: (v: string) => void = useFinanceStore((s: any) => s.setSearch);
  const selectedtypeofpayment: string = useFinanceStore((s: any) => s.selectedtypeofpayment);
  const setselectedtypeofpayment: (v: string) => void = useFinanceStore((s: any) => s.setSelectedType);
  const selectedPaymentCategory: string = useFinanceStore((s: any) => s.selectedPaymentCategory);
  const setSelectedPaymentCategory: (v: string) => void = useFinanceStore((s: any) => s.setSelectedCategory);
  const selectedPaymentStatus: string = useFinanceStore((s: any) => s.selectedPaymentStatus);
  const setSelectedPaymentStatus: (v: string) => void = useFinanceStore((s: any) => s.setSelectedStatus);
  const selectedFavoritedFilter: string = useFinanceStore((s: any) => s.selectedFavoritedFilter);
  const setSelectedFavoritedFilter: (v: string) => void = useFinanceStore((s: any) => s.setSelectedFavorited);
  const startDate: string = useFinanceStore((s: any) => s.startDate);
  const endDate: string = useFinanceStore((s: any) => s.endDate);
  const setPeriod: (start: string, end: string) => void = useFinanceStore((s: any) => s.setPeriod);
  const setStartDate = (v: string): void => setPeriod(v, useFinanceStore.getState().endDate);
  const setEndDate = (v: string): void => setPeriod(useFinanceStore.getState().startDate, v);
  const handleFavorite: (dto: FinanceRow) => Promise<void> = useFinanceStore((s: any) => s.handleFavorite);
  const removeFinance: (dto: FinanceRow) => Promise<void> = useFinanceStore((s: any) => s.remove);
  const load: () => Promise<void> = useFinanceStore((s: any) => s.load);

  const isEnableTitheCard: boolean = useSettingsStore((s: SettingsState) => !!s.isEnableTitheCard);
  const isEnableTotalHistoryCard: boolean = useSettingsStore((s: SettingsState) => !!s.isEnableTotalHistoryCard);
  const simpleFinancesItem: boolean = useSettingsStore((s: SettingsState) => !!s.simpleFinancesItem);
  const isAiEnabled: boolean = useSettingsStore((s: SettingsState) => !!s.isAiEnabled);
  const isTitheMenuEnabled: boolean = useSettingsStore((s: SettingsState) => !!s.isTitheMenuEnabled);

  const [selectedTransaction, setSelectedTransaction] = useState<FinanceRow | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const onOpen = (): void => setIsOpen(true);
  const onClose = (): void => {
    setIsOpen(false);
    setIsEditMode(false);
  };
  const [confirmDeleteFinance, setConfirmDeleteFinance] = useState<FinanceRow | null>(null);

  const navigation: any = useNavigation();
  const isFocused: boolean = useIsFocused();

  const { setSelectedSheet } = usePagesStore();
  useEffect(() => {
    if (isFocused) setSelectedSheet("Finanças");
  }, [isFocused, setSelectedSheet]);

  useEffect(() => {
    load();
  }, []);

  const isKeyboardOpen: boolean = useIsKeyboardOpen();
  const { height } = useWindowDimensions();
  const tabBarHeight: number = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  };

  const insets = useSafeAreaInsets();
  const filterSheetRef = useSheetRef();

  const handleViewFinance = (item: FinanceRow): void => {
    setSelectedTransaction(item);
    setIsEditMode(false);
    onOpen();
  };
  const handleEditFinance = (item: FinanceRow): void => {
    setSelectedTransaction(item);
    setIsEditMode(true);
    onOpen();
  };
  const handleDeleteFinance = (item: FinanceRow): void => setConfirmDeleteFinance(item);
  const handleConfirmDeleteFinance = async (): Promise<void> => {
    if (!confirmDeleteFinance) return;
    await removeFinance(confirmDeleteFinance);
    setConfirmDeleteFinance(null);
  };

  const categoryItemLib: Record<string, React.ReactNode> = {
    Outros: <Feather name="dollar-sign" size={28} color={"#e83e5a"} />,
    Moradia: <Feather name="home" size={28} color={"#e83e5a"} />,
    Vestuário: <Ionicons name="shirt-outline" size={28} color={"#e83e5a"} />,
    Streaming: <Fontisto name="netflix" size={28} color={"#e83e5a"} />,
    Estudos: <Ionicons name="school-outline" size={28} color={"#e83e5a"} />,
    Beleza: <MaterialCommunityIcons name="lipstick" size={28} color={"#e83e5a"} />,
    Emergência: <MaterialCommunityIcons name="alarm-light-outline" size={28} color={"#e83e5a"} />,
    Mercado: <Feather name="shopping-cart" size={28} color={"#e83e5a"} />,
    "TV/Internet/Telefone": <Feather name="at-sign" size={28} color={"#e83e5a"} />,
    Transporte: <FontAwesome name="car" size={28} color={"#e83e5a"} />,
    Saúde: <FontAwesome name="medkit" size={28} color={"#e83e5a"} />,
    Cartão: <Feather name="credit-card" size={28} color={"#e83e5a"} />,
    "Bares e Restaurantes": <Feather name="coffee" size={28} color={"#e83e5a"} />,
    Ganhos: <Feather name="dollar-sign" size={28} color={"#12a454"} />,
    Investimentos: <FontAwesome name="line-chart" size={28} color={"#12a454"} />,
  };

  const onChangeStartDate = (_: any, selectedDate?: Date): void => {
    if (selectedDate) setStartDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };
  const onChangeEndDate = (_: any, selectedDate?: Date): void => {
    if (selectedDate) setEndDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };

  const listTotal: number = Total;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <Header
          title="Finança"
          isRightIconComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isTitheMenuEnabled && (
                <TouchableOpacity testID="header-tithe-heart" onPress={() => navigation.navigate("TitheSettings")} style={{ padding: 6 }}>
                  <Feather name="heart" size={20} color={headerText} />
                </TouchableOpacity>
              )}
              <Pressable
                onPress={() => navigation.navigate("Configuracoes")}
                style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="settings" size={20} color={headerText} />
              </Pressable>
            </View>
          }
        />

        <ScrollView
          horizontal
          style={{ width: "100%", marginTop: -50, height: 150 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ height: 130, paddingHorizontal: 8 }}
        >
          {isEnableTotalHistoryCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-saldo">
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: text, fontSize: 18 }}>Saldo</Text>
                <Feather name={Saldo >= 0 ? "arrow-up-circle" : "arrow-down-circle"} size={48} color={GREEN_500} />
              </View>
              <Text style={{ color: text, fontSize: Math.abs(Saldo) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
                {formatCurrency(Saldo)}
              </Text>
            </View>
          )}

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }} testID="card-entradas">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Entradas</Text>
              <Feather name="arrow-up-circle" size={48} color={GREEN_500} />
            </View>
            <Text style={{ color: text, fontSize: Incomings < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {formatCurrency(Incomings)}
            </Text>
          </View>

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }} testID="card-saidas">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Saídas</Text>
              <Feather name="arrow-down-circle" size={48} color={RED_500} />
            </View>
            <Text style={{ color: text, fontSize: Expenses < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {formatCurrency(Expenses)}
            </Text>
          </View>

          <View style={{ marginHorizontal: 4, backgroundColor: PURPLE_900, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }} testID="card-total">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "white", fontSize: 18 }}>Total</Text>
              <Feather name="dollar-sign" size={48} color="white" />
            </View>
            <Text style={{ color: "white", fontSize: Total < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {formatCurrency(Total)}
            </Text>
          </View>

          {isEnableTitheCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: PURPLE_900, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }} testID="card-dizimo">
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "white", fontSize: 18 }}>Dízimo</Text>
                <Feather name="dollar-sign" size={48} color="white" />
              </View>
              <Text style={{ color: "white", fontSize: Tithe < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
                {formatCurrency(Tithe)}
              </Text>
            </View>
          )}
        </ScrollView>

        {isTitheMenuEnabled && (
          <View testID="finances-tithe-monthly" style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: isDark ? "#3b0764" : "#f3e8ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e9d5ff" }}>
            <Text style={{ fontWeight: "700", color: isDark ? "#e9d5ff" : "#581C87" }}>
              Dízimo devido: {Tithe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity testID="finances-tithe-config" onPress={() => navigation.navigate("TitheSettings")} style={{ flex: 1, backgroundColor: "#9c44dc", borderRadius: 8, padding: 10, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Configurar</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="finances-tithe-pay" onPress={() => navigation.navigate("TitheSettings")} style={{ flex: 1, backgroundColor: isDark ? "transparent" : "white", borderWidth: 1, borderColor: "#9c44dc", borderRadius: 8, padding: 10, alignItems: "center" }}>
                <Text style={{ color: isDark ? "#e9d5ff" : "#9c44dc", fontWeight: "700" }}>Pagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          <Text style={{ fontSize: 14, color: text }}>* Totais apenas dos itens do período selecionado</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Extrato</Text>
            <TouchableOpacity
              onPress={() => filterSheetRef.current?.present()}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 28,
                paddingVertical: 6,
                borderWidth: 1,
                borderRadius: 20,
                backgroundColor: "transparent",
                borderColor: PURPLE_600,
              }}
            >
              <Text style={{ fontSize: 16, color: PURPLE_600 }}>
                <Feather name="filter" size={18} color={PURPLE_600} /> Filtros
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredList.length > 0 && (
          <TextInput
            placeholder="Pesquise os itens..."
            onChangeText={(t: string) => setSearch(t)}
            value={search}
            editable={true}
            style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, color: text }}
            placeholderTextColor="#a1a1aa"
          />
        )}

        {filteredList.length === 0 ? (
          <EmptyMessage />
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
            <Text style={{ color: text, marginBottom: 8, fontSize: 12 }}>
              Deslize para a direita para excluir • Deslize para a esquerda para editar • Toque na estrela para favoritar • Segure para visualizar
            </Text>
            <FlatList
              data={filteredList}
              keyExtractor={(item: FinanceRow) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }: { item: FinanceRow }) => (
                <SwipeableFinanceRow item={item} onEdit={handleEditFinance} onDelete={handleDeleteFinance}>
                  <FinanceCard
                    item={item}
                    onPress={() => {}}
                    onLongPress={handleViewFinance}
                    onFavorite={handleFavorite}
                    simpleFinancesItem={simpleFinancesItem}
                    testID={`finance-card-${item.id}`}
                  />
                </SwipeableFinanceRow>
              )}
              testID="finances-flatlist"
              ListFooterComponent={
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                  <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
                  <Text style={{ color: text, fontSize: 18, fontWeight: "700", flex: 1, textAlign: "right" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} ellipsizeMode="tail">
                    {listTotal.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                      useGrouping: true,
                    })}
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      </ScrollView>

      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedTransaction && (
            <EditItemForm onClose={onClose} selectedTransaction={selectedTransaction} initialEditable={isEditMode} />
          )}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>

      <ThemedAlert
        visible={!!confirmDeleteFinance}
        title="Excluir lançamento"
        message={confirmDeleteFinance ? `Deseja excluir "${confirmDeleteFinance.description}"?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteFinance}
        onCancel={() => setConfirmDeleteFinance(null)}
        onClose={() => setConfirmDeleteFinance(null)}
        testID="finance-delete-alert"
        confirmTestID="confirm-delete-finance"
        cancelTestID="cancel-delete-finance"
      />

      <Sheet ref={filterSheetRef} snapPoints={["85%"]} enableDynamicSizing={false} backgroundStyle={{ backgroundColor: bg }} handleIndicatorStyle={{ backgroundColor: isDark ? "#3f3f46" : "#e4e4e7" }}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 16 }} style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Filtros</Text>
            <Text style={{ fontSize: 12, color: text, marginTop: 4 }}>Refine seu extrato</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Filtrar por período</Text>
            <View style={{ width: "100%", flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangeStartDate, isDark })} style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, height: 48, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white" }}>
                <TextInput style={{ flex: 1, padding: 8, color: text }} placeholder="Data inicio" value={startDate} editable={false} pointerEvents="none" placeholderTextColor="#a1a1aa" />
                <View style={{ width: "25%", backgroundColor: PURPLE_600, height: "100%", alignItems: "center", justifyContent: "center", padding: 4 }}>
                  <Feather name="calendar" size={24} color="#FFF" />
                </View>
              </Pressable>
              <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangeEndDate, isDark })} style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, height: 48, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white" }}>
                <TextInput style={{ flex: 1, padding: 8, color: text }} placeholder="Data Fim" value={endDate} editable={false} pointerEvents="none" placeholderTextColor="#a1a1aa" />
                <View style={{ width: "25%", backgroundColor: PURPLE_600, height: "100%", alignItems: "center", justifyContent: "center", padding: 4 }}>
                  <Feather name="calendar" size={24} color="#FFF" />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700", flexShrink: 1 }}>Entradas/Saídas</Text>
            <View style={{ flex: 1, maxWidth: 160 }}>
              <ThemedPicker
                testID="finances-tipo-picker"
                selectedValue={selectedtypeofpayment}
                onValueChange={(v: string) => setselectedtypeofpayment(v)}
                items={[
                  { label: "Todas", value: "0" },
                  { label: "Entradas", value: "1" },
                  { label: "Saídas", value: "2" },
                ]}
              />
            </View>
          </View>

          {!simpleFinancesItem && (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: "700", flexShrink: 1 }}>Categoria de gastos</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedPicker
                    testID="finances-categoria-picker"
                    selectedValue={selectedPaymentCategory}
                    onValueChange={(v: string) => setSelectedPaymentCategory(v)}
                    items={categoriesList.map((cat: string) => ({ label: cat, value: cat }))}
                  />
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Status de pagamento</Text>
                <FlatList showsHorizontalScrollIndicator={false} horizontal ItemSeparatorComponent={() => <View style={{ width: 8, height: "100%" }} />} data={pamentStatusLabel} renderItem={({ item }: { item: string }) => (
                  <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 16, backgroundColor: "transparent", borderColor: item === selectedPaymentStatus ? PURPLE_600 : text }} onPress={() => setSelectedPaymentStatus(item)}>
                    <Text style={{ color: item === selectedPaymentStatus ? PURPLE_600 : text }}>{item}</Text>
                  </TouchableOpacity>
                )} />
              </View>
            </>
          )}

          <View>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Favoritos</Text>
            <FlatList showsHorizontalScrollIndicator={false} horizontal ItemSeparatorComponent={() => <View style={{ width: 8, height: "100%" }} />} data={favoritedFilterLabel} renderItem={({ item }: { item: string }) => (
              <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 16, backgroundColor: "transparent", borderColor: item === selectedFavoritedFilter ? PURPLE_600 : text }} onPress={() => setSelectedFavoritedFilter(item)}>
                <Text style={{ color: item === selectedFavoritedFilter ? PURPLE_600 : text }}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>

          <TouchableOpacity onPress={() => filterSheetRef.current?.dismiss()} style={{ backgroundColor: PURPLE_600, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Aplicar filtros</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </Sheet>
    </View>
  );
}
