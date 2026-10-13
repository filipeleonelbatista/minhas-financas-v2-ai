/** Dízimo JFA — espelha `app/src/pages/TitheSettings.tsx`. */
import { useEffect, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useSettingsStore } from "@/stores/settings";
import { formatBRL, formatDateBR } from "@/lib/format";

const BASE_OPTIONS = ["Ganhos", "Investimentos"];

export default function TitheSettings() {
  const { toast } = useToast();
  const settings = useSettingsStore();
  const categories = settings.getTitheCategories();

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  useEffect(() => {
    void settings.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = settings.getMonthlyTithePreview(month, year);

  const toggleBase = (cat: string) => {
    const next = categories.includes(cat)
      ? categories.filter((c) => c !== cat)
      : [...categories, cat];
    void settings.update("titheCategories", JSON.stringify(next));
  };

  const stepPercent = (delta: number) => {
    const next = Math.min(100, Math.max(1, Number(settings.tithePercent) + delta));
    void settings.update("tithePercent", Math.round(next * 2) / 2);
  };

  const pay = async () => {
    if (!confirm(`Marcar dízimo de ${String(month).padStart(2, "0")}/${year} como pago?`)) return;
    await settings.markAsPaid(month, year);
    toast({ description: "Dízimo marcado como pago!", variant: "success" });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Dízimo" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-1 font-bold">
            Este mês {String(month).padStart(2, "0")}/{year}
          </p>
          <p className="text-3xl font-bold">{formatBRL(preview)}</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (month === 1) {
                  setMonth(12);
                  setYear(year - 1);
                } else setMonth(month - 1);
              }}
            >
              &lt;
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (month === 12) {
                  setMonth(1);
                  setYear(year + 1);
                } else setMonth(month + 1);
              }}
            >
              &gt;
            </Button>
            <Button onClick={() => void pay()}>Marcar como pago</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Percentual ({settings.tithePercent}%)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => stepPercent(-0.5)}>
              -
            </Button>
            <Input
              inputMode="decimal"
              value={String(settings.tithePercent)}
              onChange={(e) => {
                const v = Number(String(e.target.value).replace(",", "."));
                if (Number.isFinite(v)) void settings.update("tithePercent", Math.min(100, Math.max(1, v)));
              }}
            />
            <Button variant="outline" onClick={() => stepPercent(0.5)}>
              +
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Base do cálculo</p>
          {BASE_OPTIONS.map((cat) => (
            <div key={cat} className="flex items-center space-x-2 py-1">
              <Switch
                checked={categories.includes(cat)}
                onCheckedChange={() => toggleBase(cat)}
                id={`tithe-base-${cat}`}
              />
              <Label htmlFor={`tithe-base-${cat}`}>{cat}</Label>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.willUsePrefixToRemoveTihteSum === 1}
              onCheckedChange={(v) => void settings.update("willUsePrefixToRemoveTihteSum", v ? 1 : 0)}
              id="tithe-prefix-switch"
            />
            <Label htmlFor="tithe-prefix-switch">Remover itens com prefixo da soma</Label>
          </div>
          <div className="mt-2">
            <Label>Prefixo</Label>
            <Input
              value={settings.prefixTithe}
              disabled={settings.willUsePrefixToRemoveTihteSum !== 1}
              onChange={(e) => void settings.update("prefixTithe", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Histórico (últimos 5)</p>
          {settings.tithePayments.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
          ) : (
            settings.tithePayments.slice(0, 5).map((p) => (
              <p key={p.id} className="text-sm">
                {formatBRL(p.amount)} · {String(p.month).padStart(2, "0")}/{p.year} ·{" "}
                {formatDateBR(p.date)}
              </p>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
