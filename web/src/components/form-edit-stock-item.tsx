import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStock } from "@/hooks/useStock";
import type { LegacyStockItem } from "@/types/contexts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { IoTrashOutline } from "react-icons/io5";
import { parseBRMoney } from "@/lib/normalize";

const STOCK_CATEGORIES = ["Carnes", "Fruteira", "Higiêne", "Limpeza", "Mercearia", "Outros"];

const formSchema = z.object({
  description: z.string().trim().min(1, "O campo Descrição é obrigatório"),
  amount: z.string().min(1, "O campo Valor é obrigatório"),
  category: z.string().min(1, "O campo Categoria é obrigatório"),
  quantity: z.string().min(1, "O campo Quantidade é obrigatório"),
  quantityDesired: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

function moeda(e: string): string {
  let value = e;
  value = value.replace(/\D/g, "");
  value = value.replace(/(\d)(\d{2})$/, "$1,$2");
  value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
  return value;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 dark:text-red-300">{message}</p>;
}

function FormEditStockItem({ selectedTransaction }: { selectedTransaction: LegacyStockItem }) {
  const { updateTransaction, deleteTransaction } = useStock();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: selectedTransaction.description,
      amount: moeda(`${Math.round(Number(selectedTransaction.amount) * 100)}`),
      category: selectedTransaction.category ?? "Mercearia",
      quantity: String(selectedTransaction.quantity),
      quantityDesired: String(selectedTransaction.quantityDesired ?? ""),
    },
  });

  const onSubmit = async (v: FormValues) => {
    await updateTransaction({
      ...selectedTransaction,
      description: v.description,
      amount: parseBRMoney(v.amount),
      category: v.category,
      quantity: parseInt(v.quantity, 10),
      quantityDesired: v.quantityDesired ? parseInt(v.quantityDesired, 10) : 1,
    });

    document.getElementById("close-dialog")?.click();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="w-full max-h-96 overflow-auto flex flex-col space-y-4 p-2"
    >
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" {...register("description")} />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="w-full flex flex-col gap-1">
        <p className="text-md font-bold dark:text-white text-gray-800 mb-2">Categorias</p>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categorias" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.category?.message} />
      </div>

      <div>
        <Label>Valor</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <Input
              id="amount"
              inputMode="numeric"
              value={field.value}
              onChange={(event) => field.onChange(moeda(event.target.value))}
            />
          )}
        />
        <FieldError message={errors.amount?.message} />
      </div>

      <div>
        <Label htmlFor="quantity">Quantidade</Label>
        <Input id="quantity" inputMode="numeric" {...register("quantity")} />
        <FieldError message={errors.quantity?.message} />
      </div>

      <div>
        <Label htmlFor="quantityDesired">Quantidade desejada</Label>
        <Input id="quantityDesired" inputMode="numeric" {...register("quantityDesired")} />
        <FieldError message={errors.quantityDesired?.message} />
      </div>

      <Button type="submit" className="bg-purple-600 hover:bg-purple-900">
        Salvar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (confirm("Deseja realmente excluir este item? Essa ação é permanente.")) {
            void deleteTransaction(selectedTransaction).then(() =>
              document.getElementById("close-dialog")?.click()
            );
          }
        }}
      >
        <IoTrashOutline className="mr-2" />
        Excluir
      </Button>
    </form>
  );
}

export default FormEditStockItem;

