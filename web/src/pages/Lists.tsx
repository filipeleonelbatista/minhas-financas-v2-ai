/** Listas de compra — espelha `app/src/pages/Lists.tsx`. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useListsStore } from "@/stores/lists";
import { formatBRL, formatDateBR, nowTs } from "@/lib/format";

export default function Lists() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const lists = useListsStore((s) => s.lists);
  const load = useListsStore((s) => s.load);
  const addList = useListsStore((s) => s.addList);
  const deleteList = useListsStore((s) => s.deleteList);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    try {
      const id = await addList({
        description,
        location: location || null,
        quantity: 0,
        amount: 0,
        date: nowTs(),
      });
      setDescription("");
      setLocation("");
      toast({ description: "Lista criada!", variant: "success" });
      navigate(`/lists/${id}`);
    } catch {
      toast({ description: "Verifique os campos da lista.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Listas" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Nova lista</p>
          <div className="flex flex-col gap-2">
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Local (opcional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <Button onClick={() => void submit()}>Criar lista</Button>
          </div>
        </div>

        {lists.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800"
          >
            <div className="cursor-pointer" onClick={() => navigate(`/lists/${l.id}`)}>
              <p className="font-bold">{l.description}</p>
              <p className="text-xs text-gray-500">
                {l.location ? `${l.location} · ` : ""}
                {l.quantity} itens · {formatBRL(l.amount)} · {formatDateBR(l.date)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Excluir lista e todos os itens?")) void deleteList(l.id);
              }}
            >
              Excluir
            </Button>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
