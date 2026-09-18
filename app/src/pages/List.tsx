import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, FlatList, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import EditListForm from "../components/EditListForm";
import EditItemListItem from "../components/EdittemListtItem";
import AddItemListtItem from "../components/AddItemListtItem";
import { useShallow } from "zustand/react/shallow";
import ThemedPicker from "../components/ui/ThemedPicker";
import type { ListRow, ListItemRow } from "../repositories/list";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function List(): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const bg: string = isDark ? "#1c1e21" : "#f5f5f4";
  const headerText: string = isDark ? "#27272a" : "white";
  const text: string = isDark ? "#e4e4e7" : "#52525b";
  const isAiEnabled: boolean = useSettingsStore((s: SettingsState) => !!s.isAiEnabled);
  const marketSimplifiedItems: boolean = useSettingsStore((s: SettingsState) => !!s.marketSimplifiedItems);

  const { setSelectedSheet } = usePagesStore();
  const isFocused: boolean = useIsFocused();
  const refreshSelectedList: (id: string) => Promise<void> = useListsStore((s: any) => s.handleSelect);
  const selectedListForEffect: ListRow | null = useListsStore((s: any) => s.selectedList);
  useEffect(() => {
    if (isFocused) {
      setSelectedSheet("List");
      if (selectedListForEffect?.id) refreshSelectedList(selectedListForEffect.id);
    }
  }, [isFocused, setSelectedSheet, refreshSelectedList, selectedListForEffect?.id]);

  const isKeyboardOpen: boolean = useIsKeyboardOpen();
  const insets = useSafeAreaInsets();
  const tabBarHeight: number = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpen = (): void => setIsOpen(true);
  const onClose = (): void => setIsOpen(false);
  const [isItemEditMode, setIsItemEditMode] = useState<boolean>(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ListItemRow | null>(null);
  const [confirmDeleteListAlert, setConfirmDeleteListAlert] = useState<{ id: string } | null>(null);
  const navigation: any = useNavigation();

  const selectedCategory: string = useListsStore((s: any) => s.selectedCategory);
  const setSelectedCategory: (v: string) => void = useListsStore((s: any) => s.setSelectedCategory);
  const selectedList: ListRow | null = useListsStore((s: any) => s.selectedList);
  const selectedListItems: ListItemRow[] = useListsStore((s: any) => s.selectedListItems);
  const search: string = useListsStore((s: any) => s.search);
  const setSearch: (v: string) => void = useListsStore((s: any) => s.setSearch);
  const updateQuantity: (item: ListItemRow, isAdd: boolean) => Promise<void> = useListsStore((s: any) => s.updateQuantity);
  const deleteList: (id: string) => Promise<void> = useListsStore((s: any) => s.deleteList);
  const filteredList: ListItemRow[] = useListsStore(useShallow((s: any) => s.getFilteredList()));
  const listTotal: number = useListsStore((s: any) => s.getListTotal());

  const [selectedSheetOpen, setSelectedSheetOpen] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ListItemRow | null>(null);

  const handleDeleteList = (id: string | undefined): void => {
    if (!id) return;
    setConfirmDeleteListAlert({ id });
  };
  const handleConfirmDeleteList = async (): Promise<void> => {
    if (!confirmDeleteListAlert) return;
    const { ToastAndroid } = require("react-native");
    await deleteList(confirmDeleteListAlert.id);
    ToastAndroid.show("Lista excluida", ToastAndroid.SHORT);
    setConfirmDeleteListAlert(null);
    navigation.navigate("Lists");
  };
  const handleViewItem = (item: ListItemRow): void => {
    setSelectedTransaction(item);
    setIsItemEditMode(false);
    setSelectedSheetOpen("editar-item");
    onOpen();
  };
  const handleEditItem = (item: ListItemRow): void => {
    setSelectedTransaction(item);
    setIsItemEditMode(true);
    setSelectedSheetOpen("editar-item");
    onOpen();
  };
  const handleDeleteItem = (item: ListItemRow): void => setConfirmDeleteItem(item);
  const handleConfirmDeleteItem = async (): Promise<void> => {
    if (!confirmDeleteItem) return;
    const storeDeleteItem: (id: string, listId: string) => Promise<void> = useListsStore.getState().deleteItem;
    await storeDeleteItem(confirmDeleteItem.id, (confirmDeleteItem as any).list_id ?? selectedList?.id ?? "");
    setConfirmDeleteItem(null);
  };
  const onCloseItemModal = (): void => {
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
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontWeight: "700", fontSize: 20, color: text }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{selectedList?.description}</Text>
              <Text style={{ fontSize: 14, color: text, marginTop: 4 }}>Local de compra: {selectedList?.location === "" || !selectedList?.location ? "Sem mercado" : selectedList?.location}</Text>
              <Text style={{ fontSize: 14, color: text }}>Criado em: {selectedList?.date ? new Date(selectedList.date).toLocaleDateString("pt-BR") : ""}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                testID="edit-list-header-button"
                onPress={() => { setSelectedSheetOpen("editar"); onOpen(); }}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "#16a34a" : "#22c55e", backgroundColor: isDark ? "#14532d" : "#f0fdf4" }}
              >
                <Feather name="edit" size={18} color={isDark ? "#86efac" : "#16a34a"} />
                <Text style={{ color: isDark ? "#86efac" : "#16a34a", fontWeight: "700" }}>Editar lista</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="delete-list-header-button"
                onPress={() => handleDeleteList(selectedList?.id)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "#991b1b" : "#fecaca", backgroundColor: isDark ? "#7f1d1d" : "#fef2f2" }}
              >
                <Feather name="trash" size={18} color={isDark ? "#fca5a5" : "#ef4444"} />
                <Text style={{ color: isDark ? "#fca5a5" : "#ef4444", fontWeight: "700" }}>Excluir lista</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: isDark ? "#3f3f46" : "#e7e5e4", marginTop: 8 }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text, flexShrink: 1 }}>Sua lista</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedPicker
                testID="list-category-picker"
                selectedValue={selectedCategory}
                onValueChange={(v: string) => setSelectedCategory(v)}
                items={[
                  { label: "Todos os itens", value: "Todos os itens" },
                  { label: "Carnes", value: "Carnes" },
                  { label: "Fruteira", value: "Fruteira" },
                  { label: "Higiêne", value: "Higiêne" },
                  { label: "Limpeza", value: "Limpeza" },
                  { label: "Mercearia", value: "Mercearia" },
                  { label: "Outros", value: "Outros" },
                ]}
              />
            </View>
          </View>

          {selectedListItems.length > 0 && (
            <TextInput placeholder="Pesquise os itens..." onChangeText={(t: string) => setSearch(t)} value={search} editable={true} style={{ marginBottom: 16, borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, color: text }} placeholderTextColor="#a1a1aa" />
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
                keyExtractor={(item: ListItemRow) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }: { item: ListItemRow }) => (
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
              <EditItemListItem onClose={onCloseItemModal} selectedTransaction={selectedTransaction as any} initialEditable={isItemEditMode} />
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
