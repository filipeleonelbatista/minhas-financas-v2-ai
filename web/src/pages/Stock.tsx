import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CiFilter } from "react-icons/ci";
import {
  FiFilePlus,
  FiList,
  FiPlus,
  FiShoppingCart
} from "react-icons/fi";
import Ad from "../components/ad";
import EmptyMessage from "../components/empty-message";
import Footer from "../components/footer";
import FormAddStockItem from "../components/form-add-stock-item";
import Header from "../components/header";
import StockItem from "../components/stock-item";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../components/ui/use-toast";
import { useStock } from "../hooks/useStock";
import { nowTs } from "../lib/format";
import { useListsStore } from "../stores/lists";

function Stock() {
  const [showFilter, setShowFilter] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  const { filteredList, StockList, search, setSearch, selectedCategory, setSelectedCategory, listTotal } = useStock()
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  };

  const goListsPage = () => {
    navigate("/lists");
  };

  // Espelha `app/src/pages/Market.tsx` handleAddToListConfirm (falta/todos).
  const handleAddToListConfirm = async (mode: "falta" | "todos") => {
    setShowAddToList(false);
    const addList = useListsStore.getState().addList;
    const addItem = useListsStore.getState().addItem;

    if (mode === "falta") {
      const lowest = StockList.filter((i) => i.quantity < i.quantityDesired);
      if (lowest.length === 0) {
        toast({ description: "Nenhum item em falta para criar esta lista" });
        return;
      }
      const totalAmount = lowest.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
      const totalQuantity = lowest.reduce((acc, t) => acc + Number(t.quantity), 0);
      const created = {
        description: "Em falta no estoque",
        location: null,
        amount: totalAmount,
        quantity: totalQuantity,
        date: nowTs(),
      };
      const currentId = await addList(created);
      for (const item of lowest) {
        await addItem({
          list_id: currentId,
          description: item.description,
          category: item.category,
          amount: item.amount,
          quantity: item.quantity,
          quantityDesired: item.quantityDesired,
          location: null,
          date: created.date,
        });
      }
      toast({ description: "Lista criada com itens em falta!", variant: "success" });
      goListsPage();
    } else {
      if (StockList.length === 0) {
        toast({ description: "Estoque vazio para criar lista" });
        return;
      }
      const totalAmount = StockList.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
      const totalQuantity = StockList.reduce((acc, t) => acc + Number(t.quantity), 0);
      const created = {
        description: "Itens do estoque",
        location: null,
        amount: totalAmount,
        quantity: totalQuantity,
        date: nowTs(),
      };
      const currentId = await addList(created);
      for (const item of StockList) {
        await addItem({
          list_id: currentId,
          description: item.description,
          category: item.category,
          amount: item.amount,
          quantity: item.quantity,
          quantityDesired: item.quantityDesired,
          location: null,
          date: created.date,
        });
      }
      toast({ description: "Lista criada com todos os itens!", variant: "success" });
      goListsPage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 items-center">
      <Header title="Estoque" isShort />
      <div className="w-full max-w-[800px] px-2 gap-4 my-2">

      </div>
      <div className="w-full max-w-[800px] px-2 flex flex-col gap-4 mb-4">
        <Ad />
      </div>

      <div className="w-full max-w-[800px] px-2 flex flex-row justify-between items-center gap-4 mb-4">
        <h2 className="font-bold dark:text-white text-gray-800 text-xl">
          Seu estoque
        </h2>
        <Button
          className="border-purple-600 text-purple-600 bg-transparent hover:border-purple-900 hover:text-purple-900"
          variant="outline"
          onClick={() => setShowFilter(!showFilter)}
        >
          <CiFilter className="w-6 h-6 text-purple-600 hover:text-purple-900" />
          Filtros
        </Button>
      </div>

      <div
        id="filters"
        data-showfilter={showFilter}
        className="transition-all duration-400 ease-in-out w-full overflow-hidden max-w-[800px] h-0 p-0 data-[showfilter=true]:h-fit flex flex-col gap-3 data-[showfilter=true]:px-2 data-[showfilter=true]:py-4"
      >
        <div className="w-full flex flex-col gap-1">
          <p className="text-md font-bold dark:text-white text-gray-800 mb-2">
            Categorias
          </p>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
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
              <SelectItem value="Outros" >Outros</SelectItem>
            </SelectContent >
          </Select >
        </div >
      </div >

      {
        StockList.length > 0 ? (
          <div className="w-full max-w-[800px] flex flex-col gap-3 px-2 py-4">
            <Label>Pesquisar por nome</Label>
            <div className="flex w-full items-center space-x-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="text"
                placeholder="Pesquise os itens..."
              />
            </div>
          </div>
        ) : null
      }

      {
        filteredList.length === 0 ? (
          <EmptyMessage />
        ) : (
          <>
            <div className="w-full max-w-[800px] flex flex-col gap-3 px-2 py-4">
              {filteredList.map((item, index) => (
                <StockItem item={item} index={index} key={index} />
              ))}
            </div>

            <div className="w-full max-w-[800px] flex flex-row px-2 justify-between items-center gap-4 mb-8">
              <h2 className="font-semibold dark:text-white text-gray-800 text-xl">
                Total
              </h2>
              <h2 className="font-semibold dark:text-white text-gray-800 text-xl">
                {formatCurrency(listTotal)}
              </h2>
            </div>
          </>
        )
      }

      <Footer />

      {/* FABs como no app: gerar lista + ver listas + adicionar produto */}
      <div className="fixed bottom-4 right-6 flex flex-col gap-3 items-center z-40">
        <button
          data-testid="stock-generate-list-button"
          title="Gerar lista a partir do estoque"
          aria-label="Gerar lista a partir do estoque"
          onClick={() => setShowAddToList(true)}
          className="w-14 h-14 flex items-center justify-center rounded-full drop-shadow-lg bg-purple-600 hover:bg-purple-900"
        >
          <FiFilePlus className="w-6 h-6 text-white" />
        </button>
        <button
          data-testid="stock-lists-button"
          title="Ver listas de compras"
          aria-label="Ver listas de compras"
          onClick={goListsPage}
          className="w-14 h-14 flex items-center justify-center rounded-full drop-shadow-lg bg-purple-600 hover:bg-purple-900"
        >
          <FiList className="w-6 h-6 text-white" />
        </button>
        <Dialog>
          <DialogTrigger
            aria-label="Adicionar produto ao estoque"
            className="w-12 h-12 flex items-center justify-center rounded-full drop-shadow-lg bg-purple-600 hover:bg-purple-900"
          >
            <FiPlus className="w-6 h-6 text-white" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar produto ao estoque</DialogTitle>
              <DialogDescription>
                Adicione itens para suas compras de mercado
              </DialogDescription>
            </DialogHeader>
            <FormAddStockItem />
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de escolha — espelha o modal showAddToListAlert do app */}
      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                <FiShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <DialogTitle>Adicionar itens do estoque</DialogTitle>
                <DialogDescription>
                  Escolha quais itens levar para a lista
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm dark:text-gray-300 text-gray-600">
            Deseja adicionar itens do estoque a uma lista de compras?
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowAddToList(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-purple-200 text-purple-600 hover:text-purple-900"
              onClick={() => void handleAddToListConfirm("falta")}
            >
              somente itens em estoque baixo
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-900"
              onClick={() => void handleAddToListConfirm("todos")}
            >
              todos os itens do estoque
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}

export default Stock;
