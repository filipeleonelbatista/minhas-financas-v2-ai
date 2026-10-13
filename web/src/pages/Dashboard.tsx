/** Dashboard Início — espelha `app/src/pages/Dashboard.tsx`. */
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
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
  stockAlerts,
  urgentGoals,
} from "@/lib/dashboard";
import { calcGoalProgress } from "@/lib/goals";
import { formatBRL } from "@/lib/format";

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
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

  const filtered = finance.getFilteredList();
  const hero = useMemo(() => calcHero(filtered), [filtered]);
  const tithe = finance.getTithe({
    percent: settings.tithePercent,
    categories: settings.getTitheCategories(),
    prefix: settings.prefixTithe,
    willUsePrefix: settings.willUsePrefixToRemoveTihteSum === 1,
  });

  const byCategory = useMemo(() => expensesByCategory(filtered), [filtered]);
  const evolution = useMemo(
    () => last6Months(finance.transactionsList),
    [finance.transactionsList]
  );
  const urgent = useMemo(
    () => urgentGoals(goals.goals),
    [goals.goals]
  );
  const alerts = useMemo(() => stockAlerts(market.stockList), [market.stockList]);
  const estimative = runs.getEstimative(settings.veicleAutonomy ?? 0);

  const healthy =
    hero.incomings > 0 ? Math.max(0, ((hero.incomings - hero.expenses) / hero.incomings) * 100) : 0;

  const donutOptions: ApexOptions = {
    labels: byCategory.map((c) => c.category),
    legend: { position: "bottom" },
  };
  const lineOptions: ApexOptions = {
    xaxis: { categories: evolution.map((b) => b.label) },
    stroke: { curve: "smooth" },
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Início" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Card title="Saldo" value={formatBRL(hero.saldo)} />
          <Card title="Entradas" value={formatBRL(hero.incomings)} />
          <Card title="Saídas" value={formatBRL(hero.expenses)} />
          {settings.isEnableTitheCard === 1 ? (
            <Card title="Dízimo" value={formatBRL(tithe)} sub={`${settings.tithePercent}%`} />
          ) : null}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Saúde das finanças</p>
          <div className="h-3 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-3 rounded bg-green-500" style={{ width: `${healthy}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-500">{healthy.toFixed(0)}% saudável</p>
        </div>

        {byCategory.length > 0 ? (
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Gastos por categoria</p>
            <Chart
              options={donutOptions}
              series={byCategory.map((c) => c.total)}
              type="donut"
              height={300}
            />
          </div>
        ) : null}

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Evolução 6 meses</p>
          <Chart
            options={lineOptions}
            series={[
              { name: "Entradas", data: evolution.map((b) => b.incomings) },
              { name: "Saídas", data: evolution.map((b) => b.expenses) },
            ]}
            type="line"
            height={280}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Combustível</p>
            <p className="text-sm">Km estimado: <b>{estimative.toFixed(0)} km</b></p>
            <p className="text-sm">Autonomia: <b>{settings.veicleAutonomy ?? 0} km/l</b></p>
            <Button className="mt-2" variant="outline" onClick={() => navigate("/runs")}>
              Ver corridas
            </Button>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Metas urgentes (≤30 dias)</p>
            {urgent.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma meta urgente.</p>
            ) : (
              urgent.slice(0, 5).map((g) => (
                <div key={g.id} className="mb-2 cursor-pointer" onClick={() => navigate("/goals")}>
                  <div className="flex justify-between text-sm">
                    <span>{g.description}</span>
                    <span>{Math.round(calcGoalProgress(g) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-200">
                    <div
                      className="h-2 rounded bg-purple-600"
                      style={{ width: `${calcGoalProgress(g) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {alerts.missing.length + alerts.near.length > 0 ? (
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Estoque</p>
            {alerts.missing.map((i) => (
              <p key={String(i.id)} className="text-sm text-red-600">
                Em falta: {String(i.description)}
              </p>
            ))}
            {alerts.near.slice(0, 5).map((i) => (
              <p key={String(i.id)} className="text-sm text-yellow-600">
                Quase acabando: {String(i.description)} ({Number(i.quantity)}/
                {Number(i.quantityDesired)})
              </p>
            ))}
            <Button className="mt-2" variant="outline" onClick={() => navigate("/stock")}>
              Ver estoque
            </Button>
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
