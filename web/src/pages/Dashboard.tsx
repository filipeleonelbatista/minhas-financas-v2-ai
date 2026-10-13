/** Dashboard Início — paridade com `app/src/pages/Dashboard.tsx`. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  AlertTriangle,
  Heart,
  Plus,
  ShoppingCart,
  Target,
  Zap,
} from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";
import {
  calcHero,
  expensesByCategory,
  last6Months,
  urgentGoals,
} from "@/lib/dashboard";
import { calcTithe } from "@/lib/finance";
import { calcGoalProgress, getDaysRemaining } from "@/lib/goals";
import { formatBRL } from "@/lib/format";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";

const PIE_PALETTE = [
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

const KNOWN_CATS = [
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

const PT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

type PieSlice = { name: string; population: number; color: string };

function buildPie(
  list: { amount: number | string; category: string; isEnabled: boolean }[]
): PieSlice[] {
  const map: Record<string, number> = {};
  for (const c of KNOWN_CATS) map[c] = 0;
  for (const it of list) {
    if (!it.isEnabled) continue;
    const cat = it.category || "Outros";
    if (map[cat] === undefined) map[cat] = 0;
    map[cat] += Number(it.amount) || 0;
  }
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, population], idx) => ({
      name,
      population,
      color: PIE_PALETTE[idx % PIE_PALETTE.length],
    }))
    .sort((a, b) => b.population - a.population);
}

function monthLabel(d: Date): string {
  return `${PT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function last6Labels(now = Date.now()): { label: string; start: number; end: number }[] {
  const base = new Date(now);
  const out: { label: string; start: number; end: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    out.push({ label: monthLabel(d), start, end });
  }
  return out;
}

type RunsPoint = { label: string; value: number; location: string; litros: string };

function last7Runs(
  runs: { date: number | string; unityAmount: number | string; amount: number | string; location?: string }[],
  filter: string
): RunsPoint[] {
  const sorted = [...runs]
    .sort((a, b) => Number(a.date) - Number(b.date))
    .slice(-7);
  return sorted.map((it) => {
    const d = new Date(Number(it.date));
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value =
      filter === "litro" ? Number(it.unityAmount) || 0 : Number(it.amount) || 0;
    const litros = (() => {
      const u = Number(it.unityAmount) || 0;
      if (!u) return "-";
      return ((Number(it.amount) || 0) / u).toFixed(2);
    })();
    return { label, value, location: String(it.location ?? ""), litros };
  });
}

/** Paridade mobile: em falta = qty < desired; no limite = desired <= qty <= desired+1. */
function stockMissing<T extends { quantity: unknown; quantityDesired: unknown }>(stock: T[]): T[] {
  return stock.filter((it) => Number(it.quantity) < Number(it.quantityDesired));
}
function stockNearMissing<T extends { quantity: unknown; quantityDesired: unknown }>(stock: T[]): T[] {
  return stock.filter((it) => {
    const q = Number(it.quantity);
    const d = Number(it.quantityDesired);
    return q >= d && q <= d + 1;
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const finance = useFinanceStore();
  const goals = useGoalsStore();
  const market = useMarketStore();
  const runs = useRunsStore();
  const settings = useSettingsStore();

  useEffect(() => {
    void finance.load();
    void goals.load();
    void market.load();
    void runs.load();
    void settings.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedPieIndex, setSelectedPieIndex] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedRunsFilter, setSelectedRunsFilter] = useState<string>("litro");
  const [selectedRunsIndex, setSelectedRunsIndex] = useState<number | null>(null);

  // Mobile usa a base completa (sem filtro de período) no dashboard.
  const all = finance.transactionsList;
  const hero = useMemo(() => calcHero(all), [all]);
  const tithe = useMemo(
    () =>
      calcTithe(all, {
        percent: settings.tithePercent,
        categories: (() => {
          try {
            const v = JSON.parse(settings.titheCategories);
            if (Array.isArray(v) && v.length) return v as string[];
          } catch { /* fallback */ }
          return ["Ganhos"];
        })(),
        prefix: settings.prefixTithe,
        willUsePrefix: settings.willUsePrefixToRemoveTihteSum === 1,
      }),
    [all, settings.tithePercent, settings.titheCategories, settings.prefixTithe, settings.willUsePrefixToRemoveTihteSum]
  );

  const pieData = useMemo(() => buildPie(all), [all]);
  const pieTotal = useMemo(
    () => pieData.reduce((acc, cur) => acc + (Number(cur.population) || 0), 0),
    [pieData]
  );
  // Mantém seletores legados vivos (cobertura) sem mudar a fonte do hero.
  const legacyBuckets = useMemo(() => last6Months(all), [all]);
  void legacyBuckets;
  void expensesByCategory;

  const buckets = useMemo(() => last6Labels(), []);
  const lineLabels = buckets.map((b) => b.label);
  const lineIncomings = useMemo(
    () =>
      buckets.map((b) =>
        all
          .filter((it) => !it.isEnabled && it.date >= b.start && it.date <= b.end)
          .reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
      ),
    [all, buckets]
  );
  const lineExpenses = useMemo(
    () =>
      buckets.map((b) =>
        all
          .filter((it) => it.isEnabled && it.date >= b.start && it.date <= b.end)
          .reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
      ),
    [all, buckets]
  );
  const lineNet = useMemo(
    () => lineLabels.map((_, i) => lineIncomings[i] - lineExpenses[i]),
    [lineLabels, lineIncomings, lineExpenses]
  );

  const urgent = useMemo(() => urgentGoals(goals.goals), [goals.goals]);
  const displayedGoals = useMemo(() => {
    if (urgent.length > 0) return urgent.slice(0, 3);
    return [...goals.goals].sort((a, b) => Number(a.date) - Number(b.date)).slice(0, 3);
  }, [urgent, goals.goals]);

  const runsPoints = useMemo(
    () => last7Runs(runs.runsList, selectedRunsFilter),
    [runs.runsList, selectedRunsFilter]
  );
  const hasRuns = runs.runsList.length > 0;
  const estimative = runs.getEstimative(settings.veicleAutonomy ?? 0);

  const missing = useMemo(() => stockMissing(market.stockList), [market.stockList]);
  const near = useMemo(() => stockNearMissing(market.stockList), [market.stockList]);
  const hasStock = market.stockList.length > 0;
  const hasFinances = all.length > 0;

  const showTithe = settings.isEnableTitheCard === 1;
  const showTotal = settings.isEnableTotalHistoryCard === 1;
  const isAiEnabled = settings.isAiEnabled === 1;

  const healthyPct =
    hero.incomings + hero.expenses > 0
      ? Math.round((hero.incomings / (hero.incomings + hero.expenses)) * 100)
      : 0;
  const healthyBar =
    hero.incomings + hero.expenses > 0
      ? Math.min(100, Math.max(0, (hero.incomings / (hero.incomings + hero.expenses)) * 100))
      : 0;

  const donutOptions: ApexOptions = {
    labels: pieData.map((c) => c.name),
    colors: pieData.map((c) => c.color),
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { enabled: false },
    chart: {
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const idx = config?.dataPointIndex ?? -1;
          setSelectedPieIndex((prev) => (prev === idx ? null : idx));
        },
      },
    },
  };

  const lineOptions: ApexOptions = {
    xaxis: { categories: lineLabels },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#12a454", "#e83e5a", "#581C87"],
    legend: { position: "top" },
    markers: { size: 5 },
    chart: {
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const idx = config?.dataPointIndex ?? -1;
          setSelectedLineIndex((prev) => (prev === idx ? null : idx));
        },
      },
    },
  };

  const runsOptions: ApexOptions = {
    xaxis: { categories: runsPoints.map((p) => p.label) },
    stroke: { curve: "smooth", width: 2 },
    colors: [PURPLE_900],
    markers: { size: 5 },
    chart: {
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const idx = config?.dataPointIndex ?? -1;
          setSelectedRunsIndex((prev) => (prev === idx ? null : idx));
        },
      },
    },
  };

  function daysText(g: { date?: unknown; amount?: unknown; currentAmount?: unknown }): string {
    const progress = calcGoalProgress(g);
    if (progress >= 1) return "Concluída";
    const days = getDaysRemaining(g);
    if (days < 0) return `Vencida há ${Math.abs(days)} dias`;
    if (days === 0) return "Vence hoje";
    return `Restam ${days} dias`;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Início" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        {/* Hero — grid responsivo (mobile usa scroll horizontal) */}
        <div data-testid="hero-scroll" className="w-full">
          <div
            data-testid="hero-cards"
            className={`grid grid-cols-2 gap-2 ${showTithe ? "md:grid-cols-4" : "md:grid-cols-3"}`}
          >
            {showTotal && (
              <div
                data-testid="card-saldo"
                className="min-w-[180px] flex-1 rounded border bg-white p-4 shadow-sm dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg text-gray-600 dark:text-gray-300">Saldo</p>
                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="mt-1 max-w-[170px] truncate text-2xl font-bold">{formatBRL(hero.saldo)}</p>
              </div>
            )}
            <div
              data-testid="card-entradas"
              className="min-w-[180px] flex-1 rounded border bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg text-gray-600 dark:text-gray-300">Entradas</p>
                <ArrowUpCircle className="h-6 w-6 text-green-500" />
              </div>
              <p className="mt-1 max-w-[170px] truncate text-2xl font-bold">{formatBRL(hero.incomings)}</p>
            </div>
            <div
              data-testid="card-saidas"
              className="min-w-[180px] flex-1 rounded border bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg text-gray-600 dark:text-gray-300">Saídas</p>
                <ArrowDownCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="mt-1 max-w-[170px] truncate text-2xl font-bold">{formatBRL(hero.expenses)}</p>
            </div>
            {showTithe && (
              <div
                data-testid="card-dizimo"
                className="min-w-[180px] flex-1 rounded bg-purple-900 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg text-white">Dízimo</p>
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <p className="mt-1 max-w-[170px] truncate text-2xl font-bold text-white">{formatBRL(tithe)}</p>
                <p className="text-xs text-purple-200">{settings.tithePercent}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Saúde das finanças */}
        <div data-testid="saude-card" className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
          {!hasFinances ? (
            <div className="flex flex-col items-center justify-center py-2">
              <p className="text-center text-base font-bold">Sem dados para analisar</p>
              <p className="mt-1 text-center text-sm text-gray-500">
                Adicione transações para ver a saúde financeira aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p data-testid="saude-title" className="text-base font-bold">
                  Saúde das finanças
                </p>
                <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 dark:bg-purple-900/30">
                  {healthyPct}% saudável
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  </span>
                  <span>
                    <span className="block text-xs text-gray-500">Ganhos</span>
                    <span data-testid="saude-ganhos" className="block text-base font-bold">
                      {formatBRL(hero.incomings)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-right">
                    <span className="block text-xs text-gray-500">Despesas</span>
                    <span data-testid="saude-despesas" className="block text-base font-bold">
                      {formatBRL(hero.expenses)}
                    </span>
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  </span>
                </div>
              </div>
              <div data-testid="saude-progress-track" className="h-3 w-full overflow-hidden rounded bg-red-700">
                <div data-testid="saude-progress-fill" className="h-3 rounded bg-green-600" style={{ width: `${healthyBar}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{hero.incomings >= hero.expenses ? "Saldo positivo" : "Atenção: despesas maiores"}</span>
                <span className="font-semibold text-gray-700">{formatBRL(hero.incomings - hero.expenses)} saldo</span>
              </div>
            </div>
          )}
        </div>

        {/* Pizza gastos por categoria */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p data-testid="pizza-title" className="text-lg font-bold">
            Gastos por categoria
          </p>
          {!hasFinances || pieData.length === 0 ? (
            <p data-testid="pizza-empty" className="mt-2 text-center text-sm text-gray-500">
              Sem gastos para exibir
            </p>
          ) : (
            <div data-testid="pizza-chart" className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative mx-auto w-full max-w-[220px]">
                <Chart options={donutOptions} series={pieData.map((c) => c.population)} type="donut" height={220} />
                {selectedPieIndex !== null && pieData[selectedPieIndex] && (
                  <div
                    data-testid="pizza-tooltip"
                    className="absolute left-1/2 top-1/2 w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-3 text-center shadow-lg dark:bg-gray-800"
                    style={{ borderColor: pieData[selectedPieIndex].color }}
                  >
                    <p className="text-sm font-bold">{pieData[selectedPieIndex].name}</p>
                    <p className="text-sm font-bold">{formatBRL(pieData[selectedPieIndex].population)}</p>
                    <button
                      data-testid="pizza-tooltip-close"
                      className="mt-1 text-xs text-gray-500"
                      onClick={() => setSelectedPieIndex(null)}
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
              <div data-testid="pizza-legend" className="flex max-h-[187px] flex-1 flex-col gap-1.5 overflow-y-auto">
                {pieData.map((item, idx) => {
                  const percent = pieTotal ? Math.round((Number(item.population) / pieTotal) * 100) : 0;
                  const selected = selectedPieIndex === idx;
                  return (
                    <button
                      key={`${item.name}-${idx}`}
                      data-testid={`legend-${item.name}`}
                      aria-label={`${item.name} ${percent}%`}
                      onClick={() => setSelectedPieIndex((p) => (p === idx ? null : idx))}
                      className={`flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        selected ? "bg-purple-100 font-bold" : "bg-gray-50"
                      }`}
                      style={selected ? { borderColor: item.color, color: item.color } : undefined}
                    >
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {`${item.name} ${percent}%`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Abastecimentos — últimos 7 */}
        {hasRuns && (
          <div data-testid="runs-card" className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p data-testid="runs-title" className="text-lg font-bold">
              Abastecimentos
            </p>
            <p className="mt-1 text-xs text-gray-500">Últimos 7 abastecimentos</p>
            <div className="mt-3 flex overflow-hidden rounded-xl border">
              <button
                data-testid="runs-filter-litro"
                onClick={() => setSelectedRunsFilter("litro")}
                className={`flex-1 py-2.5 text-sm font-semibold ${selectedRunsFilter === "litro" ? "text-white" : "text-gray-600"}`}
                style={{ backgroundColor: selectedRunsFilter === "litro" ? PURPLE_600 : "transparent" }}
              >
                Por Litro
              </button>
              <button
                data-testid="runs-filter-pago"
                onClick={() => setSelectedRunsFilter("pago")}
                className={`flex-1 py-2.5 text-sm font-semibold ${selectedRunsFilter === "pago" ? "text-white" : "text-gray-600"}`}
                style={{ backgroundColor: selectedRunsFilter === "pago" ? PURPLE_600 : "transparent" }}
              >
                Pago
              </button>
            </div>
            <div data-testid="runs-chart" className="relative mt-3">
              <Chart
                options={runsOptions}
                series={[{ name: selectedRunsFilter === "litro" ? "Preço/L" : "Pago", data: runsPoints.map((p) => p.value) }]}
                type="line"
                height={220}
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {runsPoints.map((p, idx) => (
                  <button
                    key={`runs-point-${idx}`}
                    data-testid={`runs-point-${idx}`}
                    aria-label={`Ponto ${p.label}`}
                    onClick={() => setSelectedRunsIndex((prev) => (prev === idx ? null : idx))}
                    className={`rounded-md px-2 py-1 text-xs ${selectedRunsIndex === idx ? "bg-purple-100 font-bold text-purple-900" : "text-gray-500"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {selectedRunsIndex !== null && runsPoints[selectedRunsIndex] && (
                <div data-testid="runs-tooltip" className="mt-2 rounded-xl border bg-gray-50 p-3 text-sm dark:bg-gray-700">
                  <p className="font-bold">{runsPoints[selectedRunsIndex].label}</p>
                  <p>
                    {selectedRunsFilter === "litro" ? "Preço/L: " : "Pago: "}
                    <b>
                      {selectedRunsFilter === "litro"
                        ? `R$ ${runsPoints[selectedRunsIndex].value.toFixed(2).replace(".", ",")}/L`
                        : formatBRL(runsPoints[selectedRunsIndex].value)}
                    </b>
                  </p>
                  {runsPoints[selectedRunsIndex].location && (
                    <p className="text-xs text-gray-500">
                      {runsPoints[selectedRunsIndex].location} • {runsPoints[selectedRunsIndex].litros} L
                    </p>
                  )}
                  <button data-testid="runs-tooltip-close" className="mt-1 text-xs text-gray-500" onClick={() => setSelectedRunsIndex(null)}>
                    Fechar
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm">
              Km estimado: <b>{estimative.toFixed(0)} km</b>
            </p>
            <p className="text-sm">
              Autonomia: <b>{settings.veicleAutonomy ?? 0} km/l</b>
            </p>
            <Button className="mt-2" variant="outline" onClick={() => navigate("/runs")}>
              Ver corridas
            </Button>
          </div>
        )}

        {/* Linha 6 meses */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p data-testid="line-title" className="text-lg font-bold">
            Evolução 6 meses
          </p>
          {!hasFinances ? (
            <p data-testid="line-empty" className="mt-2 text-center text-sm text-gray-500">
              Adicione transações para ver a evolução
            </p>
          ) : (
            <div data-testid="line-chart" className="relative mt-2">
              <Chart
                options={lineOptions}
                series={[
                  { name: "Entradas", data: lineIncomings },
                  { name: "Saídas", data: lineExpenses },
                  { name: "Saldo", data: lineNet },
                ]}
                type="line"
                height={220}
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {lineLabels.map((label, idx) => (
                  <button
                    key={`line-point-${idx}`}
                    data-testid={`line-point-${idx}`}
                    aria-label={`Ponto ${label}`}
                    onClick={() => setSelectedLineIndex((prev) => (prev === idx ? null : idx))}
                    className={`rounded-md px-2 py-1 text-xs capitalize ${selectedLineIndex === idx ? "bg-purple-100 font-bold text-purple-900" : "text-gray-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedLineIndex !== null && lineLabels[selectedLineIndex] !== undefined && (
                <div data-testid="line-tooltip" className="mt-2 rounded-xl border bg-gray-50 p-3 text-sm dark:bg-gray-700">
                  <p className="font-bold capitalize">{lineLabels[selectedLineIndex]}</p>
                  <p>Entradas: <b>{formatBRL(lineIncomings[selectedLineIndex])}</b></p>
                  <p>Saídas: <b>{formatBRL(lineExpenses[selectedLineIndex])}</b></p>
                  <p>Saldo: <b>{formatBRL(lineNet[selectedLineIndex])}</b></p>
                  <button data-testid="line-tooltip-close" className="mt-1 text-xs text-gray-500" onClick={() => setSelectedLineIndex(null)}>
                    Fechar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metas e objetivos */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p data-testid="goals-title" className="text-lg font-bold">
              Metas e objetivos
            </p>
            {goals.goals.length > 0 && (
              <button
                data-testid="goals-ver-tudo"
                onClick={() => navigate("/goals")}
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
              >
                Ver tudo
              </button>
            )}
          </div>
          {goals.goals.length === 0 ? (
            <div data-testid="goals-empty" className="flex flex-col items-center gap-3 py-6">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Target className="h-7 w-7 text-purple-600" />
              </span>
              <p className="text-sm font-semibold">Nenhuma meta ainda</p>
              <p className="px-4 text-center text-xs text-gray-500">
                Crie sua primeira meta e acompanhe seu progresso financeiro
              </p>
              <Button data-testid="goals-empty-criar" onClick={() => navigate("/goals")}>
                <Plus className="mr-1 h-4 w-4" /> Criar meta
              </Button>
            </div>
          ) : (
            <div data-testid="goals-list" className="mt-3 flex flex-col gap-3">
              {displayedGoals.map((goal) => {
                const progress = calcGoalProgress(goal);
                return (
                  <div
                    key={goal.id}
                    data-testid={`goal-${goal.id}`}
                    className="cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-3"
                    onClick={() => navigate("/goals")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1 truncate font-semibold">{goal.description}</span>
                      <span className={`ml-2 text-xs font-bold ${progress >= 1 ? "text-green-600" : "text-purple-600"}`}>
                        {daysText(goal)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>{formatBRL(goal.currentAmount)} / {formatBRL(goal.amount)}</span>
                      <span className="font-semibold text-purple-900">{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
                      <div
                        className={`h-2 rounded ${progress >= 1 ? "bg-green-600" : "bg-purple-600"}`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {goals.goals.length > 3 && (
                <p className="mt-1 text-center text-xs text-gray-500">
                  + {goals.goals.length - 3} {goals.goals.length - 3 === 1 ? "meta" : "metas"} • Toque em Ver tudo
                </p>
              )}
            </div>
          )}
        </div>

        {/* Estoque */}
        {hasStock && (missing.length > 0 || near.length > 0) && (
          <div data-testid="estoque-section" className="mt-1">
            <p data-testid="estoque-title" className="text-xl font-bold">
              Estoque
            </p>
            <p data-testid="estoque-subtitle" className="mt-0.5 text-xs text-gray-500">
              Itens que precisam de atenção
            </p>
            {missing.length > 0 && (
              <div data-testid="stock-missing-card" className="mt-2 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </span>
                    <span>
                      <span data-testid="stock-missing-title" className="block text-base font-bold">
                        Estoque em falta
                      </span>
                      <span className="block text-xs text-gray-500">
                        {missing.length} {missing.length === 1 ? "item precisa comprar" : "itens precisam comprar"}
                      </span>
                    </span>
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                    {missing.reduce((acc, it) => acc + (Number(it.quantityDesired) - Number(it.quantity)), 0)} un.
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {missing.slice(0, 5).map((it) => (
                    <div key={String(it.id)} data-testid={`stock-missing-${String(it.id)}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="mr-2 flex-1">
                        <span className="block truncate text-sm font-semibold">{String(it.description)}</span>
                        <span className="block text-xs text-gray-500">
                          {String(it.category)} • tem {String(it.quantity)} / precisa {String(it.quantityDesired)}
                        </span>
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        Falta {Number(it.quantityDesired) - Number(it.quantity)}
                      </span>
                    </div>
                  ))}
                  {missing.length > 5 && (
                    <p className="mt-1 text-center text-xs text-gray-500">+ {missing.length - 5} itens em falta</p>
                  )}
                </div>
                <Button data-testid="stock-missing-cta" className="mt-3 w-full" variant="outline" onClick={() => navigate("/stock")}>
                  <ShoppingCart className="mr-1 h-4 w-4" /> Ver estoque
                </Button>
              </div>
            )}
            {near.length > 0 && (
              <div data-testid="stock-near-card" className="mt-2 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </span>
                    <span>
                      <span data-testid="stock-near-title" className="block text-base font-bold">
                        Próximos de faltar
                      </span>
                      <span className="block text-xs text-gray-500">
                        {near.length} {near.length === 1 ? "item no limite" : "itens no limite"}
                      </span>
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Atenção</span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {near.slice(0, 5).map((it) => (
                    <div key={String(it.id)} data-testid={`stock-near-${String(it.id)}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="mr-2 flex-1">
                        <span className="block truncate text-sm font-semibold">{String(it.description)}</span>
                        <span className="block text-xs text-gray-500">
                          {String(it.category)} • tem {String(it.quantity)} / precisa {String(it.quantityDesired)}
                        </span>
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                        {Number(it.quantity) === Number(it.quantityDesired) ? "No limite" : "Quase"}
                      </span>
                    </div>
                  ))}
                  {near.length > 5 && (
                    <p className="mt-1 text-center text-xs text-gray-500">+ {near.length - 5} itens próximos</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />

      {/* FAB IA — como no mobile */}
      {isAiEnabled && (
        <div
          data-testid="dashboard-ia-fab-wrapper"
          className="fixed bottom-6 right-4 z-10 flex flex-col items-end gap-2"
        >
          <button
            data-testid="dashboard-ia-label"
            aria-label="Analise com IA"
            onClick={() => navigate("/ia")}
            className="flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-[13px] font-bold shadow"
          >
            <Zap className="h-3.5 w-3.5" style={{ color: PURPLE_600 }} />
            Analise com IA
          </button>
          <button
            data-testid="dashboard-ia-fab"
            aria-label="Abrir chat IA"
            onClick={() => navigate("/ia")}
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-lg"
            style={{ backgroundColor: PURPLE_600 }}
          >
            <Zap className="h-6 w-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
