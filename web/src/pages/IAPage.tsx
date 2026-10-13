/** Chat IA — espelha `app/src/pages/IAPage.tsx` (única parte online). */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useListsStore } from "@/stores/lists";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";
import { chatWithFallback, checkIfApiKeyExists } from "@/utils/aiProviders";
import { buildPrompt, canSendPrompt, registerPrompt } from "@/utils/prompt";
import { formatDateBR } from "@/lib/format";

const PRESETS = [
  {
    id: "tips",
    label: "Dicas financeiras",
    question:
      "Dê dicas financeiras práticas com base nos meus dados de finanças. Limite-se a 1000 caracteres.",
  },
  {
    id: "fuel",
    label: "Custos de combustível",
    question:
      "Analise meus custos de combustível e sugira economia. Limite-se a 1000 caracteres.",
  },
  {
    id: "market",
    label: "Custos de mercado",
    question:
      "Analise meus custos de mercado/estoque e sugira economia. Limite-se a 1000 caracteres.",
  },
];

function errorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  if (status === 400) return "Requisição inválida (400). Verifique o modelo configurado.";
  if (status === 401) return "Chave inválida (401). Confira a chave em Provedores.";
  if (status === 429) return "Limite da API atingido (429). Tente mais tarde.";
  if (status === 500 || status === 503)
    return "Provedor indisponível. Tentando próximo da fila...";
  if (e instanceof Error && e.message === "Nenhum provider configurado")
    return "Nenhum provider configurado. Cadastre uma chave em Provedores.";
  return e instanceof Error ? e.message : "Falha ao consultar a IA.";
}

type QA = { q: string; a: string; via?: string };

export default function IAPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const finance = useFinanceStore();
  const goals = useGoalsStore();
  const lists = useListsStore();
  const market = useMarketStore();
  const runs = useRunsStore();
  const settings = useSettingsStore();

  const [hasKey, setHasKey] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QA[]>([]);

  useEffect(() => {
    void finance.load();
    void goals.load();
    void lists.load();
    void market.load();
    void runs.load();
    void settings.load();
    void checkIfApiKeyExists().then(setHasKey);
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const context = useMemo(() => {
    const f = finance.transactionsList.slice(0, 80).map((t) =>
      [t.amount, formatDateBR(t.date), t.paymentDate ? formatDateBR(t.paymentDate) : "", t.description, t.category, t.paymentStatus ? "pago" : "nao-pago", t.isFavorited ? "fav" : ""].join(";")
    );
    const fuel = runs.runsList.slice(0, 30).map((r) =>
      [r.amount, r.unityAmount, r.currentDistance, r.type, r.location].join(";")
    );
    const stock = market.stockList.slice(0, 60).map((s) =>
      [s.amount, s.quantity, s.description, s.category, Number(s.amount) * Number(s.quantity)].join(";")
    );
    const gl = goals.goals.slice(0, 30).map((g) =>
      [g.description, g.amount, g.currentAmount, g.category].join(";")
    );
    const li = lists.lists.slice(0, 20).map((l) => [l.description, l.amount, l.quantity].join(";"));
    return [
      `FINANCAS(80):${f.join("|").slice(0, 6000)}`,
      `AUTONOMIA:${settings.veicleAutonomy ?? 0}|COMBUSTIVEL(30):${fuel.join("|").slice(0, 4000)}`,
      `MERCADO(60):${stock.join("|").slice(0, 4000)}`,
      `METAS(30):${gl.join("|").slice(0, 3000)}`,
      `LISTAS(20):${li.join("|").slice(0, 2000)}`,
      `HERO:entradas=${finance.getIncomings()}|saidas=${finance.getExpenses()}|dizimo_pct=${settings.tithePercent}`,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    finance.transactionsList,
    runs.runsList,
    market.stockList,
    goals.goals,
    lists.lists,
    settings.tithePercent,
  ]);

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || loading) return;
    if (!online) {
      toast({ description: "Você está offline. A IA precisa de internet.", variant: "destructive" });
      return;
    }
    if (!canSendPrompt()) {
      toast({ description: "Limite de 3 perguntas por minuto. Aguarde.", variant: "destructive" });
      return;
    }
    registerPrompt();
    setLoading(true);
    try {
      const prompt = buildPrompt(context, `${query} Limite-se a 1000 caracteres.`);
      const res = await chatWithFallback(prompt);
      setHistory((h) => [{ q: query, a: res.text, via: `${res.provider}/${res.model}` }, ...h]);
    } catch (e) {
      toast({ description: errorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (settings.isAiEnabled !== 1) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
        <Header title="IA" isShort />
        <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Inteligência artificial desativada</p>
            <div className="flex items-center space-x-2">
              <Switch
                checked={false}
                onCheckedChange={(v) => void settings.update("isAiEnabled", v ? 1 : 0)}
                id="ia-enable"
              />
              <Label htmlFor="ia-enable">Habilitar IA (precisa de internet)</Label>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
        <Header title="IA" isShort />
        <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="mb-2 font-bold">Chave de API necessária</p>
            <p className="mb-2 text-sm">Cadastre ao menos um provedor para conversar.</p>
            <Button onClick={() => navigate("/ai-providers")}>Abrir provedores</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="IA" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        {!online ? (
          <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-sm">
            Você está offline. Os dados locais funcionam, mas a IA precisa de internet.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.id} variant="outline" onClick={() => void ask(p.question)}>
              {p.label}
            </Button>
          ))}
          <Button variant="outline" onClick={() => navigate("/ai-providers")}>
            Provedores
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Pergunte sobre suas finanças..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask(question);
            }}
          />
          <Button disabled={loading} onClick={() => void ask(question)}>
            {loading ? "..." : "Enviar"}
          </Button>
        </div>

        {history.map((h, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="text-sm font-bold">{h.q}</p>
            {h.via ? <p className="text-xs text-gray-500">{h.via}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm">{h.a}</p>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
