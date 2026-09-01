import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
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
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";
import EditListForm from "../components/EditListForm";
import EditItemListItem from "../components/EdittemListtItem";

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
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
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

  const handleDeleteList = async (id, goBack) => {
    const { Alert, ToastAndroid } = require("react-native");
    Alert.alert("Deseja realmente deletar esse registro?", "Esta ação é irreversível! Deseja continuar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        onPress: async () => {
          await deleteList(id);
          ToastAndroid.show("Lista excluida", ToastAndroid.SHORT);
          if (goBack) goBack();
        },
      },
    ]);
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

      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }}>
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
                onPress={async () => { await handleDeleteList(selectedList?.id, () => navigation.navigate("Lists")); }}
              >
                <Feather name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -16 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Sua lista</Text>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue) => setSelectedCategory(itemValue)}
              mode="dropdown"
              dropdownIconColor="#9c44dc"
              enabled
              style={{ width: "50%", borderRadius: 4, color: text }}
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

          {selectedListItems.length > 0 && (
            <TextInput placeholder="Pesquise os itens..." onChangeText={(t) => setSearch(t)} value={search} editable={true} style={{ marginBottom: 16, borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, color: text }} placeholderTextColor="#a1a1aa" />
          )}

          <View style={{ gap: 8 }}>
            {filteredList.length === 0 ? (
              <EmptyMessage />
            ) : (
              filteredList.map((item) => (
                <Pressable
                  onPress={() => { setSelectedTransaction(item); setSelectedSheetOpen("editar-item"); onOpen(); }}
                  key={item.id}
                  style={({ pressed }) => ({ backgroundColor: pressed ? bgCardPressed : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8 })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ position: "absolute", top: 3, right: 3, flexDirection: "row", gap: 8 }}>
                      {!marketSimplifiedItems && (
                        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: item.quantityDesired <= item.quantity ? "#16a34a" : "#dc2626", borderRadius: 999, backgroundColor: "transparent" }}>
                          <Text style={{ fontSize: 12, color: item.quantityDesired <= item.quantity ? "#16a34a" : "#dc2626" }}>{item.quantityDesired <= item.quantity ? "Em estoque" : "Em falta"}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 16 }}>
                      <Feather name="shopping-bag" size={28} color={text} />
                      <View style={{ alignItems: "flex-start", width: "70%" }}>
                        <Text style={{ color: text, fontSize: 20 }}>{item.description}</Text>
                        <Text style={{ color: text, fontWeight: "700", lineHeight: 14 }}>{item.category}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={{ color: text }}>
                            <FontAwesome name="money" size={14} color={text} />{" "}
                            {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}{" "}
                            {marketSimplifiedItems && <FontAwesome name="times" size={14} color={text} />}
                            {marketSimplifiedItems && " " + item.quantity}
                          </Text>
                        </View>
                        {!marketSimplifiedItems && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginVertical: 8 }}>
                            <TouchableOpacity
                              style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: "#dc2626", alignItems: "center", justifyContent: "center" }}
                              onPress={() => item.quantity > 0 && updateQuantity(item, false)}
                            >
                              <Feather name="minus" size={20} color="#dc2626" />
                            </TouchableOpacity>
                            <Text style={{ color: text, fontSize: 20 }}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" }}
                              onPress={() => updateQuantity(item, true)}
                            >
                              <Feather name="plus" size={20} color="#16a34a" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", width: "35%" }}>
                      <Text style={{ width: "100%", textAlign: "right", color: text, fontSize: 18 }} numberOfLines={1}>
                        {(item.amount * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
          {selectedListItems.length > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>
                {listTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
              </Text>
            </View>
          )}
        </View>
        {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      </ScrollView>
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
            <EditItemListItem onClose={onClose} selectedTransaction={selectedTransaction} />
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
