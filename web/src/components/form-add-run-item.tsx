import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRuns } from "@/hooks/useRuns";
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
import { DatePicker } from "./date-picker";
import { parseBRMoney } from "@/lib/normalize";

const FUEL_TYPES = [
  "Gasolina comum",
  "Gasolina aditivada",
  "Etanol",
  "Etanol aditivada",
  "Carga elétrica",
  "GNV",
  "Dísel",
  "Dísel-S10",
  "Dísel aditivado",
];

const formSchema = z.object({
  location: z.string().trim().min(1, "O campo Local é obrigatório"),
  currentDistance: z.string().min(1, "O campo Km Atual é obrigatório"),
  unityAmount: z.string().min(1, "O campo Valor do litro é obrigatório"),
  amount: z.string().min(1, "O campo Valor Pago é obrigatório"),
  type: z.string().min(1, "O campo Tipo do combustível é obrigatório"),
  date: z.date().nullable(),
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

function FormAddRunItem() {
  const { addTransaction } = useRuns();

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      currentDistance: "",
      unityAmount: "",
      amount: "",
      type: "Gasolina comum",
      date: new Date(),
    },
  });

  const onSubmit = async (v: FormValues) => {
    if (!(v.date instanceof Date)) {
      setError("date", { type: "required", message: "O campo Data é obrigatório" });
      return;
    }
    await addTransaction({
      location: v.location,
      currentDistance: parseBRMoney(v.currentDistance),
      unityAmount: parseBRMoney(v.unityAmount),
      amount: parseBRMoney(v.amount),
      type: v.type,
      date: v.date ? v.date.getTime() + 43200000 : "",
    });

    document.getElementById("close-dialog")?.click();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="w-full max-h-96 overflow-auto flex flex-col space-y-4 p-2"
    >
      <div>
        <Label htmlFor="location">Local</Label>
        <Input id="location" {...register("location")} />
        <FieldError message={errors.location?.message} />
      </div>

      <div>
        <Label htmlFor="currentDistance">Km Atual</Label>
        <Input id="currentDistance" inputMode="numeric" {...register("currentDistance")} />
        <FieldError message={errors.currentDistance?.message} />
      </div>

      <div>
        <Label>Valor do litro</Label>
        <Controller
          name="unityAmount"
          control={control}
          render={({ field }) => (
            <Input
              id="unityAmount"
              inputMode="numeric"
              value={field.value}
              onChange={(event) => field.onChange(moeda(event.target.value))}
            />
          )}
        />
        <FieldError message={errors.unityAmount?.message} />
      </div>

      <div>
        <Label>Valor pago</Label>
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

      <div className="w-full flex flex-col gap-1">
        <p className="text-md font-bold dark:text-white text-gray-800 mb-2">Tipo do combustivel</p>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo do combustivel" />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((item, index) => (
                  <SelectItem key={index} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.type?.message} />
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

      <Button type="submit" className="bg-purple-600 hover:bg-purple-900">
        Adicionar
      </Button>
    </form>
  );
}

export default FormAddRunItem;
