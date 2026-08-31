import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { differenceInCalendarDays } from "date-fns";
import { LineChart, PieChart } from "react-native-chart-kit";
import * as Progress from "react-native-progress";
import AIComponent from "../components/AIComponent";
import EditGoalForm from "../components/EditGoalForm";
import EmptyMessage from "../components/EmptyMessage";
import ErrorSheet from "../components/ErrorSheet";
import Header from "../components/Header";
import ViewFuelReport from "../components/ViewFuelReport";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { useFinanceStore } from "../stores/finance";
import { useRunsStore } from "../stores/runs";
import { useGoalsStore } from "../stores/goals";
import { useSettingsStore } from "../stores/settings";
import { usePagesStore } from "../stores/pages";

export default function Reports() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const bgCardButton = isDark ? "#3f3f46" : "#e7e5e4";
  const bgCardPressed = isDark ? "#3f3f46" : "#e7e5e4";
  const headerText = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);

  const { setSelectedSheet } = usePagesStore();
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) setSelectedSheet("Relatórios");
  }, [isFocused]);

  const isKeyboardOpen = useIsKeyboardOpen();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [currentSelectedSheet, setCurrentSelectedSheet] = useState(null);
  const [selectedValue, setSelectedValue] = useState(0);
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const filteredList = useFinanceStore((s) => s.getFilteredList());
  const Incomings = useFinanceStore((s) => s.getIncomings());
  const Expenses = useFinanceStore((s) => s.getExpenses());
  const FuelList = useRunsStore((s) => s.runsList);
  const goalsList = useGoalsStore((s) => s.goals);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const formatCurrency = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

  const [selectedRunsFilter, setSelectedRunsFilter] = useState("litro");

  const runsChartData = useMemo(() => {
    const currentFuelList = FuelList;
    const last8Elements = [...currentFuelList].sort((a, b) => a.date - b.date).slice(-8);
    const labels = last8Elements.map((item) => {
      const dateObj = new Date(item.date);
      const dia = dateObj.getUTCDate().toString().padStart(2, "0");
      const mes = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
      return `${dia}/${mes}`;
    });
    const data = last8Elements.map((item) => (selectedRunsFilter === "litro" ? item.unityAmount : item.amount));
    return { labels, data, fullList: last8Elements };
  }, [FuelList, selectedRunsFilter]);

  const expensesByCatData = useMemo(() => {
    const getSum = (cat) => {
      const filteredCategoryArray = filteredList.filter((item) => item.category === cat);
      let totalSelectedCat = 0.0;
      for (const item of filteredCategoryArray) totalSelectedCat = item.amount + totalSelectedCat;
      return totalSelectedCat;
    };
    const data = [
      { name: "Cartão", population: getSum("Cartão"), color: "#2D0D45", legendFontColor: text, legendFontSize: 14 },
      { name: "Moradia", population: getSum("Moradia"), color: "#391056", legendFontColor: text, legendFontSize: 14 },
      { name: "Vestuário", population: getSum("Vestuário"), color: "#4F1778", legendFontColor: text, legendFontSize: 14 },
      { name: "Streaming", population: getSum("Streaming"), color: "#661D9A", legendFontColor: text, legendFontSize: 14 },
      { name: "Estudos", population: getSum("Estudos"), color: "#7D24BC", legendFontColor: text, legendFontSize: 14 },
      { name: "Beleza", population: getSum("Beleza"), color: "#9231D8", legendFontColor: text, legendFontSize: 14 },
      { name: "Emergência", population: getSum("Emergência"), color: "#9C44DC", legendFontColor: text, legendFontSize: 14 },
      { name: "Outros", population: getSum("Outros"), color: "#AA5DE0", legendFontColor: text, legendFontSize: 14 },
      { name: "Mercado", population: getSum("Mercado"), color: "#B16BE3", legendFontColor: text, legendFontSize: 14 },
      { name: "TV/Internet/Telefone", population: getSum("TV/Internet/Telefone"), color: "#C693EA", legendFontColor: text, legendFontSize: 14 },
      { name: "Transporte", population: getSum("Transporte"), color: "#D4AEF0", legendFontColor: text, legendFontSize: 14 },
      { name: "Saúde", population: getSum("Saúde"), color: "#DBBCF2", legendFontColor: text, legendFontSize: 14 },
      { name: "Bares e Restaurantes", population: getSum("Bares e Restaurantes"), color: "#DBBCF2", legendFontColor: text, legendFontSize: 14 },
    ];
    const filteredData = data.filter((item) => item.population > 0);
    const sortedData = filteredData.sort((a, b) => (a.population < b.population ? 1 : a.population > b.population ? -1 : 0));
    return sortedData;
  }, [filteredList, text]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView style={{ flex: 1, width: "100%", height: "100%" }}>
        <Header
          title="Relatório"
          isRightIconComponent={
            <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")} style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Feather name="settings" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        <View style={{ gap: 16, paddingHorizontal: 16 }}>
          <View style={{ borderRadius: 4, backgroundColor: bgCard, paddingVertical: 8, paddingHorizontal: 16, marginTop: -50, elevation: 2 }}>
            {filteredList.length === 0 ? (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: text, fontSize: 20 }}>Sem dados para analisar</Text>
                <Text style={{ color: text, textAlign: "center" }}>Adicione e atualize os dados em finanças para ver o relatório aqui.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: text, fontSize: 20 }}>Saúde das finanças</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name="arrow-up-circle" size={36} color="#12a454" />
                    <View style={{ alignItems: "flex-start" }}>
                      <Text style={{ color: text, fontSize: 18 }}>Ganhos</Text>
                      <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>{formatCurrency(Incomings)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: text, fontSize: 18 }}>Despesas</Text>
                      <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>{formatCurrency(Expenses)}</Text>
                    </View>
                    <Feather name="arrow-down-circle" size={36} color="#e83e5a" />
                  </View>
                </View>
                <Progress.Bar
                  progress={ (Incomings * 100) / (Incomings + Expenses) / 100 >= 1 ? 1 : (Incomings * 100) / (Incomings + Expenses) / 100 }
                  width={width * 0.81}
                  height={14}
                  borderRadius={16}
                  color="#16a34a"
                  unfilledColor="#dc2626"
                  borderWidth={0}
                />
              </View>
            )}

            {expensesByCatData.length > 0 && (
              <View style={{ gap: 8, position: "relative", marginTop: 8 }}>
                <Text style={{ color: text, fontSize: 18, fontWeight: "700" }}>Gastos por categoria</Text>
                <PieChart
                  width={width * 0.81}
                  height={width * 0.6}
                  data={expensesByCatData}
                  strokeWidth={16}
                  radius={32}
                  chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                />
              </View>
            )}

            {FuelList.length > 0 && runsChartData && (
              <View style={{ marginTop: 8, gap: 8, alignItems: "center" }}>
                <Text style={{ color: text, fontSize: 18, width: "100%" }}>Abastecimentos</Text>
                <View style={{ marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2, borderRadius: 4, backgroundColor: bgCardButton, width: "100%", flexDirection: "row" }}>
                  <Pressable
                    onPress={() => setSelectedRunsFilter("litro")}
                    style={{ flex: 1, padding: 8, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: selectedRunsFilter === "litro" ? "#a855f7" : bgCardButton, backgroundColor: bgCardButton, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "500", color: selectedRunsFilter === "litro" ? "#a855f7" : text }}>Por Litro</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedRunsFilter("pago")}
                    style={{ flex: 1, padding: 8, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: selectedRunsFilter === "pago" ? "#a855f7" : bgCardButton, backgroundColor: bgCardButton, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "500", color: selectedRunsFilter === "pago" ? "#a855f7" : text }}>Pago</Text>
                  </Pressable>
                </View>
                <View style={{ marginLeft: -20 }}>
                  <LineChart
                    onDataPointClick={({ index }) => {
                      setCurrentSelectedSheet("fuel");
                      setSelectedValue(index);
                      onOpen();
                    }}
                    data={{ labels: runsChartData.labels, datasets: [{ data: runsChartData.data.length ? runsChartData.data : [0], color: () => "#581c87", strokeWidth: 1.5 }] }}
                    width={width * 0.84}
                    height={220}
                    chartConfig={{
                      backgroundGradientFrom: bgCard,
                      backgroundGradientFromOpacity: 1,
                      backgroundGradientTo: bgCard,
                      backgroundGradientToOpacity: 1,
                      color: () => text,
                      barPercentage: 0.5,
                      useShadowColorFromDataset: true,
                      propsForVerticalLabels: { fontSize: 10 },
                    }}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: text }}>Minhas metas</Text>
            <Text style={{ fontSize: 14, color: text }}>Adicione e atualize suas metas financeiras.</Text>
          </View>

          {goalsList.length === 0 && <EmptyMessage />}

          {goalsList.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => { setSelectedTransaction(goal); setCurrentSelectedSheet("editar"); onOpen(); }}
              style={({ pressed }) => ({ backgroundColor: pressed ? bgCardPressed : bgCard, borderRadius: 2, elevation: 2 })}
            >
              <View style={{ alignItems: "center", backgroundColor: bgCard, borderRadius: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                  <Text style={{ color: text, fontSize: 18 }}>{goal.description}</Text>
                  <Text style={{ color: text, fontSize: 12 }}>{"Prazo: "}{new Date(goal.date).toLocaleDateString("pt-BR")}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: text, fontSize: 14, textAlign: "right" }}>
                      {goal.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })} {" /"}
                    </Text>
                    <Text style={{ color: text, fontSize: 16, fontWeight: "700", textAlign: "right" }}>
                      {goal.currentAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                    </Text>
                  </View>
                  {differenceInCalendarDays(goal.date, Date.now()) <= 30 && (
                    <Text style={{ color: text, fontSize: 16, fontWeight: "700", textAlign: "left" }}>Restam {differenceInCalendarDays(goal.date, Date.now())} dias</Text>
                  )}
                </View>
                <Progress.Bar
                  progress={ (goal.currentAmount * 100) / goal.amount / 100 >= 1 ? 1 : (goal.currentAmount * 100) / goal.amount / 100 }
                  width={width * 0.85}
                  height={14}
                  borderRadius={16}
                  color={ (goal.currentAmount * 100) / goal.amount / 100 >= 1 ? "#e9d5ff" : "#9c44dc" }
                  unfilledColor={ (goal.currentAmount * 100) / goal.amount / 100 >= 1 ? "#e9d5ff66" : "#9c44dc66" }
                  borderWidth={0}
                />
              </View>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 16, width: "100%" }} />
      </ScrollView>

      {isAiEnabled && <View style={{ width: "100%", height: 64 }} />}
      <AIComponent />

      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={text} />
          </Pressable>
          {currentSelectedSheet === "editar" ? (
            <EditGoalForm onClose={onClose} selectedTransaction={selectedTransaction} />
          ) : currentSelectedSheet === "fuel" ? (
            <ViewFuelReport selectedValue={runsChartData.fullList[selectedValue]} />
          ) : (
            <ErrorSheet />
          )}
          <View style={{ height: 64, width: "100%" }} />
        </View>
      </Modal>
    </View>
  );
}
