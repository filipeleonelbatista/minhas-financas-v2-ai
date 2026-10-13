/** Metas — espelha `app/src/pages/Goals.tsx`. */
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Car,
  ChevronRight,
  DollarSign,
  Filter,
  Home,
  Laptop,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Palmtree,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useGoalsStore, type GoalRow } from "@/stores/goals";
import {
  DEFAULT_GOAL_CATEGORIES,
  calcGoalProgress,
  filterGoalsByStatus,
  getDaysRemaining,
  isGoalConcluded,
} from "@/lib/goals";
import { dateInputToTs, formatBRL, formatDateBR, nowTs, tsToDateInput } from "@/lib/format";
import { sanitizeAmount } from "@/utils/sanitize";

const STATUS_FILTERS = ["Todas", "Ativas", "Concluídas"] as const;

function moeda(value: string): string {
  let v = String(value).replace(/\D/g, "");
  v = v.replace(/(\d)(\d{2})$/, "$1,$2");
  v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
  return v;
}

function parseMoeda(str: string): number {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

function getCategoryOptions(existingGoals: GoalRow[] = []): string[] {
  const defaults = DEFAULT_GOAL_CATEGORIES as readonly string[];
  const custom = [
    ...new Set(
      existingGoals
        .map((g) => (g.category || "").toLowerCase())
        .filter((c) => c && !defaults.includes(c) && c !== "outros")
    ),
  ];
  return [...defaults, ...custom];
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const c = (category || "").toLowerCase();
  const cls = className ?? "h-4 w-4";
  if (c === "viagem") return <Plane className={cls} />;
  if (c === "carro") return <Car className={cls} />;
  if (c === "computador") return <Laptop className={cls} />;
  if (c === "investimento") return <TrendingUp className={cls} />;
  if (c === "férias" || c === "ferias") return <Palmtree className={cls} />;
  if (c === "casa") return <Home className={cls} />;
  if (c === "reserva") return <PiggyBank className={cls} />;
  return <Target className={cls} />;
}

function prazoText(goal: GoalRow): string {
  const concluded = isGoalConcluded(goal);
  if (concluded) return "Concluída";
  const days = getDaysRemaining(goal);
  if (days < 0) return `Vencida há ${Math.abs(days)} dias`;
  if (days === 0) return "Vence hoje";
  if (days <= 30) return `Restam ${days} dias`;
  return `${days} dias restantes`;
}

function GoalCardView({
  goal,
  onDeposit,
  onEdit,
  onDelete,
}: {
  goal: GoalRow;
  onDeposit: (g: GoalRow) => void;
  onEdit: (g: GoalRow) => void;
  onDelete: (g: GoalRow) => void;
}) {
  const progress = calcGoalProgress(goal);
  const concluded = isGoalConcluded(goal);
  const percent = Math.round(progress * 100);
  const category = goal.category ?? "outros";

  return (
    <div
      data-testid={`goal-card-${goal.id}`}
      onClick={() => onEdit(goal)}
      className="cursor-pointer rounded border bg-white p-3 shadow-sm dark:bg-gray-800"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center">
          <span className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-900 dark:bg-gray-700 dark:text-purple-200">
            <CategoryIcon category={category} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase text-purple-700 dark:text-purple-300">{category}</p>
            <p data-testid={`goal-prazo-${goal.id}`} className="text-[11px] text-gray-500 dark:text-gray-400">
              {prazoText(goal)}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[11px] font-bold ${
            concluded
              ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {percent}%
        </span>
      </div>

      <p className="mb-1 line-clamp-2 text-[15px] font-semibold">{goal.description}</p>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate">
          {formatBRL(goal.currentAmount)} de {formatBRL(goal.amount)}
        </span>
        <span className="shrink-0">{formatDateBR(goal.date)}</span>
      </div>

      <div data-testid={`goal-progress-${goal.id}`} className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full ${concluded ? "bg-green-600" : "bg-purple-900 dark:bg-purple-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {!concluded ? (
          <Button
            data-testid={`goal-cta-${goal.id}`}
            onClick={() => onDeposit(goal)}
            className="flex-1 bg-purple-600 hover:bg-purple-900"
          >
            Depositar
          </Button>
        ) : (
          <p data-testid={`goal-concluded-${goal.id}`} className="flex-1 rounded-xl border border-green-200 bg-green-50 py-2 text-center text-sm font-semibold text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            Meta concluída 🎉
          </p>
        )}
        <Button size="icon" variant="outline" aria-label="Editar meta" onClick={() => onEdit(goal)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Excluir meta"
          onClick={() => onDelete(goal)}
          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Goals() {
  const { toast } = useToast();
  const goals = useGoalsStore((s) => s.goals);
  const selectedFilter = useGoalsStore((s) => s.selectedFilter);
  const load = useGoalsStore((s) => s.load);
  const add = useGoalsStore((s) => s.add);
  const update = useGoalsStore((s) => s.update);
  const remove = useGoalsStore((s) => s.remove);
  const setFilter = useGoalsStore((s) => s.setFilter);

  const [filterCategory, setFilterCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [date, setDate] = useState(tsToDateInput(nowTs()));
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_GOAL_CATEGORIES[0]);
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const [depositGoal, setDepositGoal] = useState<GoalRow | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<GoalRow | null>(null);
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = filterGoalsByStatus(goals, selectedFilter);
    if (filterCategory !== "Todas") {
      const norm = filterCategory.toLowerCase();
      list = list.filter((g) => (g.category || "").toLowerCase() === norm);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) => g.description.toLowerCase().includes(q) || (g.category || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(a.date) - Number(b.date));
  }, [goals, selectedFilter, filterCategory, search]);

  const totalGoals = goals.length;
  const totalAmount = useMemo(() => goals.reduce((acc, g) => acc + Number(g.amount || 0), 0), [goals]);
  const totalCurrent = useMemo(() => goals.reduce((acc, g) => acc + Number(g.currentAmount || 0), 0), [goals]);
  const activeCount = useMemo(() => filterGoalsByStatus(goals, "Ativas").length, [goals]);
  const concludedCount = useMemo(() => filterGoalsByStatus(goals, "Concluídas").length, [goals]);
  const categoryOptions = useMemo(() => getCategoryOptions(goals), [goals]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCurrentAmount("");
    setDate(tsToDateInput(nowTs()));
    setSelectedCategory(DEFAULT_GOAL_CATEGORIES[0]);
    setShowCustomCat(false);
    setCustomCategory("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (goal: GoalRow) => {
    const toMasked = (v: number) => moeda(Math.round(Number(v || 0) * 100).toString());
    setEditing(goal);
    setDescription(goal.description);
    setAmount(toMasked(goal.amount));
    setCurrentAmount(toMasked(goal.currentAmount || 0));
    try {
      setDate(tsToDateInput(Number(goal.date)));
    } catch {
      setDate(tsToDateInput(nowTs()));
    }
    const cat = (goal.category || "outros").toLowerCase();
    if ((DEFAULT_GOAL_CATEGORIES as readonly string[]).includes(cat)) {
      setSelectedCategory(cat);
      setShowCustomCat(false);
      setCustomCategory("");
    } else {
      setShowCustomCat(true);
      setCustomCategory(goal.category ?? "");
      setSelectedCategory(cat);
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const categoryToSave = showCustomCat ? customCategory.trim() || selectedCategory : selectedCategory;
    if (!description.trim()) {
      setErrorAlert({ title: "Erro", message: "Descrição obrigatória" });
      return;
    }
    const dto = {
      description: description.trim(),
      amount: parseMoeda(amount),
      currentAmount: parseMoeda(currentAmount),
      date: dateInputToTs(date),
      category: categoryToSave.toLowerCase(),
    };
    if (dto.amount <= 0) {
      setErrorAlert({ title: "Erro", message: "Valor da meta deve ser maior que zero" });
      return;
    }
    try {
      if (editing) await update(editing.id, dto);
      else await add(dto);
    } catch {
      setErrorAlert({ title: "Erro", message: "Verifique os campos da meta." });
      return;
    }
    setShowForm(false);
    resetForm();
    toast({ description: editing ? "Meta atualizada!" : "Meta adicionada!", variant: "success" });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteGoal) return;
    await remove(confirmDeleteGoal.id);
    setConfirmDeleteGoal(null);
    toast({ description: "Meta excluída!", variant: "success" });
  };

  const handleDepositConfirm = async (sign: 1 | -1) => {
    if (!depositGoal) return;
    const val = sign === 1 ? parseMoeda(depositAmount) : sanitizeAmount(depositAmount);
    if (val <= 0) {
      setErrorAlert({ title: "Erro", message: "Valor inválido" });
      return;
    }
    const next = Math.max(0, Number(depositGoal.currentAmount || 0) + sign * val);
    await update(depositGoal.id, { currentAmount: next });
    setDepositGoal(null);
    setDepositAmount("");
    toast({ description: sign > 0 ? "Depósito registrado!" : "Retirada registrada!", variant: "success" });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <Header title="Meta" />
      <div data-testid="hero-goals" className="mb-2 flex w-full max-w-[800px] gap-4 overflow-x-auto px-2 pb-1 mt-[-64px]">
        <div data-testid="card-total-metas" className="flex min-w-[220px] flex-1 flex-col rounded bg-white px-4 py-3 drop-shadow-lg dark:bg-gray-800">
          <div className="flex w-full flex-row items-center justify-between">
            <p className="text-xl">Total metas</p>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
          <p className="mt-6 text-2xl font-bold">{totalGoals}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeCount} ativas • {concludedCount} concluídas
          </p>
        </div>
        <div data-testid="card-valor-total" className="flex min-w-[220px] flex-1 flex-col rounded bg-white px-4 py-3 drop-shadow-lg dark:bg-gray-800">
          <div className="flex w-full flex-row items-center justify-between">
            <p className="text-xl">Valor total</p>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-6 truncate text-2xl font-bold">{formatBRL(totalAmount)}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">Soma de todas as metas</p>
        </div>
        <div data-testid="card-valor-guardado" className="flex min-w-[220px] flex-1 flex-col rounded bg-white px-4 py-3 drop-shadow-lg dark:bg-gray-800">
          <div className="flex w-full flex-row items-center justify-between">
            <p className="text-xl">Guardado</p>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <p className="mt-6 truncate text-2xl font-bold">{formatBRL(totalCurrent)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalAmount ? Math.round((totalCurrent / totalAmount) * 100) : 0}% do total
          </p>
        </div>
        <div data-testid="card-concluidas" className="flex min-w-[220px] flex-1 flex-col rounded bg-purple-700 px-4 py-3 drop-shadow-lg">
          <div className="flex w-full flex-row items-center justify-between">
            <p className="text-xl text-white">Concluídas</p>
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <p className="mt-6 text-2xl font-bold text-white">{concludedCount}</p>
          <p className="text-xs text-white">
            {totalGoals ? Math.round((concludedCount / totalGoals) * 100) : 0}% das metas
          </p>
        </div>
      </div>
      <div className="my-2 flex w-full max-w-[800px] flex-col gap-4 px-2">

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">* Totais de todas as metas cadastradas</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xl font-bold">Minhas metas</p>
            <Button
              data-testid="goals-filter-button"
              variant="outline"
              className="rounded-full border-purple-600 px-7 text-purple-700 dark:text-purple-300"
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="mr-1 h-4 w-4" /> Filtros
            </Button>
          </div>
        </div>

        {goals.length > 0 ? (
          <div className="flex items-center gap-2 rounded border bg-white px-3 focus-within:border-purple-600 dark:bg-gray-800">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <Input
              data-testid="goals-search"
              placeholder="Pesquise metas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
            {search ? (
              <button onClick={() => setSearch("")} aria-label="Limpar pesquisa">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div data-testid="goals-list" className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div data-testid="empty-goals" className="flex flex-col items-center py-8">
              <span className="mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-purple-100 dark:bg-gray-800">
                <Target className="h-9 w-9 text-purple-600 dark:text-purple-300" />
              </span>
              <p className="mb-1 text-base font-bold">Nenhuma meta encontrada</p>
              <p className="mb-4 px-6 text-center text-xs text-gray-500 dark:text-gray-400">
                {goals.length === 0
                  ? "Crie sua primeira meta financeira e comece a realizar seus objetivos"
                  : "Nenhuma meta com esse filtro"}
              </p>
              {goals.length === 0 ? (
                <Button data-testid="empty-create-goal" onClick={openAdd} className="bg-purple-600 hover:bg-purple-900">
                  <Plus className="mr-2 h-4 w-4" /> Criar meta
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Toque no cartão para editar • use os botões para depositar ou excluir
              </p>
              {filtered.map((g) => (
                <div key={g.id} data-testid={`goal-press-${g.id}`}>
                  <GoalCardView goal={g} onDeposit={setDepositGoal} onEdit={openEdit} onDelete={setConfirmDeleteGoal} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <Button
        data-testid="add-goal-button"
        aria-label="Adicionar meta"
        onClick={openAdd}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-purple-600 shadow-lg hover:bg-purple-900"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog
        open={showForm}
        onOpenChange={(v) => {
          if (!v) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
            <DialogDescription>Defina valor, prazo e categoria da meta.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Descrição</Label>
            <Input
              data-testid="input-description"
              placeholder="Ex: Viagem para Europa"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Valor da meta</Label>
            <Input
              data-testid="input-amount"
              placeholder="R$ 0,00"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(moeda(e.target.value))}
            />
          </div>
          <div>
            <Label>Valor já guardado</Label>
            <Input
              data-testid="input-currentAmount"
              placeholder="R$ 0,00"
              inputMode="numeric"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(moeda(e.target.value))}
            />
          </div>
          <div>
            <Label>Prazo</Label>
            <div className="flex items-stretch overflow-hidden rounded-xl border focus-within:border-purple-600">
              <Input
                data-testid="input-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
              <span className="flex w-14 items-center justify-center bg-purple-600">
                <Calendar className="h-5 w-5 text-white" />
              </span>
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={showCustomCat ? "__custom__" : selectedCategory}
              onValueChange={(v) => {
                if (v === "__custom__") setShowCustomCat(true);
                else {
                  setShowCustomCat(false);
                  setSelectedCategory(v);
                }
              }}
            >
              <SelectTrigger data-testid="goals-category-picker">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const opts = [...(DEFAULT_GOAL_CATEGORIES as readonly string[])];
                  if (selectedCategory && !opts.includes(selectedCategory) && !showCustomCat) opts.push(selectedCategory);
                  return opts;
                })().map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">+ Outra (personalizada)</SelectItem>
              </SelectContent>
            </Select>
            {showCustomCat ? (
              <div className="mt-2">
                <Label className="text-xs text-gray-500">Categoria personalizada</Label>
                <Input
                  data-testid="input-custom-category"
                  placeholder="Ex: moto, faculdade, casamento..."
                  maxLength={30}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex gap-2">
            {editing ? (
              <Button
                data-testid="delete-goal-button"
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setShowForm(false);
                  setConfirmDeleteGoal(editing);
                }}
              >
                Excluir
              </Button>
            ) : null}
            <Button data-testid="submit-goal-button" className="flex-1 bg-purple-600 hover:bg-purple-900" onClick={() => void handleSubmit()}>
              {editing ? "Salvar" : "Criar meta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={depositGoal !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDepositGoal(null);
            setDepositAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depositar na meta</DialogTitle>
            {depositGoal ? (
              <DialogDescription>
                {depositGoal.description} • {formatBRL(depositGoal.currentAmount || 0)} de {formatBRL(depositGoal.amount)}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div>
            <Label>Valor</Label>
            <Input
              data-testid="input-deposit-amount"
              placeholder="R$ 0,00"
              inputMode="numeric"
              value={depositAmount}
              onChange={(e) => setDepositAmount(moeda(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <Button data-testid="cancel-deposit" variant="outline" className="flex-1" onClick={() => { setDepositGoal(null); setDepositAmount(""); }}>
              Cancelar
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => void handleDepositConfirm(-1)}>
              Retirar
            </Button>
            <Button data-testid="confirm-deposit" className="flex-1 bg-purple-600 hover:bg-purple-900" onClick={() => void handleDepositConfirm(1)}>
              Depositar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteGoal !== null} onOpenChange={(v) => !v && setConfirmDeleteGoal(null)}>
        <DialogContent data-testid="delete-goal-alert">
          <DialogHeader>
            <DialogTitle>Excluir meta</DialogTitle>
            <DialogDescription>
              {confirmDeleteGoal ? `Deseja excluir "${confirmDeleteGoal.description}"?` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button data-testid="cancel-delete-goal" variant="outline" className="flex-1" onClick={() => setConfirmDeleteGoal(null)}>
              Cancelar
            </Button>
            <Button data-testid="confirm-delete-goal" className="flex-1 bg-red-600 hover:bg-red-900" onClick={() => void handleConfirmDelete()}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={errorAlert !== null} onOpenChange={(v) => !v && setErrorAlert(null)}>
        <DialogContent data-testid="error-alert">
          <DialogHeader>
            <DialogTitle>{errorAlert?.title ?? "Erro"}</DialogTitle>
            <DialogDescription>{errorAlert?.message}</DialogDescription>
          </DialogHeader>
          <Button data-testid="error-alert-ok" className="bg-purple-600 hover:bg-purple-900" onClick={() => setErrorAlert(null)}>
            OK
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
            <DialogDescription>Refine suas metas</DialogDescription>
          </DialogHeader>
          <div>
            <p className="mb-2 font-bold">Status</p>
            <div className="flex gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  data-testid={`filter-${s}`}
                  onClick={() => setFilter(s)}
                  className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${
                    selectedFilter === s ? "border-purple-600 bg-purple-600 text-white" : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold">Categoria</p>
            <div className="flex flex-wrap gap-2">
              <button
                data-testid="filter-category-Todas"
                onClick={() => setFilterCategory("Todas")}
                className={`rounded-full border px-3 py-2 text-xs ${
                  filterCategory === "Todas" ? "border-purple-600 bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                Todas
              </button>
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  data-testid={`filter-category-${cat}`}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-full border px-3 py-2 text-xs capitalize ${
                    filterCategory === cat ? "border-purple-600 bg-purple-600 text-white" : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <Button data-testid="goals-apply-filter" className="bg-purple-600 hover:bg-purple-900" onClick={() => setFilterOpen(false)}>
            Aplicar filtros <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
