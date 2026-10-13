/** Provedores de IA — espelha `app/src/pages/AIProviders.tsx`. */
import { useEffect, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  FALLBACK_MODELS,
  PROVIDERS,
  PROVIDER_META,
  fetchModels,
  getActiveProvider,
  getAllProviderModels,
  getFallbackOrder,
  maskKey,
  saveProviderModel,
  setActiveProvider,
  setFallbackOrder,
  type ProviderId,
} from "@/utils/aiProviders";
import {
  deleteProviderKey,
  getProviderKey,
  saveProviderKey,
} from "@/utils/secureStore";

export default function AIProviders() {
  const { toast } = useToast();
  const [active, setActive] = useState<ProviderId | null>(null);
  const [order, setOrder] = useState<ProviderId[]>([]);
  const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<Record<string, string | null>>({});

  const [newProvider, setNewProvider] = useState<ProviderId>("openai");
  const [newKey, setNewKey] = useState("");
  const [fetched, setFetched] = useState<string[]>([]);
  const [newModel, setNewModel] = useState("");

  const refresh = async () => {
    setActive(await getActiveProvider());
    setOrder(await getFallbackOrder());
    const keys: Record<string, boolean> = {};
    for (const p of PROVIDERS) keys[p] = !!(await getProviderKey(p));
    setHasKey(keys);
    setModels(await getAllProviderModels());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const searchModels = async () => {
    if (!newKey.trim()) {
      toast({ description: "Informe a chave para buscar modelos.", variant: "destructive" });
      return;
    }
    const list = await fetchModels(newProvider, newKey.trim());
    setFetched(list);
    setNewModel(list[0] ?? "");
  };

  const save = async () => {
    if (!newKey.trim()) {
      toast({ description: "Informe a chave do provedor.", variant: "destructive" });
      return;
    }
    await saveProviderKey(newProvider, newKey.trim());
    if (newModel) await saveProviderModel(newProvider, newModel);
    if (!active) await setActiveProvider(newProvider);
    setNewKey("");
    setFetched([]);
    setNewModel("");
    await refresh();
    toast({ description: "Provedor salvo!", variant: "success" });
  };

  const remove = async (p: ProviderId) => {
    if (!confirm(`Excluir provedor ${PROVIDER_META[p].label}?`)) return;
    await deleteProviderKey(p);
    await setFallbackOrder(order.filter((x) => x !== p));
    if (active === p) {
      const rest = order.filter((x) => x !== p);
      if (rest.length > 0) await setActiveProvider(rest[0]);
    }
    await refresh();
  };

  const move = async (p: ProviderId, dir: -1 | 1) => {
    const i = order.indexOf(p);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    await setFallbackOrder(next);
    setOrder(next);
  };

  const addToFallback = async (p: ProviderId) => {
    if (order.includes(p)) return;
    const next = [...order, p];
    await setFallbackOrder(next);
    setOrder(next);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Provedores IA" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Adicionar provedor</p>
          <p className="mb-2 text-xs text-gray-500">
            Chaves ficam só neste aparelho (localStorage isolado). A IA precisa de internet.
          </p>
          <div className="flex flex-col gap-2">
            <div>
              <Label>Provedor</Label>
              <div className="flex gap-2">
                <select
                  className="w-full rounded border p-2"
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value as ProviderId)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_META[p as ProviderId].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Chave ({PROVIDER_META[newProvider].placeholder})</Label>
              <Input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={PROVIDER_META[newProvider].placeholder}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void searchModels()}>
                Buscar modelos
              </Button>
              <a
                className="self-center text-xs text-purple-600 underline"
                href={PROVIDER_META[newProvider].docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Obter chave
              </a>
            </div>
            {fetched.length > 0 ? (
              <div>
                <Label>Modelo</Label>
                <select
                  className="w-full rounded border p-2"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                >
                  {fetched.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Button onClick={() => void save()}>Salvar provedor</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Cadastrados</p>
          {PROVIDERS.map((p) => {
            const pid = p as ProviderId;
            return (
              <div key={p} className="mb-2 flex items-center justify-between gap-2 border-b pb-2">
                <div>
                  <p className="font-bold">
                    {PROVIDER_META[pid].label} {active === pid ? "(ativo)" : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    chave {hasKey[p] ? maskKey("x".repeat(12)) : "não cadastrada"} · modelo{" "}
                    {models[p] ?? FALLBACK_MODELS[pid][0]}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => void addToFallback(pid)}>
                    Fallback
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void setActiveProvider(pid).then(() => void refresh());
                    }}
                  >
                    Ativar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void remove(pid)}>
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Ordem de fallback</p>
          {order.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma ordem definida.</p>
          ) : (
            order.map((p, i) => (
              <div key={p} className="flex items-center justify-between py-1">
                <span className="text-sm">
                  {i + 1}. {PROVIDER_META[p].label}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => void move(p, -1)}>
                    ↑
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void move(p, 1)}>
                    ↓
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
