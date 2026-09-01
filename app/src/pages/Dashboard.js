import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Dimensions, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { differenceInCalendarDays } from "date-fns";
import Header from "../components/Header";
import InteractivePieChart from "../components/InteractivePieChart";
import { financeRepo } from "../repositories/finance";
import { goalRepo } from "../repositories/goal";
import { useSettingsStore } from "../stores/settings";

// Charts fallback (jest without native svg may fail)
let PieChartComp = null;
let LineChartComp = null;
try {
  // eslint-disable-next-line global-require
  const chartKit = require("react-native-chart-kit");
  PieChartComp = chartKit.PieChart;
  LineChartComp = chartKit.LineChart;
} catch {
  PieChartComp = () => null;
  LineChartComp = () => null;
}

const { width } = Dimensions.get("window");

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
}

// Pure helpers exported for tests

export function calcHeroValues(list = []) {
  let Saldo = 0;
  let Incomings = 0;
  let Expenses = 0;
  let Tithe = 0;
  for (const item of list) {
    const amount = Number(item.amount) || 0;
    if (item.isEnabled) {
      Saldo -= amount;
      Expenses += amount;
    } else {
      Saldo += amount;
      Incomings += amount;
    }
  }
  Tithe = (Incomings * 10) / 100;
  if (Tithe < 0) Tithe = 0;
  return { Saldo, Incomings, Expenses, Tithe, Total: Saldo };
}

export function getExpensesByCategory(list = []) {
  const palette = ["#581C87", "#7D24BC", "#9C44DC", "#AA5DE0", "#C693EA", "#D4AEF0", "#2D0D45", "#391056", "#4F1778", "#661D9A", "#9231D8", "#9C44DC"];
  const cats = [
    "Cartão",
    "Moradia",
    "Vestuário",
    "Streaming",
    "Estudos",
    "Beleza",
    "Emergência",
    "Outros",
    "Mercado",
    "TV/Internet/Telefone",
    "Transporte",
    "Saúde",
    "Bares e Restaurantes",
  ];
  const map = {};
  for (const cat of cats) map[cat] = 0;
  for (const item of list) {
    if (item.isEnabled) {
      const cat = item.category || "Outros";
      if (map[cat] === undefined) map[cat] = 0;
      map[cat] += Number(item.amount) || 0;
    }
  }
  const data = Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, population], idx) => ({
      name,
      population,
      color: palette[idx % palette.length],
      legendFontColor: "#6B7280",
      legendFontSize: 12,
    }))
    .sort((a, b) => b.population - a.population);
  return data;
}

export function getLast6MonthsLineData(list = []) {
  const now = dayjs();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = now.subtract(i, "month");
    months.push(d);
  }
  const labels = months.map((m) => m.locale("pt-br").format("MMM YY").toLowerCase());
  const incomings = months.map((m) => {
    const start = m.startOf("month").valueOf();
    const end = m.endOf("month").valueOf();
    return list
      .filter((it) => !it.isEnabled && it.date >= start && it.date <= end)
      .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  });
  const expenses = months.map((m) => {
    const start = m.startOf("month").valueOf();
    const end = m.endOf("month").valueOf();
    return list
      .filter((it) => it.isEnabled && it.date >= start && it.date <= end)
      .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  });
  const net = months.map((_, idx) => incomings[idx] - expenses[idx]);
  return { labels, incomings, expenses, net };
}

export function getUrgentGoals(goals = []) {
  const now = Date.now();
  return goals
    .filter((g) => {
      const days = differenceInCalendarDays(new Date(g.date), now);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);
}

export function calcGoalProgress(goal) {
  if (!goal || !goal.amount) return 0;
  const p = (Number(goal.currentAmount) / Number(goal.amount));
  return p >= 1 ? 1 : p < 0 ? 0 : p;
}

export default function Dashboard() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const cardBgWhite = isDark ? "#27272a" : "white";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";
  const titleText = isDark ? "#e4e4e7" : "#374151";
  const headerText = isDark ? "#27272a" : "white";
  const isEnableTotalHistoryCard = useSettingsStore((s) => !!s.isEnableTotalHistoryCard);
  const isEnableTitheCard = useSettingsStore((s) => !!s.isEnableTitheCard);

  const [finances, setFinances] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPieIndex, setSelectedPieIndex] = useState(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  const tabBarHeight = (() => { try { const { useBottomTabBarHeight } = require("@react-navigation/bottom-tabs"); return useBottomTabBarHeight(); } catch { return 80; } })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, g] = await Promise.all([financeRepo.getAll(), goalRepo.getAll()]);
      setFinances(f || []);
      setGoals(g || []);
    } catch {
      setFinances([]);
      setGoals([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) load();
    else load();
  }, [isFocused, load]);

  const hero = useMemo(() => calcHeroValues(finances), [finances]);
  const pieData = useMemo(() => getExpensesByCategory(finances), [finances]);
  const lineData = useMemo(() => getLast6MonthsLineData(finances), [finances]);
  const urgentGoals = useMemo(() => getUrgentGoals(goals), [goals]);

  useEffect(() => {
    if (selectedPieIndex !== null && selectedPieIndex >= pieData.length) {
      setSelectedPieIndex(null);
    }
  }, [pieData.length, selectedPieIndex]);

  useEffect(() => {
    if (selectedLineIndex !== null && selectedLineIndex >= lineData.labels.length) {
      setSelectedLineIndex(null);
    }
  }, [lineData.labels.length, selectedLineIndex]);

  const hasFinances = finances.length > 0;
  const chartWidth = width * 0.92;
  const chartInnerWidth = Math.min(chartWidth - 32, width - 64);
  const pieSize = Math.min(160, Math.round(chartWidth * 0.48));

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <Header
          title="Minhas Financa"
          isRightIconComponent={
            <TouchableOpacity
              onPress={() => navigation.navigate("Configuracoes")}
              style={{ padding: 8, borderRadius: 999 }}
              testID="header-settings"
            >
              <Feather name="settings" size={20} color={headerText} />
            </TouchableOpacity>
          }
        />

        {/* Hero cards - estilo replicado de Finanças, com darkmode - mesma regra de visualização de Finanças */}
        <ScrollView
          horizontal
          style={{ width: "100%", marginTop: -50, height: 150 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ height: 130, paddingHorizontal: 8 }}
          testID="hero-scroll"
        >
          {isEnableTotalHistoryCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-saldo">
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: text, fontSize: 18 }}>Saldo</Text>
                <Feather name={hero.Saldo >= 0 ? "arrow-up-circle" : "arrow-down-circle"} size={48} color={GREEN_500} />
              </View>
              <Text style={{ color: text, fontSize: Math.abs(hero.Saldo) < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
                {formatCurrency(hero.Saldo)}
              </Text>
            </View>
          )}

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-entradas">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Entradas</Text>
              <Feather name="arrow-up-circle" size={48} color={GREEN_500} />
            </View>
            <Text style={{ color: text, fontSize: hero.Incomings < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
              {formatCurrency(hero.Incomings)}
            </Text>
          </View>

          <View style={{ marginHorizontal: 4, backgroundColor: bgCard, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-saidas">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: text, fontSize: 18 }}>Saídas</Text>
              <Feather name="arrow-down-circle" size={48} color={RED_500} />
            </View>
            <Text style={{ color: text, fontSize: hero.Expenses < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
              {formatCurrency(hero.Expenses)}
            </Text>
          </View>

          {isEnableTitheCard && (
            <View style={{ marginHorizontal: 4, backgroundColor: PURPLE_900, minWidth: 180, height: 110, borderRadius: 4, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 }} testID="card-dizimo">
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "white", fontSize: 18 }}>Dízimo</Text>
                <Feather name="heart" size={48} color="white" />
              </View>
              <Text style={{ color: "white", fontSize: hero.Tithe < 10000 ? 26 : 20, maxWidth: 170 }} numberOfLines={1}>
                {formatCurrency(hero.Tithe)}
              </Text>
            </View>
          )}
        </ScrollView>
        <Text style={{ fontSize: 12, color: subText, marginTop: 8, paddingHorizontal: 16, marginBottom: 4 }}>
          * Totais do período geral
        </Text>

        {/* Pizza gastos por categoria */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: cardBgWhite, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: titleText }} testID="pizza-title">
            Gastos por categoria
          </Text>
          {!hasFinances || pieData.length === 0 ? (
            <Text style={{ fontSize: 14, color: subText, marginTop: 8, textAlign: "center" }} testID="pizza-empty">
              Sem gastos para exibir
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }} testID="pizza-chart">
              {/* Disco clicável - cada fatia selecionável com realce */}
              <View style={{ width: pieSize, height: pieSize, alignItems: "center", justifyContent: "center" }}>
                <InteractivePieChart
                  data={pieData}
                  width={pieSize}
                  height={pieSize}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft={0}
                  selectedIndex={selectedPieIndex}
                  onSelect={(idx) => setSelectedPieIndex((prev) => (prev === idx ? null : idx))}
                  chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
                  testID="interactive-pie"
                />
                {selectedPieIndex !== null && pieData[selectedPieIndex] ? (
                  <View
                    testID="pizza-tooltip"
                    style={{
                      position: "absolute",
                      backgroundColor: isDark ? "#27272a" : "white",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      shadowColor: "#000",
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 6,
                      borderWidth: 1,
                      borderColor: pieData[selectedPieIndex].color,
                      alignItems: "center",
                      minWidth: 140,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: pieData[selectedPieIndex].color }} />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: titleText }}>{pieData[selectedPieIndex].name}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: titleText, marginTop: 4 }}>{formatCurrency(pieData[selectedPieIndex].population)}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedPieIndex(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginTop: 4 }}
                      testID="pizza-tooltip-close"
                    >
                      <Text style={{ fontSize: 11, color: subText }}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              {/* Legenda ao lado do gráfico - scroll 5 itens + metade do 6º indicando overflow */}
              <ScrollView
                style={{ flex: 1, maxHeight: 187 }}
                contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                showsVerticalScrollIndicator={true}
                testID="pizza-legend"
                nestedScrollEnabled
              >
                {pieData.map((item, idx) => {
                  const isSelected = selectedPieIndex === idx;
                  const isDimmed = selectedPieIndex !== null && !isSelected;
                  return (
                    <TouchableOpacity
                      key={`${item.name}-${idx}`}
                      onPress={() => setSelectedPieIndex((prev) => (prev === idx ? null : idx))}
                      testID={`legend-${item.name}`}
                      accessibilityLabel={item.name}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        alignSelf: "flex-start",
                        backgroundColor: isSelected ? (isDark ? "#3f3f46" : "#f3e8ff") : isDark ? "#27272a" : "#f5f5f4",
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? item.color : isDark ? "#3f3f46" : "#e5e7eb",
                        opacity: isDimmed ? 0.5 : 1,
                      }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 6 }} />
                      <Text style={{ fontSize: 12, fontWeight: isSelected ? "700" : "500", color: isSelected ? item.color : subText }}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Linha 6 meses */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: cardBgWhite, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: titleText }} testID="line-title">
            Evolução 6 meses
          </Text>
          {!hasFinances ? (
            <Text style={{ fontSize: 14, color: subText, marginTop: 8, textAlign: "center" }} testID="line-empty">
              Adicione transações para ver a evolução
            </Text>
          ) : (
            <View style={{ width: "100%", alignItems: "center", marginTop: 8 }} testID="line-chart">
              {LineChartComp ? (
                <>
                  <LineChartComp
                    data={{
                      labels: lineData.labels,
                      datasets: [
                        { data: lineData.incomings, color: () => "#12a454", strokeWidth: 2 },
                        { data: lineData.expenses, color: () => "#e83e5a", strokeWidth: 2 },
                        { data: lineData.net, color: () => "#581C87", strokeWidth: 2 },
                      ],
                      legend: ["Entradas", "Saídas", "Saldo"],
                    }}
                    width={chartInnerWidth}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    yLabelsOffset={8}
                    formatYLabel={(yLabel) => {
                      const num = Number(String(yLabel).replace(",", "."));
                      if (Number.isNaN(num)) return String(yLabel);
                      return num.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        useGrouping: true,
                      });
                    }}
                    formatXLabel={(xLabel) => String(xLabel)}
                    chartConfig={{
                      backgroundColor: cardBgWhite,
                      backgroundGradientFrom: cardBgWhite,
                      backgroundGradientTo: cardBgWhite,
                      decimalPlaces: 2,
                      color: (opacity = 1) => isDark ? `rgba(228,228,231,${opacity})` : `rgba(88,28,135,${opacity})`,
                      labelColor: (opacity = 1) => isDark ? `rgba(161,161,170,${opacity})` : `rgba(107,114,128,${opacity})`,
                      propsForDots: { r: "5", strokeWidth: "2", stroke: PURPLE_900 },
                      propsForBackgroundLines: { strokeDasharray: "" },
                      propsForHorizontalLabels: { fontSize: 9 },
                      propsForVerticalLabels: { fontSize: 11 },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                    withDots
                    withInnerLines
                    withOuterLines
                    withVerticalLines={false}
                    withVerticalLabels={false}
                    onDataPointClick={({ index }) => setSelectedLineIndex((prev) => (prev === index ? null : index))}
                    decorator={() => null}
                  />
                  {/* Tooltip dentro do pai, em fluxo normal - não absoluto, para ficar contido no card */}
                  {selectedLineIndex !== null && lineData.labels[selectedLineIndex] !== undefined ? (
                    <View
                      testID="line-tooltip"
                      style={{
                        marginTop: 12,
                        width: chartInnerWidth,
                        backgroundColor: isDark ? "#27272a" : "white",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                        borderWidth: 1,
                        borderColor: isDark ? "#3f3f46" : "#e5e7eb",
                        alignItems: "flex-start",
                        alignSelf: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: titleText, marginBottom: 6, textTransform: "capitalize" }}>
                        {lineData.labels[selectedLineIndex]}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#12a454" }} />
                        <Text style={{ fontSize: 12, color: subText }}>Entradas: </Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: titleText }}>{formatCurrency(lineData.incomings[selectedLineIndex])}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e83e5a" }} />
                        <Text style={{ fontSize: 12, color: subText }}>Saídas: </Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: titleText }}>{formatCurrency(lineData.expenses[selectedLineIndex])}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#581C87" }} />
                        <Text style={{ fontSize: 12, color: subText }}>Saldo: </Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: titleText }}>{formatCurrency(lineData.net[selectedLineIndex])}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedLineIndex(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginTop: 8, alignSelf: "center" }}
                        testID="line-tooltip-close"
                      >
                        <Text style={{ fontSize: 11, color: subText }}>Fechar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {/* Fallback tátil: labels abaixo do gráfico também disparam o tooltip, garantindo clique mesmo se SVG falhar */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", width: chartInnerWidth, marginTop: 6 }} testID="line-x-pressables">
                    {lineData.labels.map((label, idx) => {
                      const isSelected = selectedLineIndex === idx;
                      return (
                        <TouchableOpacity
                          key={`x-${label}-${idx}`}
                          onPress={() => setSelectedLineIndex((prev) => (prev === idx ? null : idx))}
                          testID={`line-point-${idx}`}
                          accessibilityLabel={`Ponto ${label}`}
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: isSelected ? (isDark ? "#3f3f46" : "#f3e8ff") : "transparent",
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected ? PURPLE_900 : "transparent",
                          }}
                        >
                          <Text style={{ fontSize: 10, color: isSelected ? PURPLE_900 : subText }}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text testID="line-fallback">{lineData.labels.join(" | ")}</Text>
              )}
            </View>
          )}
        </View>

        {/* Metas urgentes */}
        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 24, backgroundColor: cardBgWhite, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: titleText }} testID="goals-title">
              Metas urgentes
            </Text>
          </View>
          {urgentGoals.length === 0 ? (
            <Text style={{ fontSize: 14, color: subText, marginTop: 8 }} testID="goals-empty">
              Nenhuma meta com prazo nos próximos 30 dias
            </Text>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }} testID="goals-list">
              {urgentGoals.map((goal) => {
                const progress = calcGoalProgress(goal);
                const days = differenceInCalendarDays(new Date(goal.date), Date.now());
                return (
                  <View key={goal.id} style={{ backgroundColor: isDark ? "#3f3f46" : "#f9fafb", borderRadius: 12, padding: 12 }} testID={`goal-${goal.id}`}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontWeight: "600", color: titleText, flex: 1 }} numberOfLines={1}>
                        {goal.description}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: PURPLE_600, marginLeft: 8 }}>
                        Restam {days} dias
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: subText }}>
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.amount)}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#e4e4e7" : PURPLE_900 }}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: isDark ? "#52525b" : "#e5e7eb", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                      <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: progress >= 1 ? "#c4b5fd" : PURPLE_600, borderRadius: 999 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {loading && (
          <Text testID="loading" style={{ textAlign: "center", color: subText, marginBottom: 16 }}>
            Carregando...
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
