/** Detalhe da lista — espelha `app/src/pages/List.tsx`. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useListsStore } from "@/stores/lists";
import { formatBRL, nowTs } from "@/lib/format";
import { sanitizeAmount } from "@/utils/sanitize";

export default function ListDetail() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const selectedList = useListsStore((s) => s.selectedList);
  const filteredList = useListsStore((s) => s.filteredList);
  const search = useListsStore((s) => s.search);
  const listTotal = useListsStore((s) => s.getListTotal());
  const handleSelect = useListsStore((s) => s.handleSelect);
  const addItem = useListsStore((s) => s.addItem);
  const updateQuantity = useListsStore((s) => s.updateQuantity);
  const deleteItem = useListsStore((s) => s.deleteItem);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [searchInput, setSearchInput] = useState(search);
  const setSearch = useListsStore((s) => s.setSearch);

  useEffect(() => {
    if (id) void handleSelect(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async () => {
    if (!id) return;
    try {
      await addItem({
        list_id: id,
        description,
        category: "Mercearia",
        amount: sanitizeAmount(amount),
        quantity: Math.max(0, parseInt(quantity || "0", 10)),
        quantityDesired: 1,
        location: null,
        date: nowTs(),
      });
      setDescription("");
      setAmount("");
      setQuantity("1");
      toast({ description: "Item adicionado!", variant: "success" });
    } catch {
      toast({ description: "Verifique os campos do item.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title={selectedList?.description ?? "Lista"} isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <Button variant="outline" onClick={() => navigate("/lists")}>
          Voltar para listas
        </Button>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Novo item</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Valor unit.</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Qtd</Label>
              <Input
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => void submit()}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Buscar</Label>
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearch(e.target.value);
            }}
          />
        </div>

        <p className="font-bold">Total: {formatBRL(listTotal)}</p>

        {filteredList.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm dark:bg-gray-800"
          >
            <div>
              <p className="font-bold">{item.description}</p>
              <p className="text-xs text-gray-500">
                {formatBRL(item.amount)} × {item.quantity} ={" "}
                {formatBRL(Number(item.amount) * Number(item.quantity))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void updateQuantity(item, false)}>
                -
              </Button>
              <span className="w-6 text-center">{item.quantity}</span>
              <Button size="sm" variant="outline" onClick={() => void updateQuantity(item, true)}>
                +
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (id && confirm("Excluir item?")) void deleteItem(item.id, id);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
