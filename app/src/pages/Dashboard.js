import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Dimensions, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import { differenceInCalendarDays } from "date-fns";
import Header from "../components/Header";
import { financeRepo } from "../repositories/finance";
import { goalRepo } from "../repositories/goal";

let LinearGradient;
try {
  // eslint-disable-next-line global-require
  LinearGradient = require("expo-linear-gradient").LinearGradient;
} catch {
  LinearGradient = ({ children, colors, style, ...rest }) => (
    <View style={[{ backgroundColor: (colors && colors[0]) || "#581C87" }, style]} {...rest}>
      {children}
    </View>
  );
}

// Reanimated wrapper fallback
let AnimatedView = View;
let FadeInUp = undefined;
try {
  // eslint-disable-next-line global-require
  const Reanimated = require("react-native-reanimated");
  AnimatedView = Reanimated.default ? Reanimated.default.View : View;
  FadeInUp = Reanimated.FadeInUp;
} catch {
  AnimatedView = View;
}

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
  // Tithe 10% sobre entradas com prefix logic simplified: if description includes Dízimo should subtract? For dashboard hero we use simple 10% of Incomings
  // Keep compatibility with financeRepo calcTithePure if needed; pure here 10% of Incomings minus prefixed saidas if any
  // For simplicity: Tithe = 10% of Incomings clamped
  // If caller wants prefix, they can use financeRepo.calcTithe; here we just compute 10%
  Tithe = (Incomings * 10) / 100;
  if (Tithe < 0) Tithe = 0;
  return { Saldo, Incomings, Expenses, Tithe, Total: Saldo };
}

export function getExpensesByCategory(list = []) {
  // Colors palette matching Reports
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
  // Returns labels (MM/YY) and datasets for 6 months including current month
  const now = dayjs();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = now.subtract(i, "month");
    months.push(d);
  }
  const labels = months.map((m) => m.format("MM/YY"));
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
  // also net total
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

  const [finances, setFinances] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const Card = ({ title, value, icon, colors, testID }) => (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-2xl p-4 min-w-[160px] flex-1 mx-1 shadow-lg"
      style={{ borderRadius: 16, padding: 16, minWidth: 160, flex: 1, marginHorizontal: 4, minHeight: 110, justifyContent: "space-between" }}
      testID={testID}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-white text-base font-semibold" style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
          {title}
        </Text>
        <Feather name={icon} size={28} color="white" />
      </View>
      <Text className="text-white text-xl font-bold mt-2" style={{ color: "white", fontSize: hero.Saldo < 10000 ? 18 : 16, fontWeight: "700", marginTop: 8 }} numberOfLines={1}>
        {formatCurrency(value)}
      </Text>
    </LinearGradient>
  );

  const hasFinances = finances.length > 0;
  const chartWidth = width * 0.92;

  return (
    <View className="flex-1 bg-warmGray-50 dark:bg-gray-900" style={{ flex: 1, backgroundColor: "#f5f5f4" }}>
      <ScrollView className="flex-1 w-full" style={{ flex: 1 }}>
        <Header
          title="Início"
          isRightIconComponent={
            <TouchableOpacity
              onPress={() => navigation.navigate("Configuracoes")}
              style={{ padding: 8, borderRadius: 999 }}
              testID="header-settings"
            >
              <Feather name="settings" size={20} color="white" />
            </TouchableOpacity>
          }
        />

        {/* Hero gradient cards */}
        <AnimatedView entering={FadeInUp?.duration?.(400)} className="px-2 -mt-12" style={{ paddingHorizontal: 8, marginTop: -48 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 0 }}
            style={{ flexDirection: "row" }}
            testID="hero-scroll"
          >
            <Card title="Saldo" value={hero.Saldo} icon={hero.Saldo >= 0 ? "arrow-up-circle" : "arrow-down-circle"} colors={["#9c44dc", "#581C87"]} testID="card-saldo" />
            <Card title="Entradas" value={hero.Incomings} icon="arrow-up-circle" colors={["#12a454", "#0d7a3f"]} testID="card-entradas" />
            <Card title="Saídas" value={hero.Expenses} icon="arrow-down-circle" colors={["#e83e5a", "#b91c1c"]} testID="card-saidas" />
            <Card title="Dízimo" value={hero.Tithe} icon="heart" colors={["#581C87", "#9c44dc"]} testID="card-dizimo" />
          </ScrollView>
          <Text className="text-xs text-gray-500 mt-2 px-2" style={{ fontSize: 12, color: "#6b7280", marginTop: 8, paddingHorizontal: 8 }}>
            * Totais do período geral
          </Text>
        </AnimatedView>

        {/* Pizza gastos por categoria */}
        <View className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow" style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <Text className="text-lg font-bold text-gray-700 dark:text-gray-200" style={{ fontSize: 18, fontWeight: "700", color: "#374151" }} testID="pizza-title">
            Gastos por categoria
          </Text>
          {!hasFinances || pieData.length === 0 ? (
            <Text className="text-sm text-gray-500 mt-2 text-center" style={{ fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" }} testID="pizza-empty">
              Sem gastos para exibir
            </Text>
          ) : (
            <View style={{ alignItems: "center", marginTop: 8 }} testID="pizza-chart">
              {PieChartComp ? (
                <PieChartComp
                  data={pieData}
                  width={chartWidth - 32}
                  height={180}
                  chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              ) : (
                <Text testID="pizza-fallback">{pieData.map((d) => `${d.name}: ${formatCurrency(d.population)}`).join(", ")}</Text>
              )}
            </View>
          )}
        </View>

        {/* Linha 6 meses */}
        <View className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow" style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <Text className="text-lg font-bold text-gray-700 dark:text-gray-200" style={{ fontSize: 18, fontWeight: "700", color: "#374151" }} testID="line-title">
            Evolução 6 meses
          </Text>
          {!hasFinances ? (
            <Text className="text-sm text-gray-500 mt-2 text-center" style={{ fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" }} testID="line-empty">
              Adicione transações para ver a evolução
            </Text>
          ) : (
            <View style={{ alignItems: "center", marginTop: 8 }} testID="line-chart">
              {LineChartComp ? (
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
                  width={chartWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(88,28,135,${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107,114,128,${opacity})`,
                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#581C87" },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              ) : (
                <Text testID="line-fallback">{lineData.labels.join(" | ")}</Text>
              )}
            </View>
          )}
        </View>

        {/* Metas urgentes */}
        <View className="mx-4 mt-4 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow" style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 24, backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-gray-700" style={{ fontSize: 18, fontWeight: "700", color: "#374151" }} testID="goals-title">
              Metas urgentes
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Relatórios")} testID="goals-see-all">
              <Text style={{ color: "#9c44dc", fontSize: 14 }}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {urgentGoals.length === 0 ? (
            <Text className="text-sm text-gray-500 mt-2" style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }} testID="goals-empty">
              Nenhuma meta com prazo nos próximos 30 dias
            </Text>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }} testID="goals-list">
              {urgentGoals.map((goal) => {
                const progress = calcGoalProgress(goal);
                const days = differenceInCalendarDays(new Date(goal.date), Date.now());
                return (
                  <View key={goal.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3" style={{ backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }} testID={`goal-${goal.id}`}>
                    <View className="flex-row justify-between items-center">
                      <Text className="font-semibold text-gray-700 flex-1" style={{ fontWeight: "600", color: "#374151", flex: 1 }} numberOfLines={1}>
                        {goal.description}
                      </Text>
                      <Text className="text-xs font-bold text-purple-600 ml-2" style={{ fontSize: 12, fontWeight: "700", color: "#9c44dc", marginLeft: 8 }}>
                        Restam {days} dias
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.amount)}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#581C87" }}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                      <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: progress >= 1 ? "#c4b5fd" : "#9c44dc", borderRadius: 999 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {loading && (
          <Text testID="loading" style={{ textAlign: "center", color: "#6b7280", marginBottom: 16 }}>
            Carregando...
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
