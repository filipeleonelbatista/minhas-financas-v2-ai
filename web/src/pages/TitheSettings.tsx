/** Dízimo JFA — espelha `app/src/pages/TitheSettings.tsx` (hero + escrituras + % + base + prefixo + histórico). */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Heart,
  Layers,
  Minus,
  Percent,
  Plus,
} from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useSettingsStore } from "@/stores/settings";
import { useFinanceStore } from "@/stores/finance";
import { formatBRL, formatDateBR } from "@/lib/format";
import { TITHE_SCRIPTURES, validateTithePercent } from "@/lib/tithe";
import { cn } from "@/lib/utils";

const BASE_OPTIONS = ["Ganhos", "Investimentos"];

export default function TitheSettings() {
  const { toast } = useToast();
  const settings = useSettingsStore();
  const finance = useFinanceStore();
  const categories = settings.getTitheCategories();

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const monthLabel = `${String(month).padStart(2, "0")}/${year}`;

  const [percentText, setPercentText] = useState(String(settings.tithePercent ?? 10));
  const [activeScripture, setActiveScripture] = useState(0);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.all([settings.load(), finance.load()]);
      if (!alive) return;
      setPercentText(String(useSettingsStore.getState().tithePercent ?? 10));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const percent = validateTithePercent(settings.tithePercent);
  const previewAmount = settings.getMonthlyTithePreview(month, year);
  const emptyBase = categories.length === 0;
  const previewWarning = emptyBase ? "Selecione ao menos um Ganho" : null;

  const handlePercentChange = (text: string) => {
    setPercentText(text);
    const num = Number(text.replace(",", "."));
    if (!Number.isFinite(num)) return;
    void settings.update("tithePercent", validateTithePercent(num));
  };

  const commitPercent = () => {
    const num = Number(percentText.replace(",", "."));
    const validated = validateTithePercent(Number.isFinite(num) ? num : percent);
    setPercentText(String(validated));
    void settings.update("tithePercent", validated);
  };

  const stepPercent = (delta: number) => {
    const next = validateTithePercent(percent + delta);
    setPercentText(String(next));
    void settings.update("tithePercent", next);
  };

  const toggleBase = (cat: string) => {
    const next = categories.includes(cat)
      ? categories.filter((c) => c !== cat)
      : [...categories, cat];
    void settings.update("titheCategories", JSON.stringify(next));
  };

  const pay = async () => {
    if (categories.length === 0) {
      toast({ description: "Selecione ao menos um Ganho", variant: "destructive" });
      return;
    }
    if (previewAmount === 0) {
      toast({ description: "Dízimo é R$ 0,00 — adicione Ganhos este mês", variant: "destructive" });
      return;
    }
    if (!confirm(`Marcar dízimo de ${monthLabel} como pago?`)) return;
    setSaving(true);
    try {
      await settings.markAsPaid(month, year);
      toast({ description: "Dízimo marcado como pago!", variant: "success" });
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;
  if (settings.isTitheMenuEnabled !== 1) return <Navigate to="/settings" replace />;

  const willUsePrefix = settings.willUsePrefixToRemoveTihteSum === 1;

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Dízimo JFA" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        {/* HERO — preview mensal */}
        <div
          data-testid="card-monthly"
          className={cn(
            "rounded-[20px] border p-4",
            emptyBase
              ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
              : "border-purple-600 bg-purple-900 dark:border-purple-600 dark:bg-purple-950"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Heart className="h-[18px] w-[18px] text-white" />
              </span>
              <div>
                <p className="font-bold text-white">Este mês</p>
                <p className="text-[11px] text-white/70">Referência {monthLabel}</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-purple-900">
              {monthLabel}
            </span>
          </div>

          <p className="mt-3.5 text-xs font-semibold uppercase tracking-wide text-white/85">
            Deve pagar este mês
          </p>
          <p data-testid="preview-amount" className="mt-1 text-3xl font-extrabold text-white">
            {formatBRL(previewAmount)}
          </p>
          <p className="mt-1 text-[11px] text-white/75">
            {previewWarning ? "R$ 0,00 — base vazia" : `Σ ${categories.join(", ") || "nenhum"} × ${percent}%`}
          </p>
          {previewWarning ? (
            <div
              data-testid="preview-warning"
              className="mt-2.5 rounded-[10px] border border-white/30 bg-white/20 p-2 dark:bg-amber-400/15"
            >
              <p className="text-xs font-semibold text-white dark:text-amber-200">{previewWarning}</p>
            </div>
          ) : null}
          <Button
            data-testid="btn-marcar-pago"
            disabled={saving}
            onClick={() => void pay()}
            className="mt-3.5 w-full gap-2 rounded-xl bg-white py-3 font-extrabold text-purple-900 hover:bg-purple-50 disabled:bg-gray-300"
          >
            <CheckCircle2 className="h-[18px] w-[18px]" />
            {saving ? "Salvando..." : "Marcar como pago"}
          </Button>
          <p className="mt-2 text-center text-[10px] text-white/60">
            Cria saída "Dízimo - MM/AAAA" categoria Outros + histórico
          </p>
        </div>

        {/* Escrituras JFA */}
        <div>
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 dark:bg-gray-700">
              <BookOpen className="h-3.5 w-3.5 text-purple-900 dark:text-purple-300" />
            </span>
            <p data-testid="scripture-title" className="flex-1 text-[15px] font-extrabold">
              Escrituras — JFA
            </p>
            <span className="text-[11px] text-gray-500">{TITHE_SCRIPTURES.length} passagens</span>
          </div>
          <div data-testid="scripture-carousel" className="flex gap-3 overflow-x-auto px-1 pb-1">
            {TITHE_SCRIPTURES.map((s, idx) => (
              <div
                key={s.reference}
                data-testid={`scripture-${idx}`}
                className={cn(
                  "w-[300px] shrink-0 rounded-2xl border bg-white p-3.5 shadow-sm dark:bg-gray-800",
                  activeScripture === idx ? "border-purple-500" : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="mb-2 flex items-center">
                  <span className="mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <BookOpen className="h-3.5 w-3.5 text-purple-900 dark:text-purple-300" />
                  </span>
                  <p className="flex-1 truncate text-xs font-bold text-purple-900 dark:text-purple-300">
                    {s.reference}
                  </p>
                  <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-gray-700 dark:text-gray-300">
                    JFA
                  </span>
                </div>
                <p className="text-xs leading-[18px]">{s.text}</p>
                <div className="mt-2.5 rounded-xl border border-purple-100 bg-purple-50 p-2 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300">Reflexão</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{s.reflection}</p>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">{s.translation}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-center">
            {TITHE_SCRIPTURES.map((_, idx) => (
              <button
                key={idx}
                data-testid={`dot-${idx}`}
                aria-label={`Escritura ${idx + 1}`}
                onClick={() => setActiveScripture(idx)}
                className={cn(
                  "mx-1 h-2 rounded",
                  activeScripture === idx ? "w-5 bg-purple-600" : "w-2 bg-gray-300 dark:bg-gray-600"
                )}
              />
            ))}
          </div>
        </div>

        {/* Percentual */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Percent className="h-4 w-4 text-purple-600" />
            </span>
            <div className="flex-1">
              <p data-testid="label-percent" className="text-sm font-extrabold">
                Percentual do dízimo
              </p>
              <p className="text-[11px] text-gray-500">1–100 • passo 0,5 • padrão 10%</p>
            </div>
            <span className="rounded-full bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 dark:bg-gray-700 dark:text-purple-300">
              {percent}%
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              data-testid="btn-percent-minus"
              variant="outline"
              onClick={() => stepPercent(-0.5)}
              className="h-11 w-11 rounded-full p-0"
              aria-label="Diminuir percentual"
            >
              <Minus className="h-[18px] w-[18px]" />
            </Button>
            <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900">
              <Input
                data-testid="input-percent"
                inputMode="decimal"
                value={percentText}
                onChange={(e) => handlePercentChange(e.target.value)}
                onBlur={commitPercent}
                className="border-0 bg-transparent text-center text-lg font-extrabold shadow-none focus-visible:ring-0"
                aria-label="Percentual"
              />
              <span className="ml-1 font-bold text-gray-500">%</span>
            </div>
            <Button
              data-testid="btn-percent-plus"
              onClick={() => stepPercent(0.5)}
              className="h-11 w-11 rounded-full bg-purple-600 p-0 hover:bg-purple-700"
              aria-label="Aumentar percentual"
            >
              <Plus className="h-[18px] w-[18px] text-white" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            {percent}% sobre a base selecionada abaixo
          </p>
        </div>

        {/* Base de cálculo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
              <Layers className="h-4 w-4 text-green-600 dark:text-green-300" />
            </span>
            <p data-testid="label-base" className="flex-1 text-sm font-extrabold">
              Base de cálculo
            </p>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              {categories.length} selecionada{categories.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-2.5 text-[11px] text-gray-500">
            Quais categorias de entrada contam para o cálculo
          </p>
          {BASE_OPTIONS.map((cat) => {
            const checked = categories.includes(cat);
            return (
              <button
                key={cat}
                data-testid={`checkbox-${cat}`}
                onClick={() => toggleBase(cat)}
                className={cn(
                  "mb-2 flex w-full items-center rounded-xl border px-2.5 py-2.5 text-left",
                  checked
                    ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
                    : "border-transparent"
                )}
              >
                <span
                  data-testid={`checkbox-box-${cat}`}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2",
                    checked ? "border-purple-600 bg-purple-600" : "border-gray-300 dark:border-gray-600"
                  )}
                >
                  {checked ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </span>
                <span
                  className={cn(
                    "ml-3 flex-1 text-sm font-bold",
                    checked ? "text-purple-900 dark:text-purple-300" : ""
                  )}
                >
                  {cat}
                </span>
                <DollarSign className={cn("h-4 w-4", checked ? "text-purple-600" : "text-gray-400")} />
                {checked ? (
                  <span className="ml-2 rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    ATIVO
                  </span>
                ) : null}
              </button>
            );
          })}
          {emptyBase ? (
            <div
              data-testid="warning-base"
              className="mt-1 rounded-xl border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/40"
            >
              <p className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" /> Selecione ao menos um Ganho
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Nenhuma categoria selecionada — dízimo será R$ 0,00
              </p>
            </div>
          ) : null}
        </div>

        {/* Prefixo */}
        <div
          data-testid="card-prefix"
          className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </span>
            <p className="flex-1 text-sm font-extrabold">Remover por prefixo</p>
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-bold",
                willUsePrefix
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-700"
              )}
            >
              {willUsePrefix ? "ATIVO" : "INATIVO"}
            </span>
          </div>
          <p className="text-[11px] leading-4 text-gray-500">
            Transações com este prefixo no título são excluídas da base de cálculo. Ideal para
            reembolsos e transferências internas.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900">
            <p className="mr-3 flex-1 text-[13px] font-semibold">Ativar remoção por prefixo</p>
            <Switch
              data-testid="switch-prefix"
              checked={willUsePrefix}
              onCheckedChange={(v) => void settings.update("willUsePrefixToRemoveTihteSum", v ? 1 : 0)}
              id="tithe-prefix-switch"
            />
          </div>
          <div className="mt-3">
            <Label htmlFor="tithe-prefix-input" className="text-xs font-bold">
              Prefixo
            </Label>
            <Input
              data-testid="input-prefix"
              id="tithe-prefix-input"
              placeholder="Ex: Reembolso"
              value={settings.prefixTithe}
              disabled={!willUsePrefix}
              onChange={(e) => void settings.update("prefixTithe", e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1.5 text-[10px] text-gray-400">
              Se o título começar com este texto, não entra na soma.
            </p>
          </div>
        </div>

        {/* Histórico */}
        {settings.tithePayments.length > 0 ? (
          <div
            data-testid="history-card"
            className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2.5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-4 w-4 text-purple-600" />
              </span>
              <p className="flex-1 text-sm font-extrabold">Histórico de pagamentos</p>
              <span className="text-[11px] text-gray-400">
                {settings.tithePayments.length} registro{settings.tithePayments.length !== 1 ? "s" : ""}
              </span>
            </div>
            {settings.tithePayments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-700"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                    <Check className="h-3 w-3 text-purple-600" />
                  </span>
                  <span className="text-[13px] font-semibold">
                    {String(p.month).padStart(2, "0")}/{p.year}
                  </span>
                </span>
                <span className="text-[13px] font-extrabold">{formatBRL(p.amount)}</span>
                <span className="text-[11px] text-gray-400">{formatDateBR(p.date)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
