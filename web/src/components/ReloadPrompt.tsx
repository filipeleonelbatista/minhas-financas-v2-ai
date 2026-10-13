/** Prompt de atualização do PWA (registerType: 'prompt'). */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ReloadPrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    // import dinâmico: o módulo virtual só existe no pipeline do vite (nunca no node/testes)
    void import("virtual:pwa-register").then((mod) => {
      if (cancelled) return;
      const update = mod.registerSW({
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {
          setOfflineReady(true);
        },
      });
      setUpdateSW(() => update);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg">
      {needRefresh ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">Nova versão disponível.</p>
          <Button size="sm" onClick={() => updateSW?.(true)}>
            Atualizar
          </Button>
        </div>
      ) : (
        <p className="text-sm">App pronto para usar offline.</p>
      )}
    </div>
  );
}
