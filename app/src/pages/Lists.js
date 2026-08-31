import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
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
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";

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
  useEffect(() => {
    if (isFocused) setSelectedSheet("Lists");
  }, [isFocused]);

  const isKeyboardOpen = useIsKeyboardOpen();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();

  const lists = useListsStore((s) => s.lists);
  const handleSelectList = useListsStore((s) => s.handleSelect);
  const handleExportList = async (id) => {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show("Exportação de lista disponível em breve", ToastAndroid.SHORT);
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

      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Suas listas de compras</Text>
          <Text style={{ marginBottom: 16, fontSize: 14, color: text }}>Crie suas listas de compra e adicione ao estoque para seu controle. Pressione e segure para exportar uma lista.</Text>

          <View>
            {lists.length === 0 ? (
              <EmptyMessage />
            ) : (
              lists.map((item, index) => (
                <Pressable
                  key={item.id ?? index}
                  style={({ pressed }) => ({ width: "100%", backgroundColor: pressed ? bgCardPressed : bgCard, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, padding: 8, marginVertical: 4 })}
                  onPress={() => {
                    handleSelectList(item.id);
                    navigation.navigate("List");
                  }}
                  onLongPress={() => handleExportList(item.id)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ marginHorizontal: 8 }}>
                      <Feather name="shopping-cart" size={28} color={text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, color: text }}>{item.description}</Text>
                      <Text style={{ fontSize: 14, color: text }}>{item.location === "" ? "Sem mercado definido" : item.location}</Text>
                      <Text style={{ fontSize: 14, color: text }}>{item.quantity} itens</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", width: "34%" }}>
                      <Text style={{ fontSize: 18, color: text }} numberOfLines={1}>
                        {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {selectedSheetOpen === "editar" ? (
            <EditShoppingCartItem onClose={onClose} selectedTransaction={{}} />
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
