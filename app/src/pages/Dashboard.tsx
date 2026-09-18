import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { differenceInCalendarDays } from "date-fns";
import Header from "../components/Header";
import InteractivePieChart from "../components/InteractivePieChart";
import Orb from "../components/ui/Orb";
import { financeRepo, calcTithePure } from "../repositories/finance";
import type { FinanceRow } from "../repositories/finance";
import { goalRepo } from "../repositories/goal";
import { runRepo } from "../repositories/run";
import { marketRepo } from "../repositories/market";
import type { StockRow } from "../repositories/market";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { useShallow } from "zustand/react/shallow";
import { usePagesStore } from "../stores/pages";

let BorderBeam: any = null;
try {
  BorderBeam =
    require("../components/ui/border-beam").BorderBeam ||
    require("../components/ui/border-beam/index").BorderBeam ||
    require("../components/ui/border-beam/index").default ||
    null;
} catch {}

// Charts fallback (jest without native svg may fail)
let PieChartComp: any = null;
let LineChartComp: any = null;
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

export type GoalRow = {
  id: string;
  description: string;
  amount: number;
  currentAmount: number;
  date: number;
  icon?: string;
  category?: string;
};

export type RunRow = {
  id: string;
  currentDistance: number;
  unityAmount: number;
  amount: number;
  type: string;
  date: number;
  location: string;
};

export type PieDatum = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

export type LineData = {
  labels: string[];
  incomings: number[];
  expenses: number[];
  net: number[];
};

export type RunsChartData = {
  labels: string[];
  data: number[];
  fullList: RunRow[];
};

export type HeroValues = {
  Saldo: number;
  Incomings: number;
  Expenses: number;
  Tithe: number;
  Total: number;
};

function formatCurrency(value: number): string {
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

export function calcHeroValues(list: FinanceRow[] = []): HeroValues {
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

export function getExpensesByCategory(list: FinanceRow[] = []): PieDatum[] {
  const palette: string[] = [
    "#581C87",
    "#7D24BC",
    "#9C44DC",
    "#AA5DE0",
    "#C693EA",
    "#D4AEF0",
    "#2D0D45",
    "#391056",
    "#4F1778",
    "#661D9A",
    "#9231D8",
    "#9C44DC",
  ];
  const cats: string[] = [
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
  const map: Record<string, number> = {};
  for (const cat of cats) map[cat] = 0;
  for (const item of list) {
    if (item.isEnabled) {
      const cat = item.category || "Outros";
      if (map[cat] === undefined) map[cat] = 0;
      map[cat] += Number(item.amount) || 0;
    }
  }
  const data: PieDatum[] = Object.entries(map)
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

export function getLast6MonthsLineData(list: FinanceRow[] = []): LineData {
  const now = dayjs();
  const months: dayjs.Dayjs[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = now.subtract(i, "month");
    months.push(d);
  }
  const labels: string[] = months.map((m) =>
    m.locale("pt-br").format("MMM YY").toLowerCase(),
  );
  const incomings: number[] = months.map((m) => {
    const start = m.startOf("month").valueOf();
    const end = m.endOf("month").valueOf();
    return list
      .filter((it) => !it.isEnabled && it.date >= start && it.date <= end)
      .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  });
  const expenses: number[] = months.map((m) => {
    const start = m.startOf("month").valueOf();
    const end = m.endOf("month").valueOf();
    return list
      .filter((it) => it.isEnabled && it.date >= start && it.date <= end)
      .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  });
  const net: number[] = months.map((_, idx) => incomings[idx] - expenses[idx]);
  return { labels, incomings, expenses, net };
}

export function getUrgentGoals(goals: GoalRow[] = []): GoalRow[] {
  const now = Date.now();
  return goals
    .filter((g) => {
      const days = differenceInCalendarDays(new Date(g.date), now);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);
}

export function calcGoalProgress(goal: GoalRow | null | undefined): number {
  if (!goal || !goal.amount) return 0;
  const p = Number(goal.currentAmount) / Number(goal.amount);
  return p >= 1 ? 1 : p < 0 ? 0 : p;
}

export function getStockMissing(stock: StockRow[] = []): StockRow[] {
  return stock.filter((it) => Number(it.quantity) < Number(it.quantityDesired));
}

export function getStockNearMissing(stock: StockRow[] = []): StockRow[] {
  // Próximos de faltar: em estoque mas no limite (quantity == quantityDesired ou +1)
  return stock.filter((it) => {
    const q = Number(it.quantity);
    const d = Number(it.quantityDesired);
    return q >= d && q <= d + 1;
  });
}

export function getLast7RunsChartData(
  runs: RunRow[] = [],
  filter: string = "litro",
): RunsChartData {
  const sorted: RunRow[] = [...runs]
    .sort((a, b) => Number(a.date) - Number(b.date))
    .slice(-7);
  const labels: string[] = sorted.map((item) => {
    const d = new Date(Number(item.date));
    const dia = String(d.getUTCDate()).padStart(2, "0");
    const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}`;
  });
  const data: number[] = sorted.map((item) =>
    filter === "litro"
      ? Number(item.unityAmount) || 0
      : Number(item.amount) || 0,
  );
  return { labels, data, fullList: sorted };
}

export default function Dashboard(): React.JSX.Element {
  const navigation: any = useNavigation();
  const isFocused: boolean = useIsFocused();

  const colorModeState: string = useSettingsStore(
    (s: SettingsState) => s.colorModeState,
  );
  const isDark: boolean = colorModeState === "dark";
  const bg: string = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard: string = isDark ? "#27272a" : "#f5f5f4";
  const cardBgWhite: string = isDark ? "#27272a" : "white";
  const text: string = isDark ? "#e4e4e7" : "#52525b";
  const subText: string = isDark ? "#a1a1aa" : "#6b7280";
  const titleText: string = isDark ? "#e4e4e7" : "#374151";
  const headerText: string = isDark ? "#27272a" : "white";
  const settingsSlice = useSettingsStore(
    useShallow((s: SettingsState) => ({
      isEnableTotalHistoryCard: !!s.isEnableTotalHistoryCard,
      isEnableTitheCard: !!s.isEnableTitheCard,
      tithePercent: s.tithePercent ?? 10,
      titheCategoriesRaw: s.titheCategories,
    })),
  );
  const isEnableTotalHistoryCard: boolean =
    settingsSlice.isEnableTotalHistoryCard;
  const isEnableTitheCard: boolean = settingsSlice.isEnableTitheCard;
  const tithePercent: number = settingsSlice.tithePercent;
  const titheCategoriesRaw: string = settingsSlice.titheCategoriesRaw;
  const isAiEnabled: boolean = useSettingsStore((s: SettingsState) => !!s.isAiEnabled);
  const iaLabelFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isFocused && isAiEnabled) {
      iaLabelFade.setValue(1);
      const t = setTimeout(() => {
        Animated.timing(iaLabelFade, { toValue: 0, duration: 800, useNativeDriver: true }).start();
      }, 5000);
      return () => clearTimeout(t);
    } else {
      iaLabelFade.setValue(0);
    }
  }, [isFocused, isAiEnabled, iaLabelFade]);
  const titheCategories: string[] = useMemo(() => {
    try {
      const parsed =
        typeof titheCategoriesRaw === "string"
          ? JSON.parse(titheCategoriesRaw)
          : titheCategoriesRaw;
      if (Array.isArray(parsed) && parsed.length) return parsed as string[];
    } catch {}
    return ["Ganhos"];
  }, [titheCategoriesRaw]);

  const [finances, setFinances] = useState<FinanceRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPieIndex, setSelectedPieIndex] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(
    null,
  );
  const [selectedRunsFilter, setSelectedRunsFilter] = useState<string>("litro");
  const [selectedRunsIndex, setSelectedRunsIndex] = useState<number | null>(
    null,
  );
  const tabBarHeight: number = (() => {
    try {
      const {
        useBottomTabBarHeight,
      } = require("@react-navigation/bottom-tabs");
      return useBottomTabBarHeight();
    } catch {
      return 80;
    }
  })();

  const { setSelectedSheet } = usePagesStore();
  useEffect(() => {
    if (isFocused) setSelectedSheet("Início");
  }, [isFocused, setSelectedSheet]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, g, r, s] = await Promise.all([
        financeRepo.getAll(),
        goalRepo.getAll(),
        runRepo.getAll().catch(() => []),
        marketRepo.getAll().catch(() => []),
      ]);
      setFinances((f as FinanceRow[]) || []);
      setGoals((g as GoalRow[]) || []);
      setRuns((r as RunRow[]) || []);
      setStock((s as StockRow[]) || []);
    } catch {
      setFinances([]);
      setGoals([]);
      setRuns([]);
      setStock([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) load();
    else load();
  }, [isFocused, load]);

  const hero: HeroValues = useMemo(() => {
    const base = calcHeroValues(finances);
    const titheAmount = calcTithePure(finances, {
      percent: tithePercent,
      categories: titheCategories,
    });
    return { ...base, Tithe: titheAmount };
  }, [finances, tithePercent, titheCategories]);
  const pieData: PieDatum[] = useMemo(
    () => getExpensesByCategory(finances),
    [finances],
  );
  const pieTotal: number = useMemo(
    () => pieData.reduce((acc, cur) => acc + (Number(cur.population) || 0), 0),
    [pieData],
  );
  const lineData: LineData = useMemo(
    () => getLast6MonthsLineData(finances),
    [finances],
  );
  const urgentGoals: GoalRow[] = useMemo(() => getUrgentGoals(goals), [goals]);
  const runsChartData: RunsChartData = useMemo(
    () => getLast7RunsChartData(runs, selectedRunsFilter),
    [runs, selectedRunsFilter],
  );
  const hasRuns: boolean = runs.length > 0;
  const stockMissing: StockRow[] = useMemo(
    () => getStockMissing(stock),
    [stock],
  );
  const stockNearMissing: StockRow[] = useMemo(
    () => getStockNearMissing(stock),
    [stock],
  );
  const hasStock: boolean = stock.length > 0;

  useEffect(() => {
    if (selectedPieIndex !== null && selectedPieIndex >= pieData.length) {
      setSelectedPieIndex(null);
    }
  }, [pieData.length, selectedPieIndex]);

  useEffect(() => {
    if (
      selectedLineIndex !== null &&
      selectedLineIndex >= lineData.labels.length
    ) {
      setSelectedLineIndex(null);
    }
  }, [lineData.labels.length, selectedLineIndex]);

  useEffect(() => {
    if (
      selectedRunsIndex !== null &&
      selectedRunsIndex >= runsChartData.labels.length
    ) {
      setSelectedRunsIndex(null);
    }
  }, [runsChartData.labels.length, selectedRunsIndex]);

  const hasFinances: boolean = finances.length > 0;
  const chartWidth: number = width * 0.92;
  const chartInnerWidth: number = Math.min(chartWidth - 32, width - 64);
  const pieSize: number = Math.min(160, Math.round(chartWidth * 0.48));

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Hero cards - compact */}
        <ScrollView
          horizontal
          style={{ width: "100%", marginTop: -40, height: 130 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ height: 120, paddingHorizontal: 8 }}
          testID="hero-scroll"
        >
          {isEnableTotalHistoryCard && (
            <View
              style={{
                marginHorizontal: 4,
                backgroundColor: isDark ? "#27272a" : "white",
                minWidth: 180,
                height: 110,
                borderRadius: 4,
                padding: 16,
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.15 : 0.08,
                borderWidth: 1,
                borderColor: isDark ? "#3f3f46" : "#e7e5e4",
              }}
              testID="card-saldo"
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: text, fontSize: 18 }}>Saldo</Text>
                <Feather
                  name={
                    hero.Saldo >= 0 ? "arrow-up-circle" : "arrow-down-circle"
                  }
                  size={48}
                  color={GREEN_500}
                />
              </View>
              <Text
                style={{
                  color: text,
                  fontSize: Math.abs(hero.Saldo) < 10000 ? 26 : 20,
                  maxWidth: 170,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                ellipsizeMode="tail"
              >
                {formatCurrency(hero.Saldo)}
              </Text>
            </View>
          )}

          <View
            style={{
              marginHorizontal: 4,
              backgroundColor: isDark ? "#27272a" : "white",
              minWidth: 180,
              height: 110,
              borderRadius: 4,
              padding: 16,
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.15 : 0.08,
              borderWidth: 1,
              borderColor: isDark ? "#3f3f46" : "#e7e5e4",
            }}
            testID="card-entradas"
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: text, fontSize: 18 }}>Entradas</Text>
              <Feather name="arrow-up-circle" size={48} color={GREEN_500} />
            </View>
            <Text
              style={{
                color: text,
                fontSize: hero.Incomings < 10000 ? 26 : 20,
                maxWidth: 170,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              ellipsizeMode="tail"
            >
              {formatCurrency(hero.Incomings)}
            </Text>
          </View>

          <View
            style={{
              marginHorizontal: 4,
              backgroundColor: isDark ? "#27272a" : "white",
              minWidth: 180,
              height: 110,
              borderRadius: 4,
              padding: 16,
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.15 : 0.08,
              borderWidth: 1,
              borderColor: isDark ? "#3f3f46" : "#e7e5e4",
            }}
            testID="card-saidas"
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: text, fontSize: 18 }}>Saídas</Text>
              <Feather name="arrow-down-circle" size={48} color={RED_500} />
            </View>
            <Text
              style={{
                color: text,
                fontSize: hero.Expenses < 10000 ? 26 : 20,
                maxWidth: 170,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              ellipsizeMode="tail"
            >
              {formatCurrency(hero.Expenses)}
            </Text>
          </View>

          {isEnableTitheCard && (
            <View
              style={{
                marginHorizontal: 4,
                backgroundColor: PURPLE_900,
                minWidth: 180,
                height: 110,
                borderRadius: 4,
                padding: 16,
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: 0.1,
              }}
              testID="card-dizimo"
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "white", fontSize: 18 }}>Dízimo</Text>
                <Feather name="heart" size={48} color="white" />
              </View>
              <Text
                style={{
                  color: "white",
                  fontSize: hero.Tithe < 10000 ? 26 : 20,
                  maxWidth: 170,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                ellipsizeMode="tail"
              >
                {formatCurrency(hero.Tithe)}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Saúde das finanças - card nativewind */}
        <View
          className="mx-4 mt-2 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            backgroundColor: cardBgWhite,
            borderRadius: 16,
            padding: 16,
            elevation: 2,
            shadowColor: "#000",
            shadowOpacity: 0.06,
          }}
          testID="saude-card"
        >
          {!hasFinances ? (
            <View
              className="items-center justify-center py-2"
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
              }}
            >
              <Text
                className="text-gray-700 dark:text-gray-200 font-bold text-lg"
                style={{
                  color: titleText,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Sem dados para analisar
              </Text>
              <Text
                className="text-gray-500 dark:text-gray-400 text-sm text-center mt-1"
                style={{
                  color: subText,
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Adicione transações para ver a saúde financeira aqui.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                className="flex-row items-center justify-between"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  className="text-gray-800 dark:text-gray-100 font-bold text-lg"
                  style={{ fontWeight: "700", color: titleText, fontSize: 16 }}
                  testID="saude-title"
                >
                  Saúde das finanças
                </Text>
                <View
                  className="bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: isDark ? "rgba(88,28,135,0.2)" : "#f5f3ff",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    className="text-xs font-bold text-purple-700 dark:text-purple-300"
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: PURPLE_600,
                    }}
                  >
                    {hero.Incomings + hero.Expenses > 0
                      ? `${Math.round((hero.Incomings / (hero.Incomings + hero.Expenses)) * 100)}%`
                      : "0%"}{" "}
                    saudável
                  </Text>
                </View>
              </View>

              <View
                className="flex-row items-center justify-between"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  className="flex-row items-center"
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isDark
                        ? "rgba(34,197,94,0.15)"
                        : "#f0fdf4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="arrow-up-circle" size={22} color="#16a34a" />
                  </View>
                  <View>
                    <Text
                      className="text-xs text-gray-500 dark:text-gray-400"
                      style={{ color: subText, fontSize: 11 }}
                    >
                      Ganhos
                    </Text>
                    <Text
                      className="text-gray-800 dark:text-gray-100 font-bold text-base"
                      style={{
                        color: titleText,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                      testID="saude-ganhos"
                    >
                      {formatCurrency(hero.Incomings)}
                    </Text>
                  </View>
                </View>
                <View
                  className="flex-row items-center"
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      className="text-xs text-gray-500 dark:text-gray-400 text-right"
                      style={{
                        color: subText,
                        fontSize: 11,
                        textAlign: "right",
                      }}
                    >
                      Despesas
                    </Text>
                    <Text
                      className="text-gray-800 dark:text-gray-100 font-bold text-base text-right"
                      style={{
                        color: titleText,
                        fontSize: 15,
                        fontWeight: "700",
                        textAlign: "right",
                      }}
                      testID="saude-despesas"
                    >
                      {formatCurrency(hero.Expenses)}
                    </Text>
                  </View>
                  <View
                    className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.15)"
                        : "#fef2f2",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather
                      name="arrow-down-circle"
                      size={22}
                      color="#dc2626"
                    />
                  </View>
                </View>
              </View>

              <View
                className="h-3 rounded-full overflow-hidden"
                style={{
                  height: 12,
                  backgroundColor: isDark ? "#7f1d1d" : "#dc2626",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
                testID="saude-progress-track"
              >
                <View
                  testID="saude-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, hero.Incomings + hero.Expenses === 0 ? 0 : (hero.Incomings / (hero.Incomings + hero.Expenses)) * 100))}%`,
                    height: 12,
                    backgroundColor: "#16a34a",
                    borderRadius: 999,
                  }}
                />
              </View>
              <View
                className="flex-row justify-between"
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  className="text-xs text-gray-500 dark:text-gray-400"
                  style={{ fontSize: 11, color: subText }}
                >
                  {hero.Incomings >= hero.Expenses
                    ? "Saldo positivo"
                    : "Atenção: despesas maiores"}
                </Text>
                <Text
                  className="text-xs font-semibold text-gray-600 dark:text-gray-300"
                  style={{ fontSize: 11, fontWeight: "600", color: titleText }}
                >
                  {formatCurrency(hero.Incomings - hero.Expenses)} saldo
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Pizza gastos por categoria */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: cardBgWhite,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            elevation: 2,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: titleText }}
            testID="pizza-title"
          >
            Gastos por categoria
          </Text>
          {!hasFinances || pieData.length === 0 ? (
            <Text
              style={{
                fontSize: 14,
                color: subText,
                marginTop: 8,
                textAlign: "center",
              }}
              testID="pizza-empty"
            >
              Sem gastos para exibir
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
                gap: 12,
              }}
              testID="pizza-chart"
            >
              {/* Disco clicável - cada fatia selecionável com realce */}
              <View
                style={{
                  width: pieSize,
                  height: pieSize,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InteractivePieChart
                  data={pieData}
                  width={pieSize}
                  height={pieSize}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft={0}
                  selectedIndex={selectedPieIndex}
                  onSelect={(idx: number) =>
                    setSelectedPieIndex((prev) => (prev === idx ? null : idx))
                  }
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                  }}
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: pieData[selectedPieIndex].color,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: titleText,
                        }}
                      >
                        {pieData[selectedPieIndex].name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: titleText,
                        marginTop: 4,
                      }}
                    >
                      {formatCurrency(pieData[selectedPieIndex].population)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedPieIndex(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginTop: 4 }}
                      testID="pizza-tooltip-close"
                    >
                      <Text style={{ fontSize: 11, color: subText }}>
                        Fechar
                      </Text>
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
                  const percent = pieTotal
                    ? Math.round((Number(item.population) / pieTotal) * 100)
                    : 0;
                  return (
                    <TouchableOpacity
                      key={`${item.name}-${idx}`}
                      onPress={() =>
                        setSelectedPieIndex((prev) =>
                          prev === idx ? null : idx,
                        )
                      }
                      testID={`legend-${item.name}`}
                      accessibilityLabel={`${item.name} ${percent}%`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        alignSelf: "flex-start",
                        backgroundColor: isSelected
                          ? isDark
                            ? "#3f3f46"
                            : "#f3e8ff"
                          : isDark
                            ? "#27272a"
                            : "#f5f5f4",
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected
                          ? item.color
                          : isDark
                            ? "#3f3f46"
                            : "#e5e7eb",
                        opacity: isDimmed ? 0.5 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: item.color,
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? item.color : subText,
                        }}
                      >{`${item.name} ${percent}%`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Abastecimentos - últimos 7 - toggle Por Litro / Pago - nativewind card */}
        {hasRuns && (
          <View
            className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: cardBgWhite,
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              elevation: 2,
            }}
            testID="runs-card"
          >
            <Text
              className="text-gray-800 dark:text-gray-100 font-bold text-lg"
              style={{ fontSize: 18, fontWeight: "700", color: titleText }}
              testID="runs-title"
            >
              Abastecimentos
            </Text>
            <Text
              className="text-xs text-gray-500 dark:text-gray-400 mt-1"
              style={{ fontSize: 12, color: subText, marginTop: 4 }}
            >
              Últimos 7 abastecimentos
            </Text>

            <View
              className="flex-row mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
              style={{
                flexDirection: "row",
                marginTop: 12,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: isDark ? "#3f3f46" : "#e5e7eb",
                backgroundColor: isDark ? "#27272a" : "#f9fafb",
              }}
            >
              <TouchableOpacity
                testID="runs-filter-litro"
                onPress={() => setSelectedRunsFilter("litro")}
                className={`flex-1 items-center justify-center py-2 ${selectedRunsFilter === "litro" ? "bg-purple-600" : "bg-transparent"}`}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    selectedRunsFilter === "litro" ? PURPLE_600 : "transparent",
                }}
              >
                <Text
                  className={`text-sm font-semibold ${selectedRunsFilter === "litro" ? "text-white" : "text-gray-600 dark:text-gray-400"}`}
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: selectedRunsFilter === "litro" ? "white" : subText,
                  }}
                >
                  Por Litro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="runs-filter-pago"
                onPress={() => setSelectedRunsFilter("pago")}
                className={`flex-1 items-center justify-center py-2 ${selectedRunsFilter === "pago" ? "bg-purple-600" : "bg-transparent"}`}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    selectedRunsFilter === "pago" ? PURPLE_600 : "transparent",
                }}
              >
                <Text
                  className={`text-sm font-semibold ${selectedRunsFilter === "pago" ? "text-white" : "text-gray-600 dark:text-gray-400"}`}
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: selectedRunsFilter === "pago" ? "white" : subText,
                  }}
                >
                  Pago
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                width: "100%",
                alignItems: "center",
                marginTop: 12,
                position: "relative",
              }}
              testID="runs-chart"
            >
              {LineChartComp && runsChartData.labels.length > 0 ? (
                <>
                  <View
                    style={{
                      width: chartInnerWidth,
                      height: 220,
                      position: "relative",
                    }}
                  >
                    <LineChartComp
                      data={{
                        labels: runsChartData.labels,
                        datasets: [
                          {
                            data: runsChartData.data.length
                              ? runsChartData.data
                              : [0],
                            color: () => PURPLE_900,
                            strokeWidth: 2,
                          },
                        ],
                      }}
                      width={chartInnerWidth}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix=""
                      yLabelsOffset={8}
                      formatYLabel={(yLabel: string) => {
                        const num = Number(String(yLabel).replace(",", "."));
                        if (Number.isNaN(num)) return String(yLabel);
                        if (selectedRunsFilter === "litro")
                          return num.toFixed(2);
                        return num.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      }}
                      formatXLabel={(xLabel: string) => String(xLabel)}
                      chartConfig={{
                        backgroundColor: cardBgWhite,
                        backgroundGradientFrom: cardBgWhite,
                        backgroundGradientTo: cardBgWhite,
                        decimalPlaces: 2,
                        color: (opacity = 1) =>
                          isDark
                            ? `rgba(228,228,231,${opacity})`
                            : `rgba(88,28,135,${opacity})`,
                        labelColor: (opacity = 1) =>
                          isDark
                            ? `rgba(161,161,170,${opacity})`
                            : `rgba(107,114,128,${opacity})`,
                        propsForDots: {
                          r: "5",
                          strokeWidth: "2",
                          stroke: PURPLE_900,
                        },
                        propsForHorizontalLabels: { fontSize: 9 },
                        propsForVerticalLabels: { fontSize: 11 },
                      }}
                      getDotProps={(value: any, index: number) => ({
                        r: selectedRunsIndex === index ? "7" : "5",
                        strokeWidth: "2",
                        stroke: PURPLE_900,
                      })}
                      bezier
                      style={{ borderRadius: 16 }}
                      withDots
                      withInnerLines
                      withOuterLines
                      withVerticalLines
                      withHorizontalLabels
                      withVerticalLabels={false}
                      onDataPointClick={({ index }: any) =>
                        setSelectedRunsIndex((prev: any) =>
                          prev === index ? null : index,
                        )
                      }
                      decorator={({
                        width: w,
                        height: h,
                        paddingTop,
                        paddingRight,
                        data,
                      }: any) => {
                        if (
                          selectedRunsIndex === null ||
                          !data ||
                          !data[0] ||
                          selectedRunsIndex < 0 ||
                          selectedRunsIndex >= data[0].data.length
                        )
                          return null;
                        try {
                          const { G, Line } = require("react-native-svg");
                          const x =
                            paddingRight +
                            (selectedRunsIndex * (w - paddingRight)) /
                              data[0].data.length;
                          return (
                            <G key={`sel-runs-${selectedRunsIndex}`}>
                              <Line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={h * 0.75 + paddingTop}
                                stroke="#52525b"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                                opacity={0.85}
                              />
                            </G>
                          );
                        } catch {
                          return null;
                        }
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: chartInnerWidth,
                        height: 220,
                        flexDirection: "row",
                        zIndex: 5,
                      }}
                      pointerEvents="box-none"
                    >
                      {runsChartData.labels.map((_: any, idx: number) => (
                        <TouchableOpacity
                          key={`runs-hit-${idx}`}
                          onPress={() =>
                            setSelectedRunsIndex((prev: any) =>
                              prev === idx ? null : idx,
                            )
                          }
                          testID={`runs-dot-hit-${idx}`}
                          hitSlop={{ top: 20, bottom: 20, left: 12, right: 12 }}
                          style={{ flex: 1, marginHorizontal: 1 }}
                          accessibilityLabel={`Ponto ${runsChartData.labels[idx]}`}
                        >
                          <View style={{ flex: 1 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {selectedRunsIndex !== null &&
                    runsChartData.labels[selectedRunsIndex] !== undefined
                      ? (() => {
                          const paddingRight = 64;
                          const x =
                            paddingRight +
                            (selectedRunsIndex *
                              (chartInnerWidth - paddingRight)) /
                              runsChartData.labels.length;
                          const isLeftSide = selectedRunsIndex <= 2;
                          const availableToRight = chartInnerWidth - x - 12;
                          const availableToLeft = x - 12;
                          const maxW = isLeftSide
                            ? Math.min(availableToRight, chartInnerWidth - 16)
                            : Math.min(availableToLeft, chartInnerWidth - 16);
                          const left = isLeftSide ? x + 10 : undefined;
                          const right = !isLeftSide
                            ? chartInnerWidth - x + 10
                            : undefined;
                          const item =
                            runsChartData.fullList[selectedRunsIndex];
                          const litros = item
                            ? (
                                Number(item.amount) /
                                  Number(item.unityAmount) || 0
                              ).toFixed(2)
                            : "-";
                          const valor =
                            selectedRunsFilter === "litro"
                              ? `R$ ${Number(runsChartData.data[selectedRunsIndex]).toFixed(2).replace(".", ",")}/L`
                              : formatCurrency(
                                  Number(runsChartData.data[selectedRunsIndex]),
                                );
                          return (
                            <View
                              testID="runs-tooltip"
                              style={{
                                position: "absolute",
                                top: 8,
                                left,
                                right,
                                backgroundColor: isDark ? "#27272a" : "white",
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                shadowColor: "#000",
                                shadowOpacity: 0.12,
                                shadowRadius: 6,
                                elevation: 4,
                                borderWidth: 1,
                                borderColor: isDark ? "#3f3f46" : "#e5e7eb",
                                minWidth: 130,
                                maxWidth: Math.max(
                                  160,
                                  Math.min(maxW, chartInnerWidth - 16),
                                ),
                                alignItems: "flex-start",
                                zIndex: 10,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color: titleText,
                                  marginBottom: 4,
                                }}
                              >
                                {runsChartData.labels[selectedRunsIndex]}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 1,
                                }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: PURPLE_900,
                                  }}
                                />
                                <Text style={{ fontSize: 11, color: subText }}>
                                  {selectedRunsFilter === "litro"
                                    ? "Preço/L:"
                                    : "Pago:"}{" "}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: titleText,
                                  }}
                                >
                                  {valor}
                                </Text>
                              </View>
                              {item && (
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: subText,
                                    marginTop: 3,
                                  }}
                                >
                                  {item.location} • {litros} L
                                </Text>
                              )}
                              <TouchableOpacity
                                onPress={() => setSelectedRunsIndex(null)}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                                style={{ marginTop: 6, alignSelf: "center" }}
                                testID="runs-tooltip-close"
                              >
                                <Text style={{ fontSize: 10, color: subText }}>
                                  Fechar
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })()
                      : null}
                  </View>
                  <View
                    style={{
                      width: chartInnerWidth,
                      height: 30,
                      marginTop: 2,
                      position: "relative",
                    }}
                    testID="runs-x-pressables"
                  >
                    {runsChartData.labels.map((label: string, idx: number) => {
                      const isSelected = selectedRunsIndex === idx;
                      const paddingRight = 64;
                      const x =
                        paddingRight +
                        (idx * (chartInnerWidth - paddingRight)) /
                          runsChartData.labels.length;
                      return (
                        <TouchableOpacity
                          key={`runs-x-${label}-${idx}`}
                          onPress={() =>
                            setSelectedRunsIndex((prev: any) =>
                              prev === idx ? null : idx,
                            )
                          }
                          testID={`runs-point-${idx}`}
                          accessibilityLabel={`Ponto ${label}`}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{
                            position: "absolute",
                            left: x - 28,
                            width: 56,
                            alignItems: "center",
                            paddingVertical: 4,
                            paddingHorizontal: 4,
                            borderRadius: 6,
                            backgroundColor: isSelected
                              ? isDark
                                ? "#3f3f46"
                                : "#f3e8ff"
                              : "transparent",
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected
                              ? PURPLE_900
                              : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: isSelected ? "700" : "500",
                              color: isSelected ? PURPLE_900 : subText,
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text testID="runs-fallback">
                  {runsChartData.labels.join(" | ")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Linha 6 meses */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: cardBgWhite,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            elevation: 2,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: titleText }}
            testID="line-title"
          >
            Evolução 6 meses
          </Text>
          {!hasFinances ? (
            <Text
              style={{
                fontSize: 14,
                color: subText,
                marginTop: 8,
                textAlign: "center",
              }}
              testID="line-empty"
            >
              Adicione transações para ver a evolução
            </Text>
          ) : (
            <View
              style={{
                width: "100%",
                alignItems: "center",
                marginTop: 8,
                position: "relative",
              }}
              testID="line-chart"
            >
              {LineChartComp ? (
                <>
                  <View
                    style={{
                      width: chartInnerWidth,
                      height: 220,
                      position: "relative",
                    }}
                  >
                    <LineChartComp
                      data={{
                        labels: lineData.labels,
                        datasets: [
                          {
                            data: lineData.incomings,
                            color: () => "#12a454",
                            strokeWidth: 2,
                          },
                          {
                            data: lineData.expenses,
                            color: () => "#e83e5a",
                            strokeWidth: 2,
                          },
                          {
                            data: lineData.net,
                            color: () => "#581C87",
                            strokeWidth: 2,
                          },
                        ],
                        legend: ["Entradas", "Saídas", "Saldo"],
                      }}
                      width={chartInnerWidth}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix=""
                      yLabelsOffset={8}
                      formatYLabel={(yLabel: string) => {
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
                      formatXLabel={(xLabel: string) => String(xLabel)}
                      chartConfig={{
                        backgroundColor: cardBgWhite,
                        backgroundGradientFrom: cardBgWhite,
                        backgroundGradientTo: cardBgWhite,
                        decimalPlaces: 2,
                        color: (opacity = 1) =>
                          isDark
                            ? `rgba(228,228,231,${opacity})`
                            : `rgba(88,28,135,${opacity})`,
                        labelColor: (opacity = 1) =>
                          isDark
                            ? `rgba(161,161,170,${opacity})`
                            : `rgba(107,114,128,${opacity})`,
                        propsForDots: {
                          r: "5",
                          strokeWidth: "2",
                          stroke: PURPLE_900,
                        },
                        propsForHorizontalLabels: { fontSize: 9 },
                        propsForVerticalLabels: { fontSize: 11 },
                      }}
                      getDotProps={(value: any, index: number) => {
                        const isSelected = index === selectedLineIndex;
                        return {
                          r: isSelected ? "7" : "5",
                          strokeWidth: "2",
                          stroke: PURPLE_900,
                        };
                      }}
                      bezier
                      style={{ borderRadius: 16 }}
                      withDots
                      withInnerLines
                      withOuterLines
                      withVerticalLines
                      withHorizontalLabels
                      withVerticalLabels={false}
                      onDataPointClick={({ index }: any) =>
                        setSelectedLineIndex((prev: any) =>
                          prev === index ? null : index,
                        )
                      }
                      decorator={({
                        width: w,
                        height: h,
                        paddingTop,
                        paddingRight,
                        data,
                      }: any) => {
                        if (
                          selectedLineIndex === null ||
                          !data ||
                          !data[0] ||
                          selectedLineIndex < 0 ||
                          selectedLineIndex >= data[0].data.length
                        )
                          return null;
                        try {
                          const { G, Line } = require("react-native-svg");
                          const x =
                            paddingRight +
                            (selectedLineIndex * (w - paddingRight)) /
                              data[0].data.length;
                          // destaca o período selecionado com linha vertical cinza escuro para realce
                          return (
                            <G key={`sel-${selectedLineIndex}`}>
                              <Line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={h * 0.75 + paddingTop}
                                stroke="#52525b"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                                opacity={0.85}
                              />
                            </G>
                          );
                        } catch {
                          return null;
                        }
                      }}
                    />
                    {/* Overlay com tolerância para dedo: 6 áreas verticais cobrindo cada intervalo, aumentando hitSlop */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: chartInnerWidth,
                        height: 220,
                        flexDirection: "row",
                        zIndex: 5,
                      }}
                      pointerEvents="box-none"
                    >
                      {lineData.labels.map((_, idx) => (
                        <TouchableOpacity
                          key={`hit-${idx}`}
                          onPress={() =>
                            setSelectedLineIndex((prev: any) =>
                              prev === idx ? null : idx,
                            )
                          }
                          testID={`dot-hit-${idx}`}
                          hitSlop={{ top: 20, bottom: 20, left: 12, right: 12 }}
                          style={{ flex: 1, marginHorizontal: 1 }}
                          accessibilityLabel={`Ponto ${lineData.labels[idx]}`}
                        >
                          <View style={{ flex: 1 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Tooltip compacto sobre o intervalo, deslocado para o lado e com largura respeitando conteúdo interno */}
                    {selectedLineIndex !== null &&
                    lineData.labels[selectedLineIndex] !== undefined
                      ? (() => {
                          const paddingRight = 64;
                          const x =
                            paddingRight +
                            (selectedLineIndex *
                              (chartInnerWidth - paddingRight)) /
                              lineData.labels.length;
                          const isLeftSide = selectedLineIndex <= 2;
                          // largura respeita valores internos: deixa auto com min/max baseado no espaço disponível até a borda
                          const availableToRight = chartInnerWidth - x - 12;
                          const availableToLeft = x - 12;
                          const maxW = isLeftSide
                            ? Math.min(availableToRight, chartInnerWidth - 16)
                            : Math.min(availableToLeft, chartInnerWidth - 16);
                          const left = isLeftSide ? x + 10 : undefined;
                          const right = !isLeftSide
                            ? chartInnerWidth - x + 10
                            : undefined;
                          return (
                            <View
                              testID="line-tooltip"
                              style={{
                                position: "absolute",
                                top: 8,
                                left: left,
                                right: right,
                                backgroundColor: isDark ? "#27272a" : "white",
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                shadowColor: "#000",
                                shadowOpacity: 0.12,
                                shadowRadius: 6,
                                elevation: 4,
                                borderWidth: 1,
                                borderColor: isDark ? "#3f3f46" : "#e5e7eb",
                                minWidth: 130,
                                maxWidth: Math.max(
                                  160,
                                  Math.min(maxW, chartInnerWidth - 16),
                                ),
                                alignItems: "flex-start",
                                alignSelf: isLeftSide
                                  ? "flex-start"
                                  : "flex-end",
                                zIndex: 10,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color: titleText,
                                  marginBottom: 4,
                                  textTransform: "capitalize",
                                }}
                              >
                                {lineData.labels[selectedLineIndex]}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 1,
                                }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: "#12a454",
                                  }}
                                />
                                <Text style={{ fontSize: 11, color: subText }}>
                                  Entradas:{" "}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: titleText,
                                  }}
                                >
                                  {formatCurrency(
                                    lineData.incomings[selectedLineIndex],
                                  )}
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 3,
                                }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: "#e83e5a",
                                  }}
                                />
                                <Text style={{ fontSize: 11, color: subText }}>
                                  Saídas:{" "}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: titleText,
                                  }}
                                >
                                  {formatCurrency(
                                    lineData.expenses[selectedLineIndex],
                                  )}
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 3,
                                }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: "#581C87",
                                  }}
                                />
                                <Text style={{ fontSize: 11, color: subText }}>
                                  Saldo:{" "}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: titleText,
                                  }}
                                >
                                  {formatCurrency(
                                    lineData.net[selectedLineIndex],
                                  )}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => setSelectedLineIndex(null)}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                                style={{ marginTop: 6, alignSelf: "center" }}
                                testID="line-tooltip-close"
                              >
                                <Text style={{ fontSize: 10, color: subText }}>
                                  Fechar
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })()
                      : null}
                  </View>
                  {/* Legendas dos meses abaixo, na posição correta do gráfico, clicáveis com realce */}
                  <View
                    style={{
                      width: chartInnerWidth,
                      height: 30,
                      marginTop: 2,
                      position: "relative",
                    }}
                    testID="line-x-pressables"
                  >
                    {lineData.labels.map((label, idx) => {
                      const isSelected = selectedLineIndex === idx;
                      // calcula X igual ao gráfico: paddingRight (64) + i*(width-paddingRight)/6
                      const paddingRight = 64;
                      const x =
                        paddingRight +
                        (idx * (chartInnerWidth - paddingRight)) /
                          lineData.labels.length;
                      return (
                        <TouchableOpacity
                          key={`x-${label}-${idx}`}
                          onPress={() =>
                            setSelectedLineIndex((prev: any) =>
                              prev === idx ? null : idx,
                            )
                          }
                          testID={`line-point-${idx}`}
                          accessibilityLabel={`Ponto ${label}`}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{
                            position: "absolute",
                            left: x - 28,
                            width: 56,
                            alignItems: "center",
                            paddingVertical: 4,
                            paddingHorizontal: 4,
                            borderRadius: 6,
                            backgroundColor: isSelected
                              ? isDark
                                ? "#3f3f46"
                                : "#f3e8ff"
                              : "transparent",
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected
                              ? PURPLE_900
                              : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: isSelected ? "700" : "500",
                              color: isSelected ? PURPLE_900 : subText,
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text testID="line-fallback">
                  {lineData.labels.join(" | ")}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Metas e objetivos */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 12,
            backgroundColor: cardBgWhite,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "700", color: titleText }}
              testID="goals-title"
            >
              Metas e objetivos
            </Text>
            {goals.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("Goals")}
                testID="goals-ver-tudo"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isDark ? "#3f3f46" : "#f3e8ff",
                  borderWidth: 1,
                  borderColor: isDark ? "#52525b" : "#e9d5ff",
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: PURPLE_600 }}
                >
                  Ver tudo
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {goals.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}
              testID="goals-empty"
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: isDark ? "#3f3f46" : "#f3e8ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="target" size={28} color={PURPLE_600} />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: titleText,
                  textAlign: "center",
                }}
              >
                Nenhuma meta ainda
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: subText,
                  textAlign: "center",
                  paddingHorizontal: 16,
                }}
              >
                Crie sua primeira meta e acompanhe seu progresso financeiro
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Goals", { openAdd: true })}
                testID="goals-empty-criar"
                style={{
                  marginTop: 8,
                  backgroundColor: PURPLE_600,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Feather name="plus" size={16} color="white" />
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 13 }}
                >
                  Criar meta
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }} testID="goals-list">
              {(urgentGoals.length > 0
                ? urgentGoals.slice(0, 3)
                : [...goals]
                    .sort((a, b) => Number(a.date) - Number(b.date))
                    .slice(0, 3)
              ).map((goal) => {
                const progress = calcGoalProgress(goal);
                const days = differenceInCalendarDays(
                  new Date(goal.date),
                  Date.now(),
                );
                const isConcluded = progress >= 1;
                const daysText = isConcluded
                  ? "Concluída"
                  : days < 0
                    ? `Vencida há ${Math.abs(days)} dias`
                    : days === 0
                      ? "Vence hoje"
                      : `Restam ${days} dias`;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() =>
                      navigation.navigate("Goals", { editId: goal.id })
                    }
                    activeOpacity={0.8}
                    testID={`goal-${goal.id}`}
                    style={{
                      backgroundColor: isDark ? "#3f3f46" : "#f9fafb",
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "#52525b" : "#f3f4f6",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{ fontWeight: "600", color: titleText, flex: 1 }}
                        numberOfLines={1}
                      >
                        {goal.description}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isConcluded ? "#16a34a" : PURPLE_600,
                          marginLeft: 8,
                        }}
                      >
                        {daysText}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: subText }}>
                        {formatCurrency(goal.currentAmount)} /{" "}
                        {formatCurrency(goal.amount)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: isDark ? "#e4e4e7" : PURPLE_900,
                        }}
                      >
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        backgroundColor: isDark ? "#52525b" : "#e5e7eb",
                        borderRadius: 999,
                        marginTop: 8,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${progress * 100}%`,
                          height: 8,
                          backgroundColor:
                            progress >= 1 ? "#16a34a" : PURPLE_600,
                          borderRadius: 999,
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
              {goals.length > 3 && (
                <Text
                  style={{
                    fontSize: 11,
                    color: subText,
                    textAlign: "center",
                    marginTop: 2,
                  }}
                >
                  + {goals.length - 3}{" "}
                  {goals.length - 3 === 1 ? "meta" : "metas"} • Toque em Ver
                  tudo
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Sessão Estoque - por último */}
        {hasStock &&
          (stockMissing.length > 0 || stockNearMissing.length > 0) && (
            <View testID="estoque-section" style={{ marginTop: 4 }}>
              <View
                testID="estoque-separator"
                style={{
                  marginHorizontal: 16,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
              >
                <Text
                  className="text-gray-800 dark:text-gray-100 font-bold text-xl"
                  style={{ fontSize: 20, fontWeight: "700", color: titleText }}
                  testID="estoque-title"
                >
                  Estoque
                </Text>
                <Text
                  className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  style={{ fontSize: 12, color: subText, marginTop: 2 }}
                  testID="estoque-subtitle"
                >
                  Itens que precisam de atenção
                </Text>
              </View>

              {/* Em falta */}
              {stockMissing.length > 0 && (
                <View
                  className="mx-4 mt-2 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"
                  style={{
                    marginHorizontal: 16,
                    marginTop: 8,
                    backgroundColor: cardBgWhite,
                    borderRadius: 16,
                    padding: 16,
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                  }}
                  testID="stock-missing-card"
                >
                  <View
                    className="flex-row items-center justify-between"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      className="flex-row items-center"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: isDark
                            ? "rgba(239,68,68,0.15)"
                            : "#fef2f2",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name="alert-circle"
                          size={18}
                          color="#dc2626"
                        />
                      </View>
                      <View>
                        <Text
                          className="text-gray-800 dark:text-gray-100 font-bold text-base"
                          style={{
                            fontWeight: "700",
                            color: titleText,
                            fontSize: 15,
                          }}
                          testID="stock-missing-title"
                        >
                          Estoque em falta
                        </Text>
                        <Text
                          className="text-xs text-gray-500 dark:text-gray-400"
                          style={{ fontSize: 11, color: subText }}
                        >
                          {stockMissing.length}{" "}
                          {stockMissing.length === 1
                            ? "item precisa comprar"
                            : "itens precisam comprar"}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(239,68,68,0.12)"
                          : "#fef2f2",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        className="text-xs font-bold text-red-600 dark:text-red-300"
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#dc2626",
                        }}
                      >
                        {stockMissing.reduce(
                          (acc: number, it: StockRow) =>
                            acc +
                            (Number(it.quantityDesired) - Number(it.quantity)),
                          0,
                        )}{" "}
                        un.
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {stockMissing.slice(0, 5).map((it: StockRow) => {
                      const falta =
                        Number(it.quantityDesired) - Number(it.quantity);
                      return (
                        <View
                          key={it.id}
                          testID={`stock-missing-${it.id}`}
                          className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2"
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isDark ? "#3f3f46" : "#f9fafb",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: isDark ? "#52525b" : "#f3f4f6",
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                              style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: titleText,
                              }}
                              numberOfLines={1}
                            >
                              {it.description}
                            </Text>
                            <Text
                              className="text-xs text-gray-500 dark:text-gray-400"
                              style={{ fontSize: 11, color: subText }}
                            >
                              {it.category} • tem {it.quantity} / precisa{" "}
                              {it.quantityDesired}
                            </Text>
                          </View>
                          <View
                            className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: isDark
                                ? "rgba(239,68,68,0.2)"
                                : "#fee2e2",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 999,
                            }}
                          >
                            <Text
                              className="text-xs font-bold text-red-700 dark:text-red-300"
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: "#dc2626",
                              }}
                            >
                              Falta {falta}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                    {stockMissing.length > 5 && (
                      <Text
                        className="text-xs text-center text-gray-500 dark:text-gray-400"
                        style={{
                          fontSize: 11,
                          color: subText,
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        + {stockMissing.length - 5} itens em falta
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Mercado")}
                    testID="stock-missing-cta"
                    style={{
                      marginTop: 12,
                      backgroundColor: isDark ? "#7f1d1d" : "#fef2f2",
                      borderWidth: 1,
                      borderColor: "#fecaca",
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Feather name="shopping-cart" size={16} color="#dc2626" />
                    <Text
                      style={{
                        color: "#dc2626",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      Ver estoque
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Próximos de faltar */}
              {stockNearMissing.length > 0 && (
                <View
                  className="mx-4 mt-2 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"
                  style={{
                    marginHorizontal: 16,
                    marginTop: 8,
                    backgroundColor: cardBgWhite,
                    borderRadius: 16,
                    padding: 16,
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                  }}
                  testID="stock-near-card"
                >
                  <View
                    className="flex-row items-center justify-between"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      className="flex-row items-center"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/30 items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: isDark
                            ? "rgba(245,158,11,0.15)"
                            : "#fffbeb",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name="alert-triangle"
                          size={18}
                          color="#d97706"
                        />
                      </View>
                      <View>
                        <Text
                          className="text-gray-800 dark:text-gray-100 font-bold text-base"
                          style={{
                            fontWeight: "700",
                            color: titleText,
                            fontSize: 15,
                          }}
                          testID="stock-near-title"
                        >
                          Próximos de faltar
                        </Text>
                        <Text
                          className="text-xs text-gray-500 dark:text-gray-400"
                          style={{ fontSize: 11, color: subText }}
                        >
                          {stockNearMissing.length}{" "}
                          {stockNearMissing.length === 1
                            ? "item no limite"
                            : "itens no limite"}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(245,158,11,0.12)"
                          : "#fffbeb",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        className="text-xs font-bold text-amber-700 dark:text-amber-300"
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#d97706",
                        }}
                      >
                        Atenção
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {stockNearMissing.slice(0, 5).map((it: StockRow) => (
                      <View
                        key={it.id}
                        testID={`stock-near-${it.id}`}
                        className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2"
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: isDark ? "#3f3f46" : "#f9fafb",
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: isDark ? "#52525b" : "#f3f4f6",
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: titleText,
                            }}
                            numberOfLines={1}
                          >
                            {it.description}
                          </Text>
                          <Text
                            className="text-xs text-gray-500 dark:text-gray-400"
                            style={{ fontSize: 11, color: subText }}
                          >
                            {it.category} • tem {it.quantity} / precisa{" "}
                            {it.quantityDesired}
                          </Text>
                        </View>
                        <View
                          className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(245,158,11,0.2)"
                              : "#fef3c7",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                          }}
                        >
                          <Text
                            className="text-xs font-bold text-amber-800 dark:text-amber-200"
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: "#92400e",
                            }}
                          >
                            {Number(it.quantity) === Number(it.quantityDesired)
                              ? "No limite"
                              : "Quase"}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {stockNearMissing.length > 5 && (
                      <Text
                        className="text-xs text-center text-gray-500 dark:text-gray-400"
                        style={{
                          fontSize: 11,
                          color: subText,
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        + {stockNearMissing.length - 5} itens próximos
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

        {loading && (
          <Text
            testID="loading"
            style={{ textAlign: "center", color: subText, marginBottom: 16 }}
          >
            Carregando...
          </Text>
        )}
      </ScrollView>
      {(() => {
        if (!isAiEnabled) return null;
        const fabSize = 56;
        const onPress = () => navigation.navigate("IAPage");
        const labelBg = isDark ? "#27272a" : "white";
        const labelBorder = isDark ? "#3f3f46" : "#e5e7eb";
        const labelText = isDark ? "#e4e4e7" : "#374151";
        const Label = (
          <Animated.View style={{ opacity: iaLabelFade }}>
            <TouchableOpacity
              onPress={onPress}
              testID="dashboard-ia-label"
              accessibilityLabel="Analise com IA"
              activeOpacity={0.8}
              style={{
                backgroundColor: labelBg,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: labelBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                elevation: 4,
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.2 : 0.08,
                shadowRadius: 6,
                maxWidth: 160,
              }}
            >
              <Feather name="zap" size={14} color={PURPLE_600} />
              <Text style={{ color: labelText, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                Analise com IA
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
        if (BorderBeam)
          return (
            <View
              style={{
                position: "absolute",
                bottom: tabBarHeight + 8,
                right: 16,
                zIndex: 10,
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
              testID="dashboard-ia-fab-wrapper"
            >
              {Label}
              <View style={{ padding: 6 }}>
                <BorderBeam
                  borderRadius={fabSize / 2}
                  borderWidth={2}
                  colors={["#9c44dc", "#581C87", "#e9d5ff", "#9c44dc"]}
                  duration={3.2}
                  glow={7}
                  style={{
                    width: fabSize,
                    height: fabSize,
                    borderRadius: fabSize / 2,
                  }}
                >
                  <TouchableOpacity
                    testID="dashboard-ia-fab"
                    onPress={onPress}
                    accessibilityLabel="Abrir chat IA"
                    style={{
                      width: fabSize,
                      height: fabSize,
                      borderRadius: fabSize / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <Orb size={fabSize} color={PURPLE_600} testID="dashboard-ia-orb" />
                  </TouchableOpacity>
                </BorderBeam>
              </View>
            </View>
          );
        return (
          <View
            style={{
              position: "absolute",
              bottom: tabBarHeight + 16,
              right: 16,
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              zIndex: 10,
            }}
            testID="dashboard-ia-fab-wrapper"
          >
            {Label}
            <TouchableOpacity
              testID="dashboard-ia-fab"
              onPress={onPress}
              accessibilityLabel="Abrir chat IA"
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                elevation: 6,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                overflow: "hidden",
              }}
            >
              <Orb size={56} color={PURPLE_600} testID="dashboard-ia-orb" />
            </TouchableOpacity>
          </View>
        );
      })()}
    </View>
  );
}
