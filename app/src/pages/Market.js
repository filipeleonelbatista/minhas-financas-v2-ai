import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
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
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useMarketStore } from "../stores/market";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";

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
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const navigation = useNavigation();
  const { height } = useWindowDimensions();

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

  const updateStock = async (item, isAdd, isSub) => {
    const currentQuantity = isAdd ? Number(item.quantity) + 1 : isSub ? Number(item.quantity) - 1 : item.quantity;
    await updateStore(item.id, { quantity: Number(currentQuantity) });
  };

  const handleAddItensOnBuyList = (goListsPage) => {
    const { Alert, ToastAndroid } = require("react-native");
    Alert.alert("Adicionar itens do estoque", "Deseja adicionar itens do estoque a uma lista de compras?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Somente em falta",
        onPress: async () => {
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
        },
      },
      {
        text: "Todos os itens",
        onPress: async () => {
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
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <TouchableOpacity
        style={{ position: "absolute", bottom: isAiEnabled ? 132 : 20, left: 16, backgroundColor: "#9c44dc", width: 40, height: 40, zIndex: 100, alignItems: "center", justifyContent: "center", borderRadius: 999 }}
        onPress={() => handleAddItensOnBuyList(() => navigation.navigate("Lists"))}
      >
        <MaterialCommunityIcons name="file-plus-outline" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ position: "absolute", bottom: isAiEnabled ? 82 : 8, left: 16, backgroundColor: "#9c44dc", width: 40, height: 40, zIndex: 100, alignItems: "center", justifyContent: "center", borderRadius: 999 }}
        onPress={() => navigation.navigate("Lists")}
      >
        <MaterialCommunityIcons name="format-list-bulleted" size={20} color="white" />
      </TouchableOpacity>

      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }}>
        <Header
          isShort
          title="Compra"
          isRightIconComponent={
            <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="settings" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -16 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Seu estoque</Text>
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
          <View style={{ gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
            <Text style={{ color: text, marginBottom: 16 }}>Toque no item para visualizar e depois editar ou excluir.</Text>
            {filteredList.map((item) => (
              <Pressable
                onPress={() => {
                  setSelectedTransaction(item);
                  setSelectedSheetOpen("editar");
                  onOpen();
                }}
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
                            onPress={() => item.quantity > 0 && updateStock(item, false, true)}
                          >
                            <Feather name="minus" size={20} color="#dc2626" />
                          </TouchableOpacity>
                          <Text style={{ color: text, fontSize: 20 }}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" }}
                            onPress={() => updateStock(item, true, false)}
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
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>
                {listTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedSheetOpen === "editar" ? (
            <EditShoppingCartItem onClose={onClose} selectedTransaction={selectedTransaction} />
          ) : selectedSheetOpen === "estimativa" ? (
            <EstimativeForm onClose={onClose} />
          ) : (
            <ErrorSheet />
          )}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>
    </View>
  );
}
