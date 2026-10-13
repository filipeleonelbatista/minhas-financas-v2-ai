/** Metas — espelha `app/src/pages/Goals.tsx`. */
import { useEffect, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useGoalsStore, type GoalRow } from "@/stores/goals";
import { DEFAULT_GOAL_CATEGORIES, calcGoalProgress, getDaysRemaining, isGoalConcluded } from "@/lib/goals";
import { dateInputToTs, formatBRL, nowTs, tsToDateInput } from "@/lib/format";
import { sanitizeAmount } from "@/utils/sanitize";

const FILTERS = ["Todas", "Ativas", "Concluídas"] as const;

function GoalCard({ goal }: { goal: GoalRow }) {
  const { toast } = useToast();
  const update = useGoalsStore((s) => s.update);
  const remove = useGoalsStore((s) => s.remove);
  const [delta, setDelta] = useState("");

  const progress = calcGoalProgress(goal);
  const days = getDaysRemaining(goal);
  const concluded = isGoalConcluded(goal);

  const move = async (sign: 1 | -1) => {
    const v = sanitizeAmount(delta);
    if (!v) return;
    const next = Math.max(0, Number(goal.currentAmount) + sign * v);
    await update(goal.id, { currentAmount: next });
    setDelta("");
    toast({ description: sign > 0 ? "Depósito registrado!" : "Retirada registrada!", variant: "success" });
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{goal.description}</p>
          <p className="text-xs text-gray-500">
            {goal.category} {concluded ? "· concluída" : days <= 30 ? `· restam ${days} dias` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Excluir esta meta?")) void remove(goal.id);
          }}
        >
          Excluir
        </Button>
      </div>
      <div className="mt-2 h-2 w-full rounded bg-gray-200">
        <div className="h-2 rounded bg-purple-600" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-1 text-sm">
        {formatBRL(goal.currentAmount)} de {formatBRL(goal.amount)} ({Math.round(progress * 100)}%)
      </p>
      {!concluded ? (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Valor"
            inputMode="decimal"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <Button onClick={() => void move(1)}>Depositar</Button>
          <Button variant="outline" onClick={() => void move(-1)}>
            Retirar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function Goals() {
  const { toast } = useToast();
  const goals = useGoalsStore((s) => s.goals);
  const filteredGoals = useGoalsStore((s) => s.filteredGoals);
  const selectedFilter = useGoalsStore((s) => s.selectedFilter);
  const load = useGoalsStore((s) => s.load);
  const add = useGoalsStore((s) => s.add);
  const setFilter = useGoalsStore((s) => s.setFilter);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(tsToDateInput(nowTs()));
  const [category, setCategory] = useState("outros");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = goals.reduce((a, g) => a + Number(g.amount), 0);
  const saved = goals.reduce((a, g) => a + Number(g.currentAmount), 0);

  const submit = async () => {
    try {
      await add({
        description,
        amount: sanitizeAmount(amount),
        currentAmount: 0,
        date: dateInputToTs(date),
        category,
      });
      setDescription("");
      setAmount("");
      toast({ description: "Meta adicionada!", variant: "success" });
    } catch {
      toast({ description: "Verifique os campos da meta.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Metas" isShort />
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Metas</p>
            <p className="text-xl font-bold">{goals.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Valor total</p>
            <p className="text-xl font-bold">{formatBRL(total)}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Guardado</p>
            <p className="text-xl font-bold">{formatBRL(saved)}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="mb-2 font-bold">Nova meta</p>
          <div className="flex flex-col gap-2">
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Valor</Label>
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="goal-categories"
              />
              <datalist id="goal-categories">
                {DEFAULT_GOAL_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Button onClick={() => void submit()}>Adicionar meta</Button>
          </div>
        </div>

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              variant={selectedFilter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>

        {filteredGoals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
      <Footer />
    </div>
  );
}
