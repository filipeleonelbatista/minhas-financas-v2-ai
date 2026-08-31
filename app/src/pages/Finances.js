import React, { useState, useEffect } from "react";
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
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import EditItemForm from "../components/EditItemForm";
import EmptyMessage from "../components/EmptyMessage";
import Header from "../components/Header";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useSettingsStore } from "../stores/settings";
import { useFinanceStore } from "../stores/finance";
import { useShallow } from "zustand/react/shallow";
import AIComponent from "../components/AIComponent";
import { NativeBaseProvider } from "native-base";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";
const GREEN_500 = "#22c55e";
const GREEN_600 = "#16a34a";
const RED_500 = "#ef4444";
const RED_600 = "#dc2626";
const YELLOW_400 = "#facc15";

const categoriesList = [
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

const favoritedFilterLabel = ["Todos", "Favoritos", "Não favoritados"];
const pamentStatusLabel = ["Todos", "Pago", "Não Pago"];

export default function Finances() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCardPressed = isDark ? "#3f3f46" : "#e7e5e4";

  // finance store selectors
  const filteredList = useFinanceStore(useShallow((s) => s.getFilteredList()));
  const Incomings = useFinanceStore((s) => s.getIncomings());
  const Expenses = useFinanceStore((s) => s.getExpenses());
  const Total = useFinanceStore((s) => s.getListTotal());
  const Saldo = useFinanceStore((s) => s.getSaldo());
  const Tithe = useFinanceStore((s) => s.getTithe({ percent: 10 }));
  const search = useFinanceStore((s) => s.search);
  const setSearch = useFinanceStore((s) => s.setSearch);
  const selectedtypeofpayment = useFinanceStore((s) => s.selectedtypeofpayment);
  const setselectedtypeofpayment = useFinanceStore((s) => s.setSelectedType);
  const selectedPaymentCategory = useFinanceStore((s) => s.selectedPaymentCategory);
  const setSelectedPaymentCategory = useFinanceStore((s) => s.setSelectedCategory);
  const selectedPaymentStatus = useFinanceStore((s) => s.selectedPaymentStatus);
  const setSelectedPaymentStatus = useFinanceStore((s) => s.setSelectedStatus);
  const selectedFavoritedFilter = useFinanceStore((s) => s.selectedFavoritedFilter);
  const setSelectedFavoritedFilter = useFinanceStore((s) => s.setSelectedFavorited);
  const startDate = useFinanceStore((s) => s.startDate);
  const endDate = useFinanceStore((s) => s.endDate);
  const setPeriod = useFinanceStore((s) => s.setPeriod);
  const setStartDate = (v) => setPeriod(v, useFinanceStore.getState().endDate);
  const setEndDate = (v) => setPeriod(useFinanceStore.getState().startDate, v);
  const handleFavorite = useFinanceStore((s) => s.handleFavorite);
  const load = useFinanceStore((s) => s.load);

  const isEnableTitheCard = useSettingsStore((s) => !!s.isEnableTitheCard);
  const isEnableTotalHistoryCard = useSettingsStore((s) => !!s.isEnableTotalHistoryCard);
  const simpleFinancesItem = useSettingsStore((s) => !!s.simpleFinancesItem);
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    load();
  }, []);

  // Pages context replacement: track selectedSheet via simple store or just ignore
  // Keep for FAB: we skip setSelectedSheet

  const isKeyboardOpen = useIsKeyboardOpen();
  const { height } = useWindowDimensions();

  const formatCurrency = (value) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  };

  const [openFilter, setOpenFilter] = useState(false);

  const categoryItemLib = {
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

  const onChangeStartDate = (_, selectedDate) => {
    if (selectedDate) setStartDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };
  const onChangeEndDate = (_, selectedDate) => {
    if (selectedDate) setEndDate(dayjs(selectedDate).format("DD/MM/YYYY"));
  };

  const listTotal = Total;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }}>
        <Header
          title="Finança"
          isRightIconComponent={
            <Pressable
              onPress={() => navigation.navigate("Configuracoes")}
              style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="settings" size={20} color={headerText} />
            </Pressable>
          }
        />

        <ScrollView
          horizontal
          style={{ width: "100%", marginTop: -50, height: 150 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ height: 130, paddingHorizontal: 8 }}
        >
          {isEnableTotalHistoryCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: text, fontSize: 18 }}>Entradas</Text>
                <Feather name={Saldo > 0 ? "arrow-up-circle" : "arrow-down-circle"} size={48} color={GREEN_500} />
              </View>
              <Text style={{ color: text, fontSize: Saldo < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
                {formatCurrency(Saldo)}
              </Text>
            </View>
          )}

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Entradas</Text>
              <Feather name="arrow-up-circle" size={48} color={GREEN_500} />
            </View>
            <Text style={{ color: text, fontSize: Incomings < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
              {formatCurrency(Incomings)}
            </Text>
          </View>

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Saídas</Text>
              <Feather name="arrow-down-circle" size={48} color={RED_500} />
            </View>
            <Text style={{ color: text, fontSize: Expenses < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
              {formatCurrency(Expenses)}
            </Text>
          </View>

          <View style={{ marginHorizontal: 4, backgroundColor: PURPLE_900, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "white", fontSize: 18 }}>Total</Text>
              <Feather name="dollar-sign" size={48} color="white" />
            </View>
            <Text style={{ color: "white", fontSize: Total < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
              {formatCurrency(Total)}
            </Text>
          </View>

          {isEnableTitheCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: PURPLE_900, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "white", fontSize: 18 }}>Dízimo</Text>
                <Feather name="dollar-sign" size={48} color="white" />
              </View>
              <Text style={{ color: "white", fontSize: Tithe < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
                {formatCurrency(Tithe)}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          <Text style={{ fontSize: 14, color: text }}>* Totais apenas dos itens do período selecionado</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Extrato</Text>
            <TouchableOpacity
              onPress={() => setOpenFilter(!openFilter)}
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
          {openFilter && (
            <View style={{ marginTop: 8, gap: 8 }}>
              <View style={{ gap: 8 }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Filtrar por período</Text>
                <View style={{ width: "100%", flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4 }}>
                    <TextInput
                      style={{ flex: 1, padding: 8, color: text }}
                      placeholder="Data inicio"
                      value={startDate}
                      editable={false}
                    />
                    <TouchableOpacity
                      style={{ width: "25%", backgroundColor: PURPLE_600, height: "100%", alignItems: "center", justifyContent: "center", padding: 4 }}
                      onPress={() => DateTimePickerAndroid.open({ value: new Date(Date.now()), onChange: onChangeStartDate, mode: "date", is24Hour: false })}
                    >
                      <Feather name="calendar" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4 }}>
                    <TextInput
                      style={{ flex: 1, padding: 8, color: text }}
                      placeholder="Data Fim"
                      value={endDate}
                      editable={false}
                    />
                    <TouchableOpacity
                      style={{ width: "25%", backgroundColor: PURPLE_600, height: "100%", alignItems: "center", justifyContent: "center", padding: 4 }}
                      onPress={() => DateTimePickerAndroid.open({ value: new Date(Date.now()), onChange: onChangeEndDate, mode: "date", is24Hour: false })}
                    >
                      <Feather name="calendar" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Entradas/Saídas</Text>
                <Picker
                  selectedValue={selectedtypeofpayment}
                  onValueChange={(itemValue) => setselectedtypeofpayment(itemValue)}
                  mode="dropdown"
                  dropdownIconColor={PURPLE_600}
                  enabled
                  style={{ width: "50%", borderRadius: 4, color: text }}
                >
                  <Picker.Item label="Todas" value="0" />
                  <Picker.Item label="Entradas" value="1" />
                  <Picker.Item label="Saídas" value="2" />
                </Picker>
              </View>
              {!simpleFinancesItem && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Categoria de gastos</Text>
                    <Picker
                      selectedValue={selectedPaymentCategory}
                      onValueChange={(itemValue) => setSelectedPaymentCategory(itemValue)}
                      mode="dropdown"
                      dropdownIconColor={PURPLE_600}
                      enabled
                      style={{ width: "50%", borderRadius: 4, color: text }}
                    >
                      {categoriesList.map((cat, index) => (
                        <Picker.Item key={index} label={cat} value={cat} />
                      ))}
                    </Picker>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Status de pagamento</Text>
                    <FlatList
                      showsHorizontalScrollIndicator={false}
                      horizontal
                      ItemSeparatorComponent={() => <View style={{ width: 8, height: "100%" }} />}
                      data={pamentStatusLabel}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={{
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderWidth: 1,
                            borderRadius: 16,
                            backgroundColor: "transparent",
                            borderColor: item === selectedPaymentStatus ? PURPLE_600 : text,
                          }}
                          onPress={() => setSelectedPaymentStatus(item)}
                        >
                          <Text style={{ color: item === selectedPaymentStatus ? PURPLE_600 : text }}>{item}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </>
              )}

              <View>
                <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Favoritos</Text>
                <FlatList
                  showsHorizontalScrollIndicator={false}
                  horizontal
                  ItemSeparatorComponent={() => <View style={{ width: 8, height: "100%" }} />}
                  data={favoritedFilterLabel}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderRadius: 16,
                        backgroundColor: "transparent",
                        borderColor: item === selectedFavoritedFilter ? PURPLE_600 : text,
                      }}
                      onPress={() => setSelectedFavoritedFilter(item)}
                    >
                      <Text style={{ color: item === selectedFavoritedFilter ? PURPLE_600 : text }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}
        </View>

        {filteredList.length > 0 && (
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
            <Text style={{ color: text, marginBottom: 8 }}>
              Toque no item para visualizar e depois editar ou excluir.{"\n"}Segure para adicionar/remover dos favoritos
            </Text>

            {filteredList.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedTransaction(item);
                  onOpen();
                }}
                onLongPress={() => handleFavorite(item)}
                style={({ pressed }) => ({
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  elevation: 2,
                  borderRadius: 4,
                  backgroundColor: pressed ? bgCardPressed : bgCard,
                  position: "relative",
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", width: "100%", gap: 8, padding: 8 }}>
                  <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {!simpleFinancesItem && item.isEnabled === 1 && (
                      <View
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          paddingVertical: 2,
                          paddingHorizontal: 8,
                          borderWidth: 1,
                          borderColor: item.paymentStatus === 1 ? GREEN_600 : RED_600,
                          borderRadius: 999,
                          backgroundColor: "transparent",
                        }}
                      >
                        <Text style={{ fontSize: 10, color: item.paymentStatus === 1 ? GREEN_600 : RED_600 }}>
                          {item.paymentStatus === 1 ? "Pago" : "Não Pago"}
                        </Text>
                      </View>
                    )}
                    <FontAwesome
                      name={item.isFavorited === 1 ? "star" : "star-o"}
                      size={18}
                      color={item.isFavorited === 1 ? YELLOW_400 : text}
                    />
                  </View>
                  <View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 16 }}>
                    {item.isEnabled === 1 ? (
                      item.category ? (
                        categoryItemLib[item.category] || <Feather name="arrow-down-circle" size={28} color={RED_600} />
                      ) : (
                        <Feather name="arrow-down-circle" size={28} color={RED_600} />
                      )
                    ) : (
                      <Feather name="arrow-up-circle" size={28} color={GREEN_600} />
                    )}
                    <View style={{ alignItems: "flex-start", flex: 1 }}>
                      <Text style={{ fontSize: 18, color: text }}>{item.description}</Text>
                      {item.date !== "" && (
                        <Text style={{ color: text }}>
                          {item.isEnabled === 1 ? "Dt. Venc.: " : "Dt. Receb.: "}
                          {new Date(item.date).toLocaleDateString("pt-BR")}
                        </Text>
                      )}
                      {!simpleFinancesItem && item.paymentDate !== "" && item.isEnabled === 1 && (
                        <Text style={{ color: text }}>Dt. Pgto.: {new Date(item.paymentDate).toLocaleDateString("pt-BR")}</Text>
                      )}
                      {!simpleFinancesItem && <Text style={{ color: text }}>Cat.: {item.category}</Text>}
                    </View>
                    <View style={{ alignItems: "flex-end", width: "34%" }}>
                      <Text style={{ fontSize: 18, color: text, marginTop: 16, marginRight: 12 }} numberOfLines={1}>
                        {item.isEnabled === 1 ? "-" : ""}
                        {item.amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                          useGrouping: true,
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>
                {listTotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  useGrouping: true,
                })}
              </Text>
            </View>
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
            <NativeBaseProvider>
              <EditItemForm onClose={onClose} selectedTransaction={selectedTransaction} />
            </NativeBaseProvider>
          )}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>
    </View>
  );
}
