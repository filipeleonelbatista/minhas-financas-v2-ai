/** Provedores de IA — espelha `app/src/pages/AIProviders.tsx`. */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  Plus,
  Search,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  FALLBACK_MODELS,
  PROVIDERS,
  PROVIDER_META,
  fetchModels,
  getActiveProvider,
  getFallbackOrder,
  getProviderModel,
  saveProviderModel,
  setActiveProvider,
  setFallbackOrder,
  type ProviderId,
} from "@/utils/aiProviders";
import { deleteProviderKey, getProviderKey, saveProviderKey } from "@/utils/secureStore";

type KeysMap = Record<string, string>;
type SelectedModelsMap = Record<string, string>;

export default function AIProviders() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<KeysMap>({});
  const [selectedModels, setSelectedModels] = useState<SelectedModelsMap>({});
  const [active, setActive] = useState<ProviderId | null>(null);
  const [fallback, setFallback] = useState<ProviderId[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<ProviderId>(PROVIDERS[0]);
  const [modalKey, setModalKey] = useState("");
  const [modalModels, setModalModels] = useState<string[]>([]);
  const [modalSelectedModel, setModalSelectedModel] = useState("");
  const [modalLoadingModels, setModalLoadingModels] = useState(false);

  const [alert, setAlert] = useState<{ variant: "success" | "danger"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProviderId | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const newKeys: KeysMap = {};
    const newSelected: SelectedModelsMap = {};
    for (const p of PROVIDERS) {
      try {
        newKeys[p] = (await getProviderKey(p)) ?? "";
      } catch {
        newKeys[p] = "";
      }
      try {
        newSelected[p] = (await getProviderModel(p)) ?? FALLBACK_MODELS[p]?.[0] ?? "";
      } catch {
        newSelected[p] = FALLBACK_MODELS[p]?.[0] ?? "";
      }
    }
    let act: ProviderId | null = null;
    let fb: ProviderId[] = [];
    try {
      act = await getActiveProvider();
    } catch {
      /* mantém null */
    }
    try {
      fb = await getFallbackOrder();
    } catch {
      /* mantém [] */
    }
    setKeys(newKeys);
    setSelectedModels(newSelected);
    setActive(act);
    setFallback(fb ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const registeredProviders: ProviderId[] = PROVIDERS.filter((p) => keys[p] && keys[p].length > 0);

  const handleSearchModels = async (): Promise<void> => {
    const key = modalKey.trim();
    if (!key) return;
    setModalLoadingModels(true);
    try {
      const list = await fetchModels(modalProvider, key);
      setModalModels(list);
      setModalSelectedModel(list.length > 0 ? list[0] : "");
    } catch {
      const fb = FALLBACK_MODELS[modalProvider] ?? [];
      setModalModels(fb);
      setModalSelectedModel(fb.length > 0 ? fb[0] : "");
    } finally {
      setModalLoadingModels(false);
    }
  };

  const handleSaveProvider = async (): Promise<void> => {
    const key = modalKey.trim();
    if (!key || !modalSelectedModel) {
      setAlert({ variant: "danger", message: "Preencha a chave e selecione um modelo" });
      return;
    }
    try {
      await saveProviderKey(modalProvider, key);
      await saveProviderModel(modalProvider, modalSelectedModel);
      if (!active) {
        await setActiveProvider(modalProvider);
        setActive(modalProvider);
      }
      // Todo provedor salvo entra na ordem de fallback (se ainda não estiver),
      // senão com 1 só provedor a ordem nunca poderia ser montada.
      try {
        const currentFb = await getFallbackOrder();
        if (!currentFb.includes(modalProvider)) await setFallbackOrder([...currentFb, modalProvider]);
      } catch {
        /* ignora */
      }
      setModalOpen(false);
      setModalKey("");
      setModalModels([]);
      setModalSelectedModel("");
      await load();
      setAlert({ variant: "success", message: `${PROVIDER_META[modalProvider].label} salvo` });
    } catch (e) {
      setAlert({ variant: "danger", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const confirmDeleteProvider = async (): Promise<void> => {
    const provider = deleteTarget;
    if (!provider) return;
    setDeleteTarget(null);
    try {
      await deleteProviderKey(provider);
      await saveProviderModel(provider, "");
      const nextFb = fallback.filter((p) => p !== provider);
      setFallback(nextFb);
      await setFallbackOrder(nextFb);
      if (active === provider) {
        const nextActive = registeredProviders.filter((p) => p !== provider)[0] ?? null;
        if (nextActive) {
          await setActiveProvider(nextActive);
          setActive(nextActive);
        } else {
          setActive(null);
        }
      }
      await load();
      setAlert({ variant: "success", message: `${PROVIDER_META[provider].label} removido` });
    } catch (e) {
      setAlert({ variant: "danger", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSetActive = async (provider: ProviderId): Promise<void> => {
    setActive(provider);
    try {
      await setActiveProvider(provider);
    } catch {
      /* ignora */
    }
    toast({ description: `${PROVIDER_META[provider].label} definido como ativo`, variant: "success" });
  };

  const handleToggleFallback = async (provider: ProviderId): Promise<void> => {
    const next = fallback.includes(provider)
      ? fallback.filter((p) => p !== provider)
      : [...fallback, provider];
    setFallback(next);
    try {
      await setFallbackOrder(next);
    } catch {
      /* ignora */
    }
  };

  const moveFallback = async (index: number, dir: number): Promise<void> => {
    const next = [...fallback];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFallback(next);
    try {
      await setFallbackOrder(next);
    } catch {
      /* ignora */
    }
  };

  const openAddModal = (): void => {
    const firstNotRegistered = PROVIDERS.find((p) => !keys[p]) ?? PROVIDERS[0];
    setModalProvider(firstNotRegistered);
    setModalKey("");
    setModalModels([]);
    setModalSelectedModel("");
    setAlert(null);
    setModalOpen(true);
  };

  const visibleFallback = fallback.filter((p) => registeredProviders.includes(p));

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Provedores IA" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        {alert ? (
          <div
            data-testid="ai-provider-alert"
            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
              alert.variant === "success"
                ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} aria-label="Fechar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-2xl border border-purple-700 bg-purple-900 p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-600">
            <Bot className="h-7 w-7 text-white" />
          </span>
          <div className="flex-1">
            <p className="font-extrabold text-white">IA multi-provider</p>
            <p className="text-xs text-white/75">1 ativo + fallback • chaves só neste aparelho</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold text-white">
                {registeredProviders.length} cadastrado{registeredProviders.length !== 1 ? "s" : ""}
              </span>
              {active ? (
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-purple-900">
                  Ativo: {PROVIDER_META[active]?.label}
                </span>
              ) : null}
            </div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <Cpu className="h-4 w-4 text-white" />
          </span>
        </div>

        {registeredProviders.length > 0 ? (
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                <Shuffle className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 font-extrabold">Ordem de fallback</p>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {visibleFallback.length} ativo{visibleFallback.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Se o provedor ativo falhar, tenta na ordem abaixo.
            </p>
            {visibleFallback.length === 0 ? (
              <p data-testid="fallback-empty" className="rounded-xl border border-dashed p-3 text-center text-xs text-gray-400">
                Nenhum fallback selecionado — marque provedores abaixo
              </p>
            ) : (
              <div data-testid="fallback-list" className="flex flex-col gap-2">
                {visibleFallback.map((p, idx) => (
                  <div
                    key={p}
                    data-testid={`fallback-item-${p}`}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-gray-50 px-2 py-2 dark:bg-gray-700"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm font-bold">{PROVIDER_META[p]?.label ?? p}</span>
                      {active === p ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                          ativo
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        data-testid={`fallback-up-${p}`}
                        disabled={idx === 0}
                        onClick={() => void moveFallback(fallback.indexOf(p), -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        data-testid={`fallback-down-${p}`}
                        disabled={idx === visibleFallback.length - 1}
                        onClick={() => void moveFallback(fallback.indexOf(p), 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {registeredProviders
                .filter((p) => p !== active)
                .map((p) => {
                  const selected = fallback.includes(p);
                  return (
                    <button
                      key={`toggle-${p}`}
                      data-testid={`toggle-fallback-${p}`}
                      onClick={() => void handleToggleFallback(p)}
                      className={`flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        selected
                          ? "border-purple-600 bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100"
                          : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {selected ? <Check className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
                      {PROVIDER_META[p].label}
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}

        {registeredProviders.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-extrabold">Provedores cadastrados</p>
              <span className="rounded-full border bg-white px-2 py-1 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                {registeredProviders.length} total
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {registeredProviders.map((p) => {
                const isActive = active === p;
                return (
                  <div
                    key={p}
                    data-testid={`registered-card-${p}`}
                    className={`flex items-center justify-between gap-2 rounded-2xl border bg-white p-3 shadow-sm dark:bg-gray-800 ${
                      isActive ? "border-purple-600" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isActive ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400 dark:bg-gray-700"
                        }`}
                      >
                        <Cpu className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold">{PROVIDER_META[p]?.label ?? p}</span>
                          {isActive ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                              ATIVO
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {selectedModels[p] || "sem modelo"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        data-testid={`btn-active-${p}`}
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-purple-900 hover:bg-purple-900" : ""}
                        onClick={() => void handleSetActive(p)}
                      >
                        {isActive ? "Ativo" : "Ativar"}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        data-testid={`btn-delete-${p}`}
                        aria-label={`Remover ${PROVIDER_META[p]?.label}`}
                        onClick={() => setDeleteTarget(p)}
                        className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white p-6 dark:bg-gray-800">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Cpu className="h-6 w-6 text-gray-400" />
            </span>
            <p className="mt-3 font-bold">Nenhum provedor cadastrado</p>
            <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
              Adicione OpenAI, Gemini, Anthropic, OpenRouter ou Zen para usar a IA
            </p>
          </div>
        )}

        <Button data-testid="btn-add-provider" onClick={openAddModal} className="bg-purple-600 py-6 hover:bg-purple-900">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar provedor de IA
        </Button>
        <Button data-testid="btn-go-chat" variant="outline" onClick={() => navigate("/ia")} className="py-6">
          <Bot className="mr-2 h-4 w-4" />
          Abrir chat da IA
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar provedor</DialogTitle>
            <DialogDescription>Salve a chave e escolha o modelo. A lista de modelos é buscada com a chave.</DialogDescription>
          </DialogHeader>
          {alert && modalOpen ? (
            <p
              data-testid="ai-provider-modal-alert"
              className={`rounded-lg border p-2 text-xs ${
                alert.variant === "success"
                  ? "border-green-500 bg-green-50 text-green-800"
                  : "border-red-500 bg-red-50 text-red-800"
              }`}
            >
              {alert.message}
            </p>
          ) : null}
          <div>
            <Label>Provedor</Label>
            <Select
              value={modalProvider}
              onValueChange={(v) => {
                setModalProvider(v as ProviderId);
                setModalModels([]);
                setModalSelectedModel("");
              }}
            >
              <SelectTrigger data-testid="picker-provider">
                <SelectValue placeholder="Provedor" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_META[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chave API</Label>
            <div className="flex items-center gap-2 rounded-xl border px-3 focus-within:border-purple-600">
              <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
              <Input
                data-testid="input-key-modal"
                type="password"
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder={PROVIDER_META[modalProvider]?.placeholder ?? "sk-..."}
                value={modalKey}
                onChange={(e) => setModalKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            <a
              className="mt-1 inline-block text-xs text-purple-600 underline"
              href={PROVIDER_META[modalProvider].docsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Obter chave
            </a>
          </div>
          <Button
            data-testid="btn-search-models"
            variant="outline"
            disabled={!modalKey.trim() || modalLoadingModels}
            onClick={() => void handleSearchModels()}
          >
            <Search className="mr-2 h-4 w-4" />
            {modalLoadingModels ? "Buscando..." : "Pesquisar modelos"}
          </Button>
          <p className="-mt-2 text-[11px] text-gray-500">
            Se a busca falhar, usa a lista local de modelos.
          </p>
          {modalModels.length > 0 ? (
            <div>
              <Label>Modelo</Label>
              <Select value={modalSelectedModel} onValueChange={setModalSelectedModel}>
                <SelectTrigger data-testid="picker-model-modal">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modalModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 truncate text-[11px] text-gray-500">
                {modalModels.length} modelos • ex: {modalModels[0]}
              </p>
            </div>
          ) : null}
          {modalSelectedModel ? (
            <Button data-testid="btn-save-provider" onClick={() => void handleSaveProvider()} className="bg-purple-900 hover:bg-purple-900">
              Salvar provedor
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent data-testid="confirm-delete-provider">
          <DialogHeader>
            <DialogTitle>Remover provedor</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `Remover ${PROVIDER_META[deleteTarget].label}? A chave será apagada deste aparelho.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="confirm-delete-provider-cancel" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button data-testid="confirm-delete-provider-confirm" className="flex-1 bg-red-600 hover:bg-red-900" onClick={() => void confirmDeleteProvider()}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
