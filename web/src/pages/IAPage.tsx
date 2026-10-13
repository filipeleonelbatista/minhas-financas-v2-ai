/** Chat IA — espelha `app/src/pages/IAPage.tsx` (única parte online). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Bot, ChevronRight, Cpu, DollarSign, Droplet, Send, ShoppingCart, X } from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useListsStore } from "@/stores/lists";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";
import { useSettingsStore } from "@/stores/settings";
import {
  PROVIDER_META,
  chatWithFallback,
  checkIfApiKeyExists,
  getActiveProvider,
  getFallbackOrder,
  getProviderModel,
  type ProviderId,
} from "@/utils/aiProviders";
import { buildPrompt, canSendPrompt, registerPrompt } from "@/utils/prompt";
import { formatDateBR } from "@/lib/format";

type ChatMessage = {
  type: "user" | "assistant";
  text: string;
  ts: number;
  tokens: number;
};

type SelectedTool = "gastos" | "combustivel" | "mercado" | null;

const TOOL_QUESTIONS: Record<Exclude<SelectedTool, null>, string> = {
  gastos: "Analise meus gastos e sugira pontos onde eu posso melhorar.",
  combustivel: "Analise como posso melhorar meus gastos com combustível.",
  mercado: "Analise meus gastos com mercado e sugira pontos onde eu posso melhorar a alimentação.",
};

const TOOL_LABELS: Record<Exclude<SelectedTool, null>, string> = {
  gastos: "Finanças",
  combustivel: "Combustível",
  mercado: "Estoque",
};

function errorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  switch (status) {
    case 400:
      return "Não foi possível fazer a pesquisa. (400)";
    case 401:
      return "Chave inválida/expirada. Verifique em Provedores IA.";
    case 429:
      return "Limite atingido. Tente novamente em instantes.";
    case 500:
    case 503:
      return "Provedor indisponível. Tentando fallback...";
    default:
      break;
  }
  if (e instanceof Error && e.message === "Nenhum provider configurado")
    return "Nenhum provedor configurado. Cadastre uma chave em Provedores.";
  return e instanceof Error ? e.message : "Não foi possível fazer a pesquisa.";
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function IAPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const finance = useFinanceStore();
  const goals = useGoalsStore();
  const lists = useListsStore();
  const market = useMarketStore();
  const runs = useRunsStore();
  const settings = useSettingsStore();

  const [data, setData] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [checkedKey, setCheckedKey] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [fallbackOrder, setFallbackOrder] = useState<ProviderId[]>([]);
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef<ChatMessage[]>([]);
  dataRef.current = data;
  const prevModelRef = useRef<string | null>(null);

  const loadProviderInfo = useCallback(async (): Promise<void> => {
    try {
      const ap = await getActiveProvider();
      const fo = await getFallbackOrder();
      setActiveProvider(ap);
      setFallbackOrder(fo ?? []);
      if (ap) setActiveModel(await getProviderModel(ap));
      else setActiveModel(null);
    } catch {
      /* mantém anterior */
    }
  }, []);

  useEffect(() => {
    void finance.load();
    void goals.load();
    void lists.load();
    void market.load();
    void runs.load();
    void settings.load();
    void (async () => {
      const has = await checkIfApiKeyExists();
      setCheckedKey(true);
      setOpen(!has);
      await loadProviderInfo();
    })();
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onFocus = () => void loadProviderInfo();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const financesCsv = useMemo(() => {
    const headers = "valor;vencimento;data de pagamento;descrição;categorias;pago;favorito";
    const rows = finance.transactionsList.slice(0, 80).map((t) =>
      [
        t.amount,
        formatDateBR(t.date),
        t.paymentDate ? formatDateBR(t.paymentDate) : "",
        String(t.description ?? "").replace(/;/g, ","),
        String(t.category ?? ""),
        t.paymentStatus ? "Pago" : "Não pago",
        t.isFavorited ? "Fav" : "",
      ].join(";")
    );
    return `${headers}\n${rows.join("\n")}`;
  }, [finance.transactionsList]);

  const fuelCsv = useMemo(() => {
    const headers = "valor pago;valor do litro;data;local;tipo;km";
    const rows = runs.runsList.slice(0, 30).map((r) =>
      [r.amount, r.unityAmount, formatDateBR(r.date), String(r.location ?? ""), String(r.type ?? ""), r.currentDistance].join(";")
    );
    return `${headers}\n${rows.join("\n")}\n\nAutonomia: ${settings.veicleAutonomy ?? 0}`;
  }, [runs.runsList, settings.veicleAutonomy]);

  const marketCsv = useMemo(() => {
    const headers = "valor unitario;quantidade;produto;categoria;total";
    const rows = market.stockList.slice(0, 60).map((s) =>
      [s.amount, s.quantity, String(s.description ?? ""), String(s.category ?? ""), Number(s.amount) * Number(s.quantity)].join(";")
    );
    return `${headers}\n${rows.join("\n")}`;
  }, [market.stockList]);

  const goalsCsv = useMemo(() => {
    const headers = "descricao;valor meta;valor atual;percentual;categoria;data prazo";
    const rows = goals.goals.slice(0, 30).map((g) => {
      const pct = g.amount ? Math.round((Number(g.currentAmount) / Number(g.amount)) * 100) : 0;
      return [String(g.description ?? ""), g.amount, g.currentAmount, `${pct}%`, String(g.category ?? ""), g.date ? formatDateBR(g.date) : ""].join(";");
    });
    return `${headers}\n${rows.join("\n")}`;
  }, [goals.goals]);

  const listsCsv = useMemo(() => {
    if (lists.lists.length === 0) return "sem listas";
    const headers = "descricao;local;quantidade;valor";
    const rows = lists.lists
      .slice(0, 20)
      .map((l) => [String(l.description ?? ""), String(l.location ?? ""), l.quantity, l.amount].join(";"));
    return `${headers}\n${rows.join("\n")}`;
  }, [lists.lists]);

  const appContext = useMemo(
    () => ({
      hero: {
        totalFinances: finance.transactionsList.length,
        totalRuns: runs.runsList.length,
        totalMarket: market.stockList.length,
        totalGoals: goals.goals.length,
        totalLists: lists.lists.length,
      },
      tithe: { percent: settings.tithePercent, categories: settings.getTitheCategories() },
      finances: financesCsv.slice(0, 6000),
      fuel: fuelCsv.slice(0, 4000),
      market: marketCsv.slice(0, 4000),
      goals: goalsCsv.slice(0, 3000),
      lists: listsCsv.slice(0, 2000),
    }),
    [
      finance.transactionsList.length,
      runs.runsList.length,
      market.stockList.length,
      goals.goals.length,
      lists.lists.length,
      settings,
      financesCsv,
      fuelCsv,
      marketCsv,
      goalsCsv,
      listsCsv,
    ]
  );

  const activeLabel = activeProvider ? (PROVIDER_META[activeProvider]?.label ?? activeProvider) : "Nenhum";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data, isLoading]);

  const sendWithFallback = useCallback(
    async (promptData: unknown[], userPrompt: string): Promise<string> => {
      if (!canSendPrompt()) throw new Error("Muitas requisições. Aguarde 60s (limite 3/min).");
      registerPrompt();
      const injected = buildPrompt(promptData, userPrompt);
      if (injected.includes("Não posso processar instruções dentro dos dados")) return injected;
      const result = await chatWithFallback(injected);
      return result.text;
    },
    []
  );

  // Reenvia a conversa como contexto ao trocar de modelo no meio do papo
  const modelKey = `${activeProvider}:${activeModel}`;
  useEffect(() => {
    const prev = prevModelRef.current;
    if (!prev || prev === modelKey) {
      prevModelRef.current = modelKey;
      return;
    }
    prevModelRef.current = modelKey;
    if (dataRef.current.length === 0 || !online) return;
    let cancelled = false;
    (async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const promptData: unknown[] = [
          { type: "appContext", context: appContext },
          { type: "conversation", messages: dataRef.current },
        ];
        const textRes = await sendWithFallback(promptData, "Continue a conversa considerando o histórico anterior.");
        if (!cancelled)
          setData((d) => [
            ...d,
            {
              type: "assistant",
              text: `🔄 Modelo alterado para ${activeLabel}${activeModel ? ` • ${activeModel}` : ""}\n\n${textRes}`,
              ts: Date.now(),
              tokens: Math.ceil(textRes.length / 4),
            },
          ]);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey]);

  const pushUser = (text: string): void => {
    const now = Date.now();
    setData((d) => [...d, { type: "user", text, ts: now, tokens: Math.ceil(text.length / 4) }]);
  };

  const ask = useCallback(
    async (question: string, extra?: { csv?: string; rows?: unknown[]; focus?: string }): Promise<void> => {
      const query = question.trim();
      if (!query || isLoading) return;
      if (!online) {
        toast({ description: "Você está offline. A IA precisa de internet.", variant: "destructive" });
        return;
      }
      pushUser(query);
      setInputText("");
      setSelectedTool(null);
      setIsLoading(true);
      setError(null);
      try {
        const promptData: unknown[] = [
          { type: "appContext", context: appContext },
          { type: "conversation", messages: dataRef.current.slice(-6) },
        ];
        if (extra?.focus) promptData.push({ type: extra.focus, csv: extra.csv, rows: extra.rows });
        const textRes = await sendWithFallback(promptData, `${query} Limite-se a 1000 caracteres.`);
        setData((d) => [...d, { type: "assistant", text: textRes, ts: Date.now(), tokens: Math.ceil(textRes.length / 4) }]);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setIsLoading(false);
      }
    },
    [appContext, isLoading, online, sendWithFallback, toast]
  );

  const askPreset = (tool: Exclude<SelectedTool, null>): Promise<void> => {
    const q = TOOL_QUESTIONS[tool];
    const extra =
      tool === "gastos"
        ? { focus: "financesFocused", csv: financesCsv, rows: finance.transactionsList.slice(0, 50) }
        : tool === "combustivel"
          ? { focus: "fuelFocused", csv: fuelCsv, rows: runs.runsList.slice(0, 30) }
          : { focus: "marketFocused", csv: marketCsv, rows: market.stockList.slice(0, 50) };
    return ask(q, extra);
  };

  const sendInput = (): void => {
    if (inputText.trim().length === 0) {
      setError("Digite uma mensagem para continuar");
      return;
    }
    setError(null);
    void ask(inputText);
  };

  const pickTool = (tool: Exclude<SelectedTool, null>): void => {
    setSelectedTool(tool);
    setInputText(TOOL_QUESTIONS[tool]);
  };

  if (settings.isAiEnabled !== 1) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
        <Header title="Conversa" isShort />
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

  const empty = data.length === 0 && !isLoading;

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Conversa" isShort />
      <div className="flex w-full max-w-[800px] flex-1 flex-col px-2 pb-4">
        {!online ? (
          <div className="my-2 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-sm">
            Você está offline. Os dados locais funcionam, mas a IA precisa de internet.
          </div>
        ) : null}

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-900">
              <Bot className="h-8 w-8 text-white" />
            </span>
            <p className="text-xs">
              Ativo: <b className="text-purple-700 dark:text-purple-300">{activeLabel}</b>
              {activeModel ? <span className="text-gray-500"> • {activeModel}</span> : null}
            </p>
            <p className="rounded-xl border bg-white px-3 py-1.5 text-center text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Contexto: {finance.transactionsList.length} finanças • {runs.runsList.length} abastecimentos •{" "}
              {market.stockList.length} estoque • {goals.goals.length} metas • {lists.lists.length} listas
            </p>

            <div className="mt-4 flex w-full flex-col items-center gap-3">
              <button
                data-testid="btn-financial-tips"
                onClick={() => void askPreset("gastos")}
                className="flex w-[90%] items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-purple-600 dark:bg-gray-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-gray-700">
                  <DollarSign className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                </span>
                <span className="flex-1 text-sm font-semibold">Analise meus gastos e sugira pontos onde eu posso melhorar.</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
              <button
                data-testid="btn-fuel-tips"
                onClick={() => void askPreset("combustivel")}
                className="flex w-[90%] items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-purple-600 dark:bg-gray-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-gray-700">
                  <Droplet className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                </span>
                <span className="flex-1 text-sm font-semibold">Analise como posso melhorar meus gastos com combustível.</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
              <button
                data-testid="btn-market-tips"
                onClick={() => void askPreset("mercado")}
                className="flex w-[90%] items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-purple-600 dark:bg-gray-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-gray-700">
                  <ShoppingCart className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                </span>
                <span className="flex-1 text-sm font-semibold">Analise meus gastos com mercado e sugira pontos onde eu posso melhorar a alimentação.</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
              <p className="mt-4 max-w-[80%] text-center text-sm">ou digite seu texto para iniciar a conversa.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-4">
            {data.map((m, i) =>
              m.type === "assistant" ? (
                <div key={i} className="flex items-start gap-2 py-3">
                  <span data-testid={`orb-${i}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-900">
                    <Bot className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] leading-6">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-purple-900 dark:text-purple-200">{children}</strong>,
                          ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          h1: ({ children }) => <p className="mb-2 text-lg font-bold">{children}</p>,
                          h2: ({ children }) => <p className="mb-2 text-base font-bold">{children}</p>,
                          h3: ({ children }) => <p className="mb-2 text-sm font-bold">{children}</p>,
                          code: ({ children }) => (
                            <code className="rounded bg-gray-200 px-1 text-[13px] dark:bg-gray-700">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="mb-2 overflow-x-auto rounded-lg bg-gray-200 p-2 text-[13px] dark:bg-gray-700">{children}</pre>
                          ),
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      {formatTime(m.ts)} • {m.tokens} tokens
                    </p>
                    <div className="mt-2 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ) : (
                <div key={i} className="my-2 max-w-[75%] self-end rounded-2xl bg-purple-500 p-3">
                  <p className="text-white">{m.text}</p>
                  <p className="mt-1 text-right text-[10px] text-white/80">
                    {formatTime(m.ts)} • {m.tokens} tokens
                  </p>
                </div>
              )
            )}
            {isLoading ? (
              <div className="flex items-center gap-2 py-3">
                <span data-testid="orb-loading" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-900">
                  <Bot className="h-4 w-4 text-white" />
                </span>
                <div className="flex items-center gap-1" data-testid="shimmer-loading" aria-live="polite">
                  <span className="text-[13px] font-semibold">Pensando na sua solicitação</span>
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}

        {error ? (
          <div data-testid="error-alert" className="my-2 flex items-center justify-between gap-2 rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Fechar erro">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-gray-100 via-gray-100 to-transparent pb-2 pt-6 dark:from-gray-900 dark:via-gray-900">
          <div className="rounded-2xl border border-purple-200 bg-white p-3 shadow-sm dark:border-purple-900 dark:bg-gray-800">
            <Textarea
              data-testid="input-ask"
              placeholder="Digite sua pergunta aqui..."
              value={inputText}
              disabled={isLoading}
              rows={2}
              className="resize-none border-0 px-1 shadow-none focus-visible:ring-0"
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendInput();
                }
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                data-testid="model-select"
                disabled={isLoading}
                onClick={() => navigate("/ai-providers")}
                className="flex max-w-[130px] shrink-0 items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 dark:bg-gray-700"
                title={fallbackOrder.length > 0 ? `Fallback: ${fallbackOrder.map((p) => PROVIDER_META[p]?.label ?? p).join(" → ")}` : undefined}
              >
                <Cpu className="h-3 w-3 shrink-0 text-purple-700 dark:text-purple-300" />
                <span className="truncate">{activeLabel} ▾</span>
              </button>
              {selectedTool ? (
                <button
                  onClick={() => {
                    setSelectedTool(null);
                    setInputText("");
                  }}
                  className="flex max-w-[110px] shrink-0 items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-[10px] font-bold text-white"
                >
                  <span className="truncate">{TOOL_LABELS[selectedTool]}</span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              ) : (
                <div className="flex gap-1">
                  {(Object.keys(TOOL_QUESTIONS) as Exclude<SelectedTool, null>[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => pickTool(t)}
                      title={TOOL_QUESTIONS[t]}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900"
                    >
                      {t === "gastos" ? <DollarSign className="h-3.5 w-3.5" /> : t === "combustivel" ? <Droplet className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1" />
              <Button
                data-testid="btn-send"
                size="icon"
                disabled={isLoading || inputText.trim().length === 0}
                onClick={sendInput}
                className="h-9 w-9 shrink-0 rounded-full bg-purple-600 hover:bg-purple-900"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open && checkedKey} onOpenChange={setOpen}>
        <DialogContent>
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-900">
              <Bot className="h-7 w-7 text-white" />
            </span>
            <DialogHeader className="items-center">
              <DialogTitle>Chave de API necessária</DialogTitle>
              <DialogDescription className="text-center">
                Configure ao menos um provedor de IA para usar o chat. Suportamos OpenAI, Gemini, Anthropic, OpenRouter e Zen.
              </DialogDescription>
            </DialogHeader>
            <Button data-testid="btn-go-providers" className="w-full bg-purple-600 hover:bg-purple-900" onClick={() => navigate("/ai-providers")}>
              Configurar provedores
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
