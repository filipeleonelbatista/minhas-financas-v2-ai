import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, FlatList, useWindowDimensions } from "react-native";
import { Feather, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import AIComponent from "../components/AIComponent";
import EditShoppingCartItem from "../components/EditShoppingCartItem";
import EmptyMessage from "../components/EmptyMessage";
import ErrorSheet from "../components/ErrorSheet";
import EstimativeForm from "../components/EstimativeForm";
import Header from "../components/Header";
import StockCard from "../components/ui/StockCard";
import SwipeableRow from "../components/SwipeableRow";
import ThemedAlert from "../components/ui/ThemedAlert";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useMarketStore } from "../stores/market";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import { Sheet, useSheetRef } from "../components/nativewindui/Sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let BorderBeam: any = null;
try { BorderBeam = require("../components/ui/border-beam").BorderBeam || require("../components/ui/border-beam/index").BorderBeam || require("../components/ui/border-beam/index").default || null; } catch {}

const PURPLE_600 = "#9c44dc";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function Market() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed = isDark ? "#3f3f46" : "#e7e5e4";

  const { setSelectedSheet } = usePagesStore();
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) setSelectedSheet("Stock");
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

  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);

  const stockList = useMarketStore((s) => s.stockList);
  const search = useMarketStore((s) => s.search);
  const setSearch = useMarketStore((s) => s.setSearch);
  const selectedCategory = useMarketStore((s) => s.selectedCategory);
  const setSelectedCategory = useMarketStore((s) => s.setSelectedCategory);
  const load = useMarketStore((s) => s.load);
  const updateStore = useMarketStore((s) => s.update);
  const listsAddList = useListsStore((s) => s.addList);
  const listsAddItem = useListsStore((s) => s.addItem);

  const MarketList = stockList;
  const filteredList = useMarketStore((s) => s.getFiltered());
  const listTotal = filteredList.reduce((acc, it) => acc + Number(it.amount) * Number(it.quantity), 0);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedSheetOpen, setSelectedSheetOpen] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmDeleteMarket, setConfirmDeleteMarket] = useState(null);
  const removeStock = useMarketStore((s) => s.remove);

  const updateStock = async (item, isAdd, isSub) => {
    const currentQuantity = isAdd ? Number(item.quantity) + 1 : isSub ? Number(item.quantity) - 1 : item.quantity;
    await updateStore(item.id, { quantity: Number(currentQuantity) });
  };

  const handleViewStock = (item) => {
    setSelectedTransaction(item);
    setIsEditMode(false);
    setSelectedSheetOpen("editar");
    onOpen();
  };
  const handleEditStock = (item) => {
    setSelectedTransaction(item);
    setIsEditMode(true);
    setSelectedSheetOpen("editar");
    onOpen();
  };
  const handleDeleteStock = (item) => setConfirmDeleteMarket(item);
  const handleConfirmDeleteStock = async () => {
    if (!confirmDeleteMarket) return;
    await removeStock(confirmDeleteMarket.id);
    setConfirmDeleteMarket(null);
  };
  const onCloseStockModal = () => {
    onClose();
    setIsEditMode(false);
  };

  const [showAddToListAlert, setShowAddToListAlert] = useState(false);
  const [addToListCallback, setAddToListCallback] = useState(null);
  const handleAddItensOnBuyList = (goListsPage) => {
    setAddToListCallback(() => goListsPage);
    setShowAddToListAlert(true);
  };
  const handleAddToListConfirm = async (mode) => {
    const { ToastAndroid } = require("react-native");
    const goListsPage = addToListCallback;
    setShowAddToListAlert(false);
    if (mode === "falta") {
      const lowest = MarketList.filter((i) => i.quantity < i.quantityDesired);
      if (lowest.length > 0) {
        const totalAmount = lowest.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
        const totalQuantity = lowest.reduce((acc, t) => acc + Number(t.quantity), 0);
        const createdList = { description: "Em falta no estoque", location: "", amount: totalAmount, quantity: totalQuantity, date: Date.now() + 43200000 };
        const currentId = await listsAddList(createdList);
        if (currentId !== null) {
          for (const item of lowest) {
            await listsAddItem({ list_id: currentId, description: item.description, category: item.category, amount: item.amount, quantity: item.quantity, quantityDesired: item.quantityDesired, location: createdList.location, date: createdList.date });
          }
        }
        if (goListsPage) goListsPage();
      } else {
        ToastAndroid.show("Nenhum item em falta para criar esta lista", ToastAndroid.SHORT);
      }
    } else if (mode === "todos") {
      if (MarketList.length > 0) {
        const totalAmount = MarketList.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
        const totalQuantity = MarketList.reduce((acc, t) => acc + Number(t.quantity), 0);
        const createdList = { description: "Itens do estoque", location: "", amount: totalAmount, quantity: totalQuantity, date: Date.now() + 43200000 };
        const currentId = await listsAddList(createdList);
        if (currentId !== null) {
          for (const item of MarketList) {
            await listsAddItem({ list_id: currentId, description: item.description, category: item.category, amount: item.amount, quantity: item.quantity, quantityDesired: item.quantityDesired, location: createdList.location, date: createdList.date });
          }
        }
        if (goListsPage) goListsPage();
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <Header
          isShort
          title="Estoque"
          isRightIconComponent={
            <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="settings" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        <View style={{ padding: 16, gap: 16, marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Seu estoque</Text>
            <TouchableOpacity
              onPress={() => filterSheetRef.current?.present()}
              style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 6, borderWidth: 1, borderRadius: 20, backgroundColor: isDark ? "#27272a" : "transparent", borderColor: isDark ? "#6d28d9" : "#9c44dc" }}
              testID="market-filter-button"
            >
              <Text style={{ fontSize: 16, color: isDark ? "#c4b5fd" : "#9c44dc" }}>
                <Feather name="filter" size={18} color={isDark ? "#c4b5fd" : "#9c44dc"} /> Filtros
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {MarketList.length > 0 && (
          <TextInput
            placeholder="Pesquise os itens..."
            onChangeText={(t) => setSearch(t)}
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
              Deslize para a direita para excluir • Deslize para a esquerda para editar • Segure para visualizar
            </Text>
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <SwipeableRow
                  item={item}
                  onEdit={handleEditStock}
                  onDelete={handleDeleteStock}
                  editTestID={`stock-swipe-edit-${item.id}`}
                  deleteTestID={`stock-swipe-delete-${item.id}`}
                  rowTestID={`swipe-stock-row-${item.id}`}
                >
                  <StockCard
                    item={item}
                    onPress={() => {}}
                    onLongPress={handleViewStock}
                    onUpdateStock={updateStock}
                    marketSimplifiedItems={marketSimplifiedItems}
                    testID={`stock-card-${item.id}`}
                  />
                </SwipeableRow>
              )}
              testID="market-flatlist"
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
      </ScrollView>

      <Modal visible={showAddToListAlert} animationType="fade" transparent onRequestClose={() => setShowAddToListAlert(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: isDark ? "#27272a" : "white", borderRadius: 16, padding: 20, borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#3f3f46" : "transparent" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "#581c87" : "#f3e8ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isDark ? "#6d28d9" : "#e9d5ff" }}>
                <Feather name="shopping-cart" size={24} color={isDark ? "#c4b5fd" : PURPLE_600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Adicionar itens do estoque</Text>
                <Text style={{ fontSize: 13, color: isDark ? "#a1a1aa" : "#6b7280", marginTop: 2 }}>Escolha quais itens levar para a lista</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: text, marginBottom: 20 }}>Deseja adicionar itens do estoque a uma lista de compras?</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={() => setShowAddToListAlert(false)} style={{ backgroundColor: isDark ? "#3f3f46" : "#f3f4f6", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#52525b" : "transparent" }} testID="market-add-cancel">
                <Text style={{ color: text, fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddToListConfirm("falta")} style={{ backgroundColor: isDark ? "#581c87" : "#f3e8ff", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: isDark ? "#6d28d9" : "#e9d5ff" }} testID="market-add-falta">
                <Text style={{ color: isDark ? "#c4b5fd" : PURPLE_600, fontWeight: "700" }}>somente itens em estoque baixo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddToListConfirm("todos")} style={{ backgroundColor: PURPLE_600, borderRadius: 12, paddingVertical: 12, alignItems: "center" }} testID="market-add-todos">
                <Text style={{ color: "white", fontWeight: "700" }}>todos os itens do estoque</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {(() => {
        const fabSize = 64;
        const fabBottom = tabBarHeight + 16;
        const fabBottomSecond = fabBottom + fabSize + 12;
        const icon1 = <MaterialCommunityIcons name="file-plus-outline" size={28} color="white" />;
        const icon2 = <MaterialCommunityIcons name="format-list-bulleted" size={28} color="white" />;
        const onPress1 = () => handleAddItensOnBuyList(() => navigation.navigate("Lists"));
        const onPress2 = () => navigation.navigate("Lists");
        const Fab1 = (() => {
          if (BorderBeam) return (
            <View style={{ position: "absolute", bottom: fabBottomSecond - 12, right: 4, zIndex: 10, padding: 12 }} testID="market-add-list-button-wrapper">
              <BorderBeam borderRadius={fabSize/2} borderWidth={2} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2 }}>
                <TouchableOpacity testID="market-add-list-button" onPress={onPress1} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2, backgroundColor: PURPLE_600, alignItems: "center", justifyContent: "center" }}>{icon1}</TouchableOpacity>
              </BorderBeam>
            </View>
          );
          return <TouchableOpacity testID="market-add-list-button" onPress={onPress1} style={{ position: "absolute", bottom: fabBottomSecond, right: 16, width: 56, height: 56, backgroundColor: PURPLE_600, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, zIndex: 10 }}>{icon1}</TouchableOpacity>;
        })();
        const Fab2 = (() => {
          if (BorderBeam) return (
            <View style={{ position: "absolute", bottom: fabBottom - 12, right: 4, zIndex: 10, padding: 12 }} testID="market-lists-button-wrapper">
              <BorderBeam borderRadius={fabSize/2} borderWidth={2} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2 }}>
                <TouchableOpacity testID="market-lists-button" onPress={onPress2} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2, backgroundColor: PURPLE_600, alignItems: "center", justifyContent: "center" }}>{icon2}</TouchableOpacity>
              </BorderBeam>
            </View>
          );
          return <TouchableOpacity testID="market-lists-button" onPress={onPress2} style={{ position: "absolute", bottom: fabBottom, right: 16, width: 56, height: 56, backgroundColor: PURPLE_600, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, zIndex: 10 }}>{icon2}</TouchableOpacity>;
        })();
        return <>{Fab1}{Fab2}</>;
      })()}

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onCloseStockModal} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onCloseStockModal} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedSheetOpen === "editar" ? (
            <EditShoppingCartItem onClose={onCloseStockModal} selectedTransaction={selectedTransaction} initialEditable={isEditMode} />
          ) : selectedSheetOpen === "estimativa" ? (
            <EstimativeForm onClose={onCloseStockModal} />
          ) : (
            <ErrorSheet />
          )}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>

      <ThemedAlert
        visible={!!confirmDeleteMarket}
        title="Excluir produto"
        message={confirmDeleteMarket ? `Deseja excluir "${confirmDeleteMarket.description}"?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteStock}
        onCancel={() => setConfirmDeleteMarket(null)}
        onClose={() => setConfirmDeleteMarket(null)}
        testID="market-delete-alert"
        confirmTestID="confirm-delete-market"
        cancelTestID="cancel-delete-market"
      />

      <Sheet ref={filterSheetRef} snapPoints={["50%"]} enableDynamicSizing={false} backgroundStyle={{ backgroundColor: bg }} handleIndicatorStyle={{ backgroundColor: isDark ? "#3f3f46" : "#e4e4e7" }}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 16 }} style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Filtros do estoque</Text>
            <Text style={{ fontSize: 12, color: text, marginTop: 4 }}>Filtre por categoria</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Categoria</Text>
            <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, backgroundColor: isDark ? "#27272a" : "white", overflow: "hidden" }}>
              <Picker selectedValue={selectedCategory} onValueChange={(itemValue) => setSelectedCategory(itemValue)} mode="dropdown" dropdownIconColor="#9c44dc" enabled style={{ width: "100%", color: text }}>
                <Picker.Item label="Todos os itens" value="Todos os itens" />
                <Picker.Item label="Carnes" value="Carnes" />
                <Picker.Item label="Fruteira" value="Fruteira" />
                <Picker.Item label="Higiêne" value="Higiêne" />
                <Picker.Item label="Limpeza" value="Limpeza" />
                <Picker.Item label="Mercearia" value="Mercearia" />
                <Picker.Item label="Outros" value="Outros" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity onPress={() => filterSheetRef.current?.dismiss()} style={{ backgroundColor: "#9c44dc", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Aplicar filtros</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </Sheet>
    </View>
  );
}
