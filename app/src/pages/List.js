import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, FlatList, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import AIComponent from "../components/AIComponent";
import EmptyMessage from "../components/EmptyMessage";
import ErrorSheet from "../components/ErrorSheet";
import Header from "../components/Header";
import ListItemCard from "../components/ui/ListItemCard";
import SwipeableRow from "../components/SwipeableRow";
import ThemedAlert from "../components/ui/ThemedAlert";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import EditListForm from "../components/EditListForm";
import EditItemListItem from "../components/EdittemListtItem";
import AddItemListtItem from "../components/AddItemListtItem";

let RadiantButton = null;
try {
  RadiantButton = require("../components/ui").RadiantButton ?? require("../components/ui/index").RadiantButton ?? null;
} catch {
  try { RadiantButton = require("reacticx").RadiantButton ?? null; } catch {}
}
let ChromaRing = null;
try {
  ChromaRing = require("../components/ui/ChromaRing").ChromaRing ?? require("reacticx").ChromaRing ?? null;
} catch {}

const PURPLE_600 = "#9c44dc";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function List() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed = isDark ? "#3f3f46" : "#e7e5e4";
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);

  const { setSelectedSheet } = usePagesStore();
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) setSelectedSheet("List");
  }, [isFocused]);

  const isKeyboardOpen = useIsKeyboardOpen();
  const insets = useSafeAreaInsets();
  const tabBarHeight = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [isItemEditMode, setIsItemEditMode] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [confirmDeleteListAlert, setConfirmDeleteListAlert] = useState(null);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();

  const selectedCategory = useListsStore((s) => s.selectedCategory);
  const setSelectedCategory = useListsStore((s) => s.setSelectedCategory);
  const selectedList = useListsStore((s) => s.selectedList);
  const selectedListItems = useListsStore((s) => s.selectedListItems);
  const search = useListsStore((s) => s.search);
  const setSearch = useListsStore((s) => s.setSearch);
  const updateQuantity = useListsStore((s) => s.updateQuantity);
  const deleteList = useListsStore((s) => s.deleteList);
  const filteredList = useListsStore((s) => s.getFilteredList());
  const listTotal = useListsStore((s) => s.getListTotal());

  const [selectedSheetOpen, setSelectedSheetOpen] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const handleDeleteList = (id) => setConfirmDeleteListAlert({ id });
  const handleConfirmDeleteList = async () => {
    if (!confirmDeleteListAlert) return;
    const { ToastAndroid } = require("react-native");
    await deleteList(confirmDeleteListAlert.id);
    ToastAndroid.show("Lista excluida", ToastAndroid.SHORT);
    setConfirmDeleteListAlert(null);
    navigation.navigate("Lists");
  };
  const handleViewItem = (item) => {
    setSelectedTransaction(item);
    setIsItemEditMode(false);
    setSelectedSheetOpen("editar-item");
    onOpen();
  };
  const handleEditItem = (item) => {
    setSelectedTransaction(item);
    setIsItemEditMode(true);
    setSelectedSheetOpen("editar-item");
    onOpen();
  };
  const handleDeleteItem = (item) => setConfirmDeleteItem(item);
  const handleConfirmDeleteItem = async () => {
    if (!confirmDeleteItem) return;
    try {
      const { listRepo } = require("../repositories/list");
      await listRepo.deleteItem(confirmDeleteItem.id);
      const { useListsStore: _store } = require("../stores/lists");
      await _store.getState().handleSelect(selectedList?.id);
    } catch {}
    setConfirmDeleteItem(null);
  };
  const onCloseItemModal = () => {
    onClose();
    setIsItemEditMode(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Header
        title="Item"
        isShort
        isLeftIconComponent={
          <TouchableOpacity onPress={() => navigation.navigate("Lists")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={20} color={headerText} />
          </TouchableOpacity>
        }
        isRightIconComponent={
          <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
            <Feather name="settings" size={20} color={headerText} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>{selectedList?.description}</Text>
              <Text style={{ fontSize: 14, color: text }}>Local de compra: {selectedList?.location === "" ? "Sem mercado" : selectedList?.location}</Text>
              <Text style={{ fontSize: 14, color: text }}>Criado em: {selectedList?.date ? new Date(selectedList?.date).toLocaleDateString("pt-BR") : ""}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: "#22c55e", alignItems: "center", justifyContent: "center" }}
                onPress={() => { setSelectedSheetOpen("editar"); onOpen(); }}
              >
                <Feather name="edit" size={20} color="#22c55e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: "#ef4444", alignItems: "center", justifyContent: "center" }}
                onPress={() => handleDeleteList(selectedList?.id)}
              >
                <Feather name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -16 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Sua lista</Text>
            <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", flex: 1, marginLeft: 12, maxWidth: "50%" }}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                mode="dropdown"
                dropdownIconColor="#9c44dc"
                enabled
                style={{ width: "100%", color: text, height: 48 }}
              >
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

          {selectedListItems.length > 0 && (
            <TextInput placeholder="Pesquise os itens..." onChangeText={(t) => setSearch(t)} value={search} editable={true} style={{ marginBottom: 16, borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, color: text }} placeholderTextColor="#a1a1aa" />
          )}

          {filteredList.length === 0 ? (
            <EmptyMessage />
          ) : (
            <View style={{ marginTop: 8 }}>
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
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    editTestID={`listitem-swipe-edit-${item.id}`}
                    deleteTestID={`listitem-swipe-delete-${item.id}`}
                    rowTestID={`swipe-listitem-row-${item.id}`}
                  >
                    <ListItemCard
                      item={item}
                      onPress={() => {}}
                      onLongPress={handleViewItem}
                      onUpdateQuantity={updateQuantity}
                      marketSimplifiedItems={marketSimplifiedItems}
                      testID={`listitem-card-${item.id}`}
                    />
                  </SwipeableRow>
                )}
                testID="listitems-flatlist"
              />
            </View>
          )}
          {selectedListItems.length > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700", flex: 1, textAlign: "right" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} ellipsizeMode="tail">
                {listTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
              </Text>
            </View>
          )}
        </View>
        {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      </ScrollView>

      {(() => {
        const fabSize = 64;
        const fabBottom = tabBarHeight + 16;
        const FabContent = (
          <View style={{ width: fabSize, height: fabSize, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="plus" size={28} color="white" />
          </View>
        );
        const onPressFab = () => { setSelectedSheetOpen("adicionar-item"); onOpen(); };
        if (RadiantButton) {
          return (
            <View style={{ position: "absolute", bottom: fabBottom, right: 16, zIndex: 10 }} testID="list-fab-wrapper">
              <RadiantButton
                testID="list-fab"
                onPress={onPressFab}
                borderRadius={fabSize / 2}
                borderWidth={2}
                duration={2800}
                showDots={false}
                showShimmer={true}
                showGlow={true}
                glowBlur={18}
                glowWidth={0.7}
                breathingEnabled={true}
                paddingHorizontal={0}
                paddingVertical={0}
                style={{ width: fabSize, height: fabSize, borderRadius: fabSize / 2 }}
                theme={{ background: "#9333ea", backgroundSubtle: "#581C87", foreground: "#ffffff", highlight: "#f3e8ff", highlightSubtle: "#a78bfa" }}
              >
                <View style={{ width: fabSize, height: fabSize, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="plus" size={28} color="white" />
                </View>
              </RadiantButton>
            </View>
          );
        }
        if (ChromaRing) {
          return (
            <Pressable testID="list-fab" onPress={onPressFab} style={{ position: "absolute", bottom: fabBottom, right: 16, zIndex: 10 }}>
              <ChromaRing width={fabSize} height={fabSize} borderWidth={2} speed={1.0} base="#581C87" glow={PURPLE_600} background={PURPLE_600} style={{ width: fabSize, height: fabSize, borderRadius: fabSize / 2 }}>{FabContent}</ChromaRing>
            </Pressable>
          );
        }
        return (
          <TouchableOpacity testID="list-fab" onPress={onPressFab} style={{ position: "absolute", bottom: fabBottom, right: 16, width: 56, height: 56, backgroundColor: PURPLE_600, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, zIndex: 10 }}>
            <Feather name="plus" size={28} color="#FFF" />
          </TouchableOpacity>
        );
      })()}

      <ThemedAlert
        visible={!!confirmDeleteListAlert}
        title="Excluir lista"
        message={confirmDeleteListAlert ? `Deseja excluir a lista?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteList}
        onCancel={() => setConfirmDeleteListAlert(null)}
        onClose={() => setConfirmDeleteListAlert(null)}
        testID="list-delete-alert"
        confirmTestID="confirm-delete-list-alert"
        cancelTestID="cancel-delete-list-alert"
      />
      <ThemedAlert
        visible={!!confirmDeleteItem}
        title="Excluir item"
        message={confirmDeleteItem ? `Deseja excluir "${confirmDeleteItem.description}"?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setConfirmDeleteItem(null)}
        onClose={() => setConfirmDeleteItem(null)}
        testID="listitem-delete-alert"
        confirmTestID="confirm-delete-listitem"
        cancelTestID="cancel-delete-listitem"
      />

      <AIComponent />
            <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false} statusBarTranslucent>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top","bottom"]}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#e4e4e7" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 8 }}>
            <Pressable onPress={onClose} style={{ padding: 12, borderRadius: 999, backgroundColor: "#f5f5f4" }}>
              <Feather name="x" size={20} color={text} />
            </Pressable>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={insets.top + 12} style={{ flex: 1 }}>
          {selectedSheetOpen === "editar" ? (
            <EditListForm onClose={onClose} />
          ) : selectedSheetOpen === "editar-item" ? (
            <EditItemListItem onClose={onCloseItemModal} selectedTransaction={selectedTransaction} initialEditable={isItemEditMode} />
          ) : selectedSheetOpen === "adicionar-item" ? (
            <AddItemListtItem onClose={onClose} />
          ) : (
            <ErrorSheet />
          )}
            <View style={{ height: 24, width: "100%" }} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
