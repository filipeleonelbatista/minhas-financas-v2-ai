/** Listas de compra — espelha `app/src/pages/Lists.tsx` + `ListCard.tsx`. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiPlus, FiShoppingCart, FiTrash2 } from "react-icons/fi";
import EmptyMessage from "../components/empty-message";
import Footer from "../components/footer";
import Header from "../components/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useListsStore, type ListRow } from "@/stores/lists";
import { formatBRL, formatDateBR, nowTs } from "@/lib/format";

export default function Lists() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const lists = useListsStore((s) => s.lists);
  const load = useListsStore((s) => s.load);
  const addList = useListsStore((s) => s.addList);
  const updateList = useListsStore((s) => s.updateList);
  const deleteList = useListsStore((s) => s.deleteList);

  const [showAdd, setShowAdd] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const [editing, setEditing] = useState<ListRow | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openList = (id: string) => navigate(`/lists/${id}`);

  const submitAdd = async () => {
    try {
      const id = await addList({
        description: newDescription,
        location: newLocation || null,
        quantity: 0,
        amount: 0,
        date: nowTs(),
      });
      setNewDescription("");
      setNewLocation("");
      setShowAdd(false);
      toast({ description: "Lista criada!", variant: "success" });
      openList(id);
    } catch {
      toast({ description: "Verifique os campos da lista.", variant: "destructive" });
    }
  };

  const openEdit = (l: ListRow) => {
    setEditing(l);
    setEditDescription(l.description);
    setEditLocation(l.location ?? "");
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await updateList(editing.id, {
        description: editDescription,
        location: editLocation || null,
      });
      setEditing(null);
      toast({ description: "Lista atualizada!", variant: "success" });
    } catch {
      toast({ description: "Verifique os campos da lista.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Lista" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-3">
            <button
              title="Voltar para o estoque"
              aria-label="Voltar para o estoque"
              onClick={() => navigate("/stock")}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
            <h2 className="font-bold dark:text-white text-gray-800 text-xl">
              Suas listas de compras
            </h2>
          </div>
          <p className="text-sm dark:text-gray-300 text-gray-600">
            Crie suas listas de compra e adicione ao estoque para seu controle. Clique para abrir uma lista.
          </p>
        </div>

        {lists.length === 0 ? (
          <EmptyMessage />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs dark:text-gray-300 text-gray-600">
              Clique para abrir • Editar altera nome e local • Excluir apaga a lista e os itens
            </p>
            {lists.map((l) => (
              <div
                key={l.id}
                data-testid={`list-card-${l.id}`}
                className="px-4 py-3 flex flex-row gap-4 rounded items-center bg-white dark:bg-gray-800 drop-shadow-lg border dark:border-gray-700"
              >
                <FiShoppingCart className="w-7 h-7 shrink-0 text-gray-800 dark:text-white" />
                <div
                  className="w-full flex flex-row items-center justify-between gap-2 cursor-pointer min-w-0"
                  onClick={() => openList(l.id)}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-lg truncate dark:text-white text-gray-800">{l.description}</p>
                    <p className="text-sm dark:text-gray-300 text-gray-600 truncate">
                      {l.location ? l.location : "Sem mercado definido"}
                    </p>
                    <p className="text-sm dark:text-gray-300 text-gray-600">
                      {l.quantity} itens · {formatDateBR(l.date)}
                    </p>
                  </div>
                  <p className="font-semibold text-right shrink-0 dark:text-white text-gray-800">
                    {formatBRL(l.amount)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={() => openEdit(l)}>
                    <FiEdit2 className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={() => {
                      if (confirm("Excluir lista e todos os itens?")) void deleteList(l.id);
                    }}
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />

      {/* FAB de adicionar — como os FABs do app em Market */}
      <button
        data-testid="lists-add-button"
        title="Adicionar lista"
        aria-label="Adicionar lista"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-4 right-6 w-14 h-14 flex items-center justify-center rounded-full drop-shadow-lg bg-purple-600 hover:bg-purple-900 z-40"
      >
        <FiPlus className="w-6 h-6 text-white" />
      </button>

      {/* Dialog de nova lista — campos do EditListForm do app */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova lista</DialogTitle>
            <DialogDescription>
              Crie sua lista de compras.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="list-description">Nome da lista</Label>
              <Input
                id="list-description"
                placeholder="Nome da lista"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="list-location">Local de compra</Label>
              <Input
                id="list-location"
                placeholder="Local de compra"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esse local será usado para criar os itens da sua lista. Ao adicionar
                um item na lista você poderá mudar isso se preferir.
              </p>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-900" onClick={() => void submitAdd()}>
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição — espelha EditListForm do app */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar informações da Lista</DialogTitle>
            <DialogDescription>
              Edite os dados da sua lista.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="list-edit-description">Nome da lista</Label>
              <Input
                id="list-edit-description"
                placeholder="Nome da lista"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="list-edit-location">Local de compra</Label>
              <Input
                id="list-edit-location"
                placeholder="Local de compra"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esse local será usado para criar os itens da sua lista. Ao adicionar
                um item na lista você poderá mudar isso se preferir.
              </p>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-900" onClick={() => void submitEdit()}>
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
