/** Detalhe da lista — espelha `app/src/pages/List.tsx`. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import EmptyMessage from "../components/empty-message";
import Footer from "../components/footer";
import FormAddListItem from "../components/form-add-list-item";
import Header from "../components/header";
import ListItemCard from "../components/list-item-card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useListsStore } from "@/stores/lists";
import { formatDateBR } from "@/lib/format";

export default function ListDetail() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const selectedList = useListsStore((s) => s.selectedList);
  const selectedListItems = useListsStore((s) => s.selectedListItems);
  const filteredList = useListsStore((s) => s.filteredList);
  const search = useListsStore((s) => s.search);
  const selectedCategory = useListsStore((s) => s.selectedCategory);
  const setSelectedCategory = useListsStore((s) => s.setSelectedCategory);
  const listTotal = useListsStore((s) => s.getListTotal());
  const handleSelect = useListsStore((s) => s.handleSelect);
  const updateList = useListsStore((s) => s.updateList);
  const deleteList = useListsStore((s) => s.deleteList);

  const [searchInput, setSearchInput] = useState(search);
  const setSearch = useListsStore((s) => s.setSearch);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");

  useEffect(() => {
    if (id) void handleSelect(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEditList = () => {
    setEditDescription(selectedList?.description ?? "");
    setEditLocation(selectedList?.location ?? "");
    setShowEditList(true);
  };

  const submitEditList = async () => {
    if (!id) return;
    try {
      await updateList(id, {
        description: editDescription,
        location: editLocation || null,
      });
      setShowEditList(false);
      toast({ description: "Lista atualizada!", variant: "success" });
    } catch {
      toast({ description: "Verifique os campos da lista.", variant: "destructive" });
    }
  };

  const handleDeleteList = () => {
    if (!id) return;
    if (!confirm("Deseja excluir a lista?")) return;
    void deleteList(id).then(() => {
      toast({ description: "Lista excluída", variant: "success" });
      navigate("/lists");
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Lista" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-center gap-3">
            <button
              title="Voltar para listas"
              aria-label="Voltar para listas"
              onClick={() => navigate("/lists")}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
            <h2 className="font-bold dark:text-white text-gray-800 text-xl truncate">
              {selectedList?.description ?? "Lista"}
            </h2>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm dark:text-gray-300 text-gray-600">
              Local de compra: {selectedList?.location ? selectedList.location : "Sem mercado"}
            </p>
            <p className="text-sm dark:text-gray-300 text-gray-600">
              Criado em: {selectedList ? formatDateBR(selectedList.date) : ""}
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 border-green-600 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-700"
              onClick={openEditList}
            >
              <FiEdit2 className="w-4 h-4" />
              Editar lista
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 border-red-300 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
              onClick={handleDeleteList}
            >
              <FiTrash2 className="w-4 h-4" />
              Excluir lista
            </Button>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex flex-row justify-between items-center gap-4">
          <h2 className="font-bold dark:text-white text-gray-800 text-xl shrink-0">
            Sua lista
          </h2>
          <div className="flex-1 min-w-0">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os itens">Todos os itens</SelectItem>
                <SelectItem value="Carnes">Carnes</SelectItem>
                <SelectItem value="Fruteira">Fruteira</SelectItem>
                <SelectItem value="Higiêne">Higiêne</SelectItem>
                <SelectItem value="Limpeza">Limpeza</SelectItem>
                <SelectItem value="Mercearia">Mercearia</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedListItems.length > 0 ? (
          <div className="flex flex-col gap-1">
            <Label>Pesquisar por nome</Label>
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearch(e.target.value);
              }}
              type="text"
              placeholder="Pesquise os itens..."
            />
          </div>
        ) : null}

        {filteredList.length === 0 ? (
          <EmptyMessage />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredList.map((item, index) => (
              <ListItemCard item={item} index={index} key={item.id} listId={id ?? item.list_id} />
            ))}
          </div>
        )}

        {selectedListItems.length > 0 ? (
          <div className="flex flex-row justify-between items-center gap-4 mb-8">
            <h2 className="font-semibold dark:text-white text-gray-800 text-xl">
              Total
            </h2>
            <h2 className="font-semibold dark:text-white text-gray-800 text-xl">
              {formatCurrency(listTotal)}
            </h2>
          </div>
        ) : null}
      </div>
      <Footer />

      {/* FAB de adicionar item — como os FABs do app em Market */}
      <button
        data-testid="list-add-item-button"
        title="Adicionar item na lista"
        aria-label="Adicionar item na lista"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-4 right-6 w-14 h-14 flex items-center justify-center rounded-full drop-shadow-lg bg-purple-600 hover:bg-purple-900 z-40"
      >
        <FiPlus className="w-6 h-6 text-white" />
      </button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar item na lista</DialogTitle>
            <DialogDescription>
              Adicione itens para suas compras de mercado.
            </DialogDescription>
          </DialogHeader>
          {id ? <FormAddListItem listId={id} defaultLocation={selectedList?.location} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditList} onOpenChange={setShowEditList}>
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
            </div>
            <Button className="bg-purple-600 hover:bg-purple-900" onClick={() => void submitEditList()}>
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
