/** Configurações — espelha `app/src/pages/AboutUs.tsx` (mobile). */
import { useEffect, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Car,
  FileDown,
  FileUp,
  Heart,
  Info,
  Moon,
  RotateCcw,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/components/theme-provider";
import Footer from "../components/footer";
import Header from "../components/header";
import { usePayments } from "@/hooks/usePayments";
import { useRuns } from "@/hooks/useRuns";
import { useStock } from "@/hooks/useStock";
import { configSchema } from "@/schemas/config.zod";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { buildExportFileName, readAndParseCsvFile, toSafeCsvValue } from "@/utils/csv";
import { useSettingsStore } from "@/stores/settings";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useListsStore } from "@/stores/lists";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
          {icon}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {description ? <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function SettingRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <div className="flex-1">
        <Label htmlFor={id}>{title}</Label>
        {description ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />;
}

function CsvImportButton({
  inputId,
  label,
  onFile,
}: {
  inputId: string;
  label: string;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <Button onClick={() => document.getElementById(inputId)?.click()} className="bg-purple-600 hover:bg-purple-900">
        <FileUp className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Use um arquivo <b>.csv</b> gerado pelo sistema para importar os dados de um amigo ou familiar
      </p>
      <div className="sr-only">
        <Label htmlFor={inputId}>csv</Label>
        <Input hidden id={inputId} type="file" accept=".csv" value="" onChange={onFile} />
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore();

  const { importTransactions, transactionsList, deleteAllTransaction } = usePayments();
  const { deleteAllTransaction: deleteAllStocks, importTransactions: importStocks, StockList } = useStock();
  const { deleteAllTransaction: deleteAllRuns, importTransactions: importRuns, FuelList } = useRuns();

  useEffect(() => {
    void settings.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = theme === "dark";
  const flag = (v: number | null | undefined) => v === 1;
  const setFlag = (key: string) => (v: boolean) => {
    void settings.update(key, v ? 1 : 0);
  };

  const handleThemeChange = (v: boolean) => {
    const next = v ? "dark" : "light";
    setTheme(next);
    void settings.update("colorModeState", next);
  };

  const handleAutonomyChange = (raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (Number.isFinite(v) && v >= 0) void settings.update("veicleAutonomy", v);
  };

  const handleResetSettings = async () => {
    if (!confirm("Deseja realmente redefinir as configurações?")) return;
    const defaults = configSchema.parse({});
    for (const [key, value] of Object.entries(defaults)) {
      try {
        await settings.update(key, value);
      } catch {
        /* mantém o valor atual em caso de falha isolada */
      }
    }
    await settings.load();
    toast({ description: "Configurações redefinidas com sucesso!", variant: "success" });
  };

  const handleClearAll = async () => {
    if (!confirm("Deseja realmente apagar todos os registros? Esta ação é irreversível!")) return;
    await useFinanceStore.getState().clear();
    await useMarketStore.getState().clear();
    await useRunsStore.getState().clear();
    for (const g of useGoalsStore.getState().goals) {
      try {
        await useGoalsStore.getState().delete(g.id);
      } catch {
        /* ignora */
      }
    }
    for (const l of useListsStore.getState().lists) {
      try {
        await useListsStore.getState().deleteList(l.id);
      } catch {
        /* ignora */
      }
    }
    writeJSON(STORAGE_KEYS.items, []);
    writeJSON(STORAGE_KEYS.tithePayments, []);
    await useFinanceStore.getState().load();
    await useMarketStore.getState().load();
    await useRunsStore.getState().load();
    await useGoalsStore.getState().load();
    await useListsStore.getState().load();
    await settings.load();
    toast({ description: "Todos os registros foram apagados!", variant: "success" });
  };

  const handleClearPurchases = async () => {
    if (!confirm("Deseja realmente apagar estoque e listas de compras? Esta ação é irreversível!")) return;
    await useMarketStore.getState().clear();
    for (const l of useListsStore.getState().lists) {
      try {
        await useListsStore.getState().deleteList(l.id);
      } catch {
        /* ignora */
      }
    }
    writeJSON(STORAGE_KEYS.items, []);
    await useMarketStore.getState().load();
    await useListsStore.getState().load();
    toast({ description: "Compras removidas com sucesso!", variant: "success" });
  };

  const handleArquivoChangeLists = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      toast({ description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      return;
    }
    const parsed = await readAndParseCsvFile(arquivo, ["id", "description", "location", "quantity", "amount", "date"]);
    if (!parsed.ok) {
      toast({ description: parsed.error, variant: "destructive" });
      return;
    }
    let count = 0;
    for (const row of parsed.rows) {
      try {
        await useListsStore.getState().addList(row);
        count += 1;
      } catch {
        /* linha inválida: pula */
      }
    }
    await useListsStore.getState().load();
    toast({ description: count > 0 ? `${count} lista(s) importada(s) com sucesso!` : "Nenhuma lista válida no arquivo.", variant: count > 0 ? "success" : "destructive" });
  };

  const handleCsvExport = () => {
    const headers = ["id", "_status", "_changed", "description", "amount", "category", "date", "paymentDate", "paymentStatus", "isEnabled", "isFavorited"];
    const csvContent = [
      headers.join(","),
      ...transactionsList.map((obj) =>
        [
          obj.id,
          obj._status ?? "",
          obj._changed ?? "",
          obj.description,
          obj.amount,
          obj.category,
          new Date(obj.date).getTime(),
          obj.paymentDate instanceof Date ? new Date(obj.paymentDate).getTime() : "",
          obj.paymentStatus ? "1" : "0",
          obj.isEnabled ? "1" : "0",
          obj.isFavorited ? "1" : "0",
        ]
          .map(toSafeCsvValue)
          .join(",")
      ),
    ].join("\n");
    downloadCsv(csvContent, "financas");
  };

  const handleArquivoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivoSelecionado = event.target.files?.[0];
    if (!arquivoSelecionado) {
      toast({ description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      return;
    }
    const parsed = await readAndParseCsvFile(arquivoSelecionado, ["id", "_status", "_changed", "description", "amount", "category", "date", "paymentDate", "paymentStatus", "isEnabled", "isFavorited"]);
    if (!parsed.ok) {
      toast({ description: parsed.error, variant: "destructive" });
      return;
    }
    await importTransactions(parsed.rows);
    toast({ description: "Arquivo importado com sucesso!", variant: "success" });
  };

  const handleCsvExportStock = () => {
    const headers = ["id", "_status", "_changed", "description", "amount", "category", "quantity", "quantityDesired"];
    const csvContent = [
      headers.join(","),
      ...StockList.map((obj) =>
        [obj.id, obj._status ?? "", obj._changed ?? "", obj.description, obj.amount, obj.category, obj.quantity, obj.quantityDesired].map(toSafeCsvValue).join(",")
      ),
    ].join("\n");
    downloadCsv(csvContent, "estoque");
  };

  const handleArquivoChangeStock = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivoSelecionado = event.target.files?.[0];
    if (!arquivoSelecionado) {
      toast({ description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      return;
    }
    const parsed = await readAndParseCsvFile(arquivoSelecionado, ["id", "_status", "_changed", "description", "amount", "category", "quantity", "quantityDesired"]);
    if (!parsed.ok) {
      toast({ description: parsed.error, variant: "destructive" });
      return;
    }
    await importStocks(parsed.rows);
    toast({ description: "Arquivo importado com sucesso!", variant: "success" });
  };

  const handleCsvExportRuns = () => {
    const headers = ["id", "_status", "_changed", "currentDistance", "unityAmount", "amount", "type", "date", "location"];
    const csvContent = [
      headers.join(","),
      ...FuelList.map((obj) =>
        [obj.id, obj._status ?? "", obj._changed ?? "", obj.currentDistance, obj.unityAmount, obj.amount ?? "", obj.type, new Date(obj.date).getTime(), obj.location].map(toSafeCsvValue).join(",")
      ),
    ].join("\n");
    downloadCsv(csvContent, "abastecimentos");
  };

  const handleArquivoChangeRuns = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivoSelecionado = event.target.files?.[0];
    if (!arquivoSelecionado) {
      toast({ description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      return;
    }
    const parsed = await readAndParseCsvFile(arquivoSelecionado, ["id", "_status", "_changed", "currentDistance", "unityAmount", "amount", "type", "date", "location"]);
    if (!parsed.ok) {
      toast({ description: parsed.error, variant: "destructive" });
      return;
    }
    await importRuns(parsed.rows);
    toast({ description: "Arquivo importado com sucesso!", variant: "success" });
  };

  const downloadCsv = (csvContent: string, prefix: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    toast({ description: "Exportação feita com sucesso!", variant: "success" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", buildExportFileName(prefix));
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Configurações" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <section className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-purple-900 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            <Wallet className="h-8 w-8" />
          </span>
          <div>
            <p className="text-xl font-bold">Minhas Finanças</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Controle familiar offline</p>
          </div>
        </section>

        <Section icon={<Moon className="h-4 w-4" />} title="Aparência">
          <SettingRow
            id="theme-dark"
            title="Habilitar tema escuro"
            checked={isDark}
            onCheckedChange={handleThemeChange}
          />
        </Section>

        <Section
          icon={<Bot className="h-4 w-4" />}
          title="Inteligência artificial"
          description="Recurso Beta — funciona apenas com internet."
        >
          <SettingRow
            id="ai-enabled"
            title="Habilitar inteligência artificial (Beta)"
            checked={flag(settings.isAiEnabled)}
            onCheckedChange={setFlag("isAiEnabled")}
          />
          {flag(settings.isAiEnabled) ? (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                OpenAI • Gemini • Anthropic • OpenRouter • Zen — 1 provedor ativo + reserva. As chaves ficam salvas neste aparelho.
              </p>
              <Button onClick={() => navigate("/ai-providers")} className="bg-purple-600 hover:bg-purple-900">
                Gerenciar provedores e modelos
              </Button>
              <Button onClick={() => navigate("/ia")} variant="outline">
                Abrir chat da IA
              </Button>
            </div>
          ) : null}
        </Section>

        <Section icon={<Heart className="h-4 w-4" />} title="Finanças">
          <SettingRow
            id="simple-finances"
            title="Usar formulário simplificado"
            description="Esconde categoria, data de pagamento e status."
            checked={flag(settings.simpleFinancesItem)}
            onCheckedChange={setFlag("simpleFinancesItem")}
          />
          <SettingRow
            id="saldo-card"
            title="Habilitar cartão de Saldo"
            checked={flag(settings.isEnableTotalHistoryCard)}
            onCheckedChange={setFlag("isEnableTotalHistoryCard")}
          />
          <SettingRow
            id="tithe-card"
            title="Habilitar cartão de Dízimo"
            checked={flag(settings.isEnableTitheCard)}
            onCheckedChange={setFlag("isEnableTitheCard")}
          />
          <SettingRow
            id="tithe-menu"
            title="Habilitar menu Dízimo"
            checked={flag(settings.isTitheMenuEnabled)}
            onCheckedChange={setFlag("isTitheMenuEnabled")}
          />
          <Button onClick={() => navigate("/tithe")} className="bg-purple-600 hover:bg-purple-900">
            <Heart className="mr-2 h-4 w-4" />
            Configurar dízimo
          </Button>
          <Divider />
          <Button onClick={handleCsvExport} className="bg-purple-600 hover:bg-purple-900">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar finanças
          </Button>
          <CsvImportButton inputId="csv" label="Importar finanças" onFile={(e) => void handleArquivoChange(e)} />
          <Button onClick={() => void deleteAllTransaction()} className="bg-red-600 hover:bg-red-900">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar finanças
          </Button>
        </Section>

        <Section
          icon={<Car className="h-4 w-4" />}
          title="Corridas"
          description="Abastecimentos e autonomia do veículo."
        >
          <SettingRow
            id="auto-fuel"
            title="Adicionar abastecimento automaticamente em finanças"
            checked={flag(settings.willAddFuelToTransactionList)}
            onCheckedChange={setFlag("willAddFuelToTransactionList")}
          />
          <div>
            <Label htmlFor="veicleAutonomy">Autonomia do veículo (km/l)</Label>
            <Input
              id="veicleAutonomy"
              inputMode="decimal"
              value={String(settings.veicleAutonomy ?? 0)}
              onChange={(e) => handleAutonomyChange(e.target.value)}
            />
          </div>
          <Divider />
          <Button onClick={handleCsvExportRuns} className="bg-purple-600 hover:bg-purple-900">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar abastecimentos
          </Button>
          <CsvImportButton inputId="csvRuns" label="Importar abastecimentos" onFile={(e) => void handleArquivoChangeRuns(e)} />
          <Button onClick={() => void deleteAllRuns()} className="bg-red-600 hover:bg-red-900">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar abastecimentos
          </Button>
        </Section>

        <Section icon={<ShoppingCart className="h-4 w-4" />} title="Compras" description="Estoque e listas de compras.">
          <SettingRow
            id="simple-market"
            title="Usar formulário simplificado de itens"
            checked={flag(settings.marketSimplifiedItems)}
            onCheckedChange={setFlag("marketSimplifiedItems")}
          />
          <Divider />
          <Button onClick={handleCsvExportStock} className="bg-purple-600 hover:bg-purple-900">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar estoque
          </Button>
          <CsvImportButton inputId="csvStock" label="Importar estoque" onFile={(e) => void handleArquivoChangeStock(e)} />
          <CsvImportButton inputId="csvLists" label="Importar listas de compras" onFile={(e) => void handleArquivoChangeLists(e)} />
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Para exportar uma lista, abra a lista e use a opção de exportar.
          </p>
          <Button onClick={() => void deleteAllStocks()} className="bg-red-600 hover:bg-red-900">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar estoque
          </Button>
          <Button onClick={() => void handleClearPurchases()} className="bg-red-600 hover:bg-red-900">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar compras (estoque + listas)
          </Button>
        </Section>

        <Section icon={<RotateCcw className="h-4 w-4" />} title="Geral">
          <Button onClick={() => void handleResetSettings()} className="bg-purple-600 hover:bg-purple-900">
            <RotateCcw className="mr-2 h-4 w-4" />
            Redefinir configurações
          </Button>
          <Button onClick={() => void handleClearAll()} className="bg-red-600 hover:bg-red-900">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar todos os registros
          </Button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Essa opção apagará todos os registros do aplicativo.
          </p>
        </Section>

        <Section icon={<Info className="h-4 w-4" />} title="Sobre">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => window.open("https://filipeleonelbatista.github.io/", "_blank", "noopener")} className="flex-1 bg-purple-600 hover:bg-purple-900">
              Sobre o desenvolvedor
            </Button>
            <Button onClick={() => window.open("https://filipeleonelbatista.github.io/minhas-financas-v2-ai/termos.html", "_blank", "noopener")} variant="outline" className="flex-1">
              Termos de Uso
            </Button>
            <Button onClick={() => window.open("https://filipeleonelbatista.github.io/minhas-financas-v2-ai/privacidade.html", "_blank", "noopener")} variant="outline" className="flex-1">
              Privacidade
            </Button>
          </div>
        </Section>
      </div>
      <Footer />
    </div>
  );
}
