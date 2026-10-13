import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePayments } from "@/hooks/usePayments";
import type { LegacyTransaction } from "@/types/contexts";
import { DatePicker } from "./date-picker";
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
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { IoTrashOutline } from "react-icons/io5";
import { parseBRMoney } from "@/lib/normalize";

const formSchema = z.object({
  description: z.string().trim().min(1, "O campo Descrição é obrigatório"),
  about: z.string().optional().default(""),
  amount: z.string().min(1, "O campo Valor é obrigatório"),
  category: z.string().default("Outros"),
  date: z.date().nullable(),
  paymentDate: z.date().nullable().optional(),
  paymentStatus: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

function moeda(e: string): string {
  let value = e;
  value = value.replace(/\D/g, "");
  value = value.replace(/(\d)(\d{2})$/, "$1,$2");
  value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
  return value;
}

function toMoney(n: number): string {
  return moeda(`${Math.round(Number(n) * 100)}`);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 dark:text-red-300">{message}</p>;
}

function FormEditTransaction({ selectedTransaction }: { selectedTransaction: LegacyTransaction }) {
  const { categoriesList, updateTransaction, deleteTransaction } = usePayments();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: selectedTransaction.description,
      about: selectedTransaction.about ?? "",
      amount: toMoney(selectedTransaction.amount),
      date: selectedTransaction.date instanceof Date ? selectedTransaction.date : null,
      paymentDate:
        selectedTransaction.paymentDate instanceof Date ? selectedTransaction.paymentDate : null,
      paymentStatus: selectedTransaction.paymentStatus,
      category: selectedTransaction.category ?? "Outros",
      isEnabled: selectedTransaction.isEnabled,
    },
  });

  const paymentStatus = watch("paymentStatus");

  const toggleSwitchPaymentStatus = () => {
    if (!paymentStatus) {
      setValue("paymentDate", new Date());
    } else {
      setValue("paymentDate", null);
    }
    setValue("paymentStatus", !paymentStatus);
  };

  const onSubmit = async (v: FormValues) => {
    if (!(v.date instanceof Date)) {
      setError("date", { type: "required", message: "Data obrigatória" });
      return;
    }
    await updateTransaction({
      ...selectedTransaction,
      description: v.description,
      about: v.about ?? "",
      amount: parseBRMoney(v.amount),
      category: v.isEnabled ? v.category : "Ganhos",
      date: v.date ? new Date(v.date.getTime() + 43200000) : selectedTransaction.date,
      paymentDate: v.paymentDate ? new Date(v.paymentDate.getTime() + 43200000) : "",
      paymentStatus: v.paymentStatus,
      isEnabled: v.isEnabled,
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
      <div>
        <Label htmlFor="about">Sobre</Label>
        <Textarea id="about" {...register("about")} />
        <FieldError message={errors.about?.message} />
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
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <DatePicker
              date={field.value}
              setDate={(d) => field.onChange(d ?? null)}
              label="Data de vencimento"
              id="date"
            />
          )}
        />
        <FieldError message={errors.date?.message} />
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
                {categoriesList.map((cat, index) => {
                  if (index == 0) return null;
                  return (
                    <SelectItem key={index} value={cat}>
                      {cat}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.category?.message} />
      </div>

      <div>
        <Controller
          name="paymentDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              date={field.value ?? null}
              setDate={(d) => field.onChange(d ?? null)}
              label="Data de pagamento"
              id="paymentDate"
            />
          )}
        />
        <FieldError message={errors.paymentDate?.message} />
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Controller
            name="isEnabled"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} id="isEnabled" />
            )}
          />
          <Label htmlFor="isEnabled">É despesa?</Label>
        </div>
        <p>Deixe marcado caso esteja adicionando uma saída (Despesa)</p>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Switch checked={paymentStatus} onClick={toggleSwitchPaymentStatus} id="isPaid" />
          <Label htmlFor="isPaid">Foi pago?</Label>
        </div>
        <FieldError message={errors.paymentStatus?.message} />
      </div>

      <Button type="submit" className="bg-purple-600 hover:bg-purple-900">
        Salvar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (confirm("Deseja realmete excluir este item? Essa ação é permanente.")) {
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

export default FormEditTransaction;
