import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, Modal, FlatList, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
import ListCard from "../components/ui/ListCard";
import SwipeableRow from "../components/SwipeableRow";
import ThemedAlert from "../components/ui/ThemedAlert";
import EditListForm from "../components/EditListForm";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";

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

export default function Lists() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed = isDark ? "#3f3f46" : "#e7e5e4";
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);

  const { setSelectedSheet } = usePagesStore();
  const isFocused = useIsFocused();
  const loadLists = useListsStore((s) => s.load);
  useEffect(() => {
    if (isFocused) {
      setSelectedSheet("Lists");
      loadLists();
    }
  }, [isFocused, loadLists]);

  const isKeyboardOpen = useIsKeyboardOpen();
  const insets = useSafeAreaInsets();
  const tabBarHeight = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();

  const lists = useListsStore((s) => s.lists);
  const handleSelectList = useListsStore((s) => s.handleSelect);
  const deleteList = useListsStore((s) => s.deleteList);
  const [confirmDeleteList, setConfirmDeleteList] = useState(null);
  const handleExportList = async (id) => {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show("Exportação de lista disponível em breve", ToastAndroid.SHORT);
  };
  const handleDeleteListSwipe = (item) => setConfirmDeleteList(item);
  const handleConfirmDeleteList = async () => {
    if (!confirmDeleteList) return;
    await deleteList(confirmDeleteList.id);
    setConfirmDeleteList(null);
  };
  const handleEditListSwipe = async (item) => {
    await handleSelectList(item.id);
    setSelectedSheetOpen("editar");
    onOpen();
  };

  const [selectedSheetOpen, setSelectedSheetOpen] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Header
        title="Lista"
        isShort
        isLeftIconComponent={
          <TouchableOpacity onPress={() => navigation.navigate("Stock")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
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
          <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Suas listas de compras</Text>
          <Text style={{ marginBottom: 16, fontSize: 14, color: text }}>Crie suas listas de compra e adicione ao estoque para seu controle. Pressione e segure para exportar uma lista.</Text>

          {lists.length === 0 ? (
            <EmptyMessage />
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: text, marginBottom: 8, fontSize: 12 }}>
                Deslize para a direita para excluir • Deslize para a esquerda para editar • Segure para exportar
              </Text>
              <FlatList
                data={lists}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <SwipeableRow
                    item={item}
                    onEdit={handleEditListSwipe}
                    onDelete={handleDeleteListSwipe}
                    editTestID={`list-swipe-edit-${item.id}`}
                    deleteTestID={`list-swipe-delete-${item.id}`}
                    rowTestID={`swipe-list-row-${item.id}`}
                  >
                    <ListCard
                      item={item}
                      onPress={() => {
                        handleSelectList(item.id);
                        navigation.navigate("List");
                      }}
                      onLongPress={() => handleExportList(item.id)}
                      testID={`list-card-${item.id}`}
                    />
                  </SwipeableRow>
                )}
                testID="lists-flatlist"
              />
            </View>
          )}
        </View>
      </ScrollView>

      <ThemedAlert
        visible={!!confirmDeleteList}
        title="Excluir lista"
        message={confirmDeleteList ? `Deseja excluir "${confirmDeleteList.description}"?` : undefined}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteList}
        onCancel={() => setConfirmDeleteList(null)}
        onClose={() => setConfirmDeleteList(null)}
        testID="lists-delete-alert"
        confirmTestID="confirm-delete-list"
        cancelTestID="cancel-delete-list"
      />

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
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
          ) : selectedSheetOpen === "estimativa" ? (
            <EstimativeForm onClose={onClose} />
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
