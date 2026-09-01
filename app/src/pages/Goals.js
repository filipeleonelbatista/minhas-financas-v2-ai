import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Modal, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import { differenceInCalendarDays } from "date-fns";
import { goalRepo, DEFAULT_GOAL_CATEGORIES, filterGoalsByStatus, calcGoalProgress, getDaysRemaining } from "../repositories/goal";
import GoalCard from "../components/ui/GoalCard";
import Header from "../components/Header";

// Re-export for tests
export { DEFAULT_GOAL_CATEGORIES };
export function getCategoryOptions(existingGoals = []) {
  const custom = [...new Set(existingGoals.map(g => (g.category||'').toLowerCase()).filter(c => c && !DEFAULT_GOAL_CATEGORIES.includes(c) && c !== 'outros'))];
  return [...DEFAULT_GOAL_CATEGORIES, ...custom];
}

function moeda(value) {
  let v = String(value).replace(/\D/g, "");
  v = v.replace(/(\d)(\d{2})$/, "$1,$2");
  v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
  return v;
}
function parseMoeda(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}
function formatDateInput(d) {
  if (!d) return "";
  return new Date(Number(d)).toLocaleDateString("pt-BR");
}
function parseDateInput(str) {
  if (!str) return Date.now() + 30*86400000;
  const parts = str.split("/");
  if (parts.length !== 3) return Date.now() + 30*86400000;
  const [dd, mm, yyyy] = parts;
  const t = new Date(`${yyyy}-${mm}-${dd}`).getTime() + 43200000;
  return isNaN(t) ? Date.now() + 30*86400000 : t;
}

function CategoryPicker({ selected, onSelect, customValue, onCustomChange, showCustom, setShowCustom, testIDPrefix="category" }) {
  return (
    <View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">Categoria</Text>
      <View className="flex-row flex-wrap">
        {DEFAULT_GOAL_CATEGORIES.map(cat => {
          const isSelected = selected === cat && !showCustom;
          return (
            <TouchableOpacity
              key={cat}
              testID={`${testIDPrefix}-${cat}`}
              onPress={() => { setShowCustom(false); onSelect(cat); }}
              className={`px-3 py-2 rounded-full mr-2 mb-2 border ${isSelected ? 'bg-purple-600 border-purple-600' : 'bg-gray-100 border-gray-200'}`}
            >
              <Text className={`text-xs font-semibold capitalize ${isSelected ? 'text-white' : 'text-gray-700'}`}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Custom option */}
        <TouchableOpacity
          testID={`${testIDPrefix}-custom-chip`}
          onPress={() => setShowCustom(true)}
          className={`px-3 py-2 rounded-full mr-2 mb-2 border ${showCustom ? 'bg-purple-600 border-purple-600' : 'bg-white border-dashed border-purple-300'}`}
        >
          <Text className={`text-xs font-semibold ${showCustom ? 'text-white' : 'text-purple-600'}`}>+ Outra</Text>
        </TouchableOpacity>
      </View>
      {showCustom && (
        <View className="mt-2">
          <Text className="text-xs text-gray-500 mb-1">Categoria personalizada</Text>
          <TextInput
            testID="input-custom-category"
            placeholder="Ex: moto, faculdade, casamento..."
            value={customValue}
            onChangeText={onCustomChange}
            className="border border-purple-300 rounded-xl px-3 py-2 bg-white text-gray-800"
            maxLength={30}
          />
        </View>
      )}
    </View>
  );
}

export default function Goals() {
  const isFocused = useIsFocused ? useIsFocused() : true;
  let navigation = { canGoBack: () => false, goBack: () => {}, navigate: () => {}, setParams: () => {} };
  let route = { params: {} };
  try { const n = useNavigation(); if (n) navigation = n; } catch {}
  try { const r = useRoute(); if (r) route = r; } catch {}
  const [goals, setGoals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Todas');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // goal or null
  const [depositGoal, setDepositGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");

  // form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [date, setDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_GOAL_CATEGORIES[0]);
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const load = useCallback(async () => {
    const list = await goalRepo.getAll();
    setGoals(list || []);
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  // Stack navigation: abrir form via params de Dashboard (Criar meta / editar)
  useEffect(() => {
    if (!isFocused) return;
    const params = route.params;
    if (!params) return;
    if (params.openAdd) {
      const t = setTimeout(() => {
        openAdd();
        navigation.setParams({ openAdd: undefined });
      }, 250);
      return () => clearTimeout(t);
    }
    if (params.editId) {
      const target = goals.find((g) => g.id === params.editId);
      if (target) {
        const t = setTimeout(() => {
          openEdit(target);
          navigation.setParams({ editId: undefined });
        }, 250);
        return () => clearTimeout(t);
      }
    }
  }, [isFocused, goals, route.params]);

  const filtered = useMemo(() => {
    let list = filterGoalsByStatus(goals, filterStatus);
    if (filterCategory !== 'Todas') {
      const norm = filterCategory.toLowerCase();
      list = list.filter(g => (g.category||'').toLowerCase() === norm);
    }
    // sort by urgency: soonest deadline first
    return [...list].sort((a,b) => Number(a.date) - Number(b.date));
  }, [goals, filterStatus, filterCategory]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCurrentAmount("");
    setDate("");
    setSelectedCategory(DEFAULT_GOAL_CATEGORIES[0]);
    setShowCustomCat(false);
    setCustomCategory("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };
  const openEdit = (goal) => {
    setEditing(goal);
    setDescription(goal.description);
    setAmount(moeda((Number(goal.amount).toFixed(2).replace(".", ""))));
    setCurrentAmount(moeda((Number(goal.currentAmount||0).toFixed(2).replace(".", ""))));
    setDate(goal.date ? new Date(goal.date).toLocaleDateString("pt-BR") : "");
    const cat = (goal.category||'outros').toLowerCase();
    if (DEFAULT_GOAL_CATEGORIES.includes(cat)) {
      setSelectedCategory(cat);
      setShowCustomCat(false);
      setCustomCategory("");
    } else {
      setShowCustomCat(true);
      setCustomCategory(goal.category);
      setSelectedCategory(cat);
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const categoryToSave = showCustomCat ? (customCategory.trim() || selectedCategory) : selectedCategory;
    if (!description.trim()) {
      Alert.alert("Erro", "Descrição obrigatória");
      return;
    }
    const dto = {
      description: description.trim(),
      amount: parseMoeda(amount),
      currentAmount: parseMoeda(currentAmount),
      date: parseDateInput(date),
      category: categoryToSave,
    };
    if (dto.amount <= 0) {
      Alert.alert("Erro", "Valor da meta deve ser maior que zero");
      return;
    }
    if (editing) {
      await goalRepo.update(editing.id, dto);
    } else {
      await goalRepo.add(dto);
    }
    setShowForm(false);
    resetForm();
    load();
  };

  const handleDelete = async (goal) => {
    Alert.alert("Excluir meta", `Deseja excluir "${goal.description}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await goalRepo.delete(goal.id); load(); } },
    ]);
  };

  const handleDepositConfirm = async () => {
    if (!depositGoal) return;
    const val = parseMoeda(depositAmount);
    if (val <= 0) {
      Alert.alert("Erro", "Valor inválido");
      return;
    }
    const newCurrent = Number(depositGoal.currentAmount||0) + val;
    await goalRepo.update(depositGoal.id, { currentAmount: newCurrent });
    setDepositGoal(null);
    setDepositAmount("");
    load();
  };

  const categoryOptions = useMemo(() => getCategoryOptions(goals), [goals]);

  const canGoBack = navigation.canGoBack?.() ?? false;
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Header
        title="Metas"
        isLeftIconComponent={
          canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} testID="goals-back" style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 999 }}>
              <Feather name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
          ) : false
        }
      />
      <View className="px-4 pt-2">
        {/* Filters Ativas/Concluídas */}
        <View className="flex-row mb-3" testID="filter-status">
          {['Todas','Ativas','Concluídas'].map(s => (
            <TouchableOpacity
              key={s}
              testID={`filter-${s}`}
              onPress={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-full mr-2 ${filterStatus===s ? 'bg-purple-600' : 'bg-white border border-gray-200'}`}
            >
              <Text className={`text-xs font-bold ${filterStatus===s ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <TouchableOpacity testID="filter-category-Todas" onPress={() => setFilterCategory('Todas')} className={`px-3 py-1.5 rounded-full mr-2 ${filterCategory==='Todas'?'bg-purple-100 border border-purple-300':'bg-white border border-gray-200'}`}>
            <Text className="text-xs">Todas</Text>
          </TouchableOpacity>
          {categoryOptions.map(cat => (
            <TouchableOpacity
              key={cat}
              testID={`filter-category-${cat}`}
              onPress={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full mr-2 capitalize ${filterCategory===cat?'bg-purple-600':'bg-white border border-gray-200'}`}
            >
              <Text className={`text-xs capitalize ${filterCategory===cat?'text-white':'text-gray-600'}`}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <View testID="empty-goals" className="items-center py-12">
            <Feather name="target" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">Nenhuma meta encontrada</Text>
            <Text className="text-gray-400 text-xs">Crie sua primeira meta financeira</Text>
          </View>
        ) : (
          filtered.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={setDepositGoal}
              onPress={openEdit}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        testID="add-goal-button"
        onPress={openAdd}
        className="absolute bottom-6 right-6 w-14 h-14 bg-purple-600 rounded-full items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Feather name="plus" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-800 dark:text-white">{editing ? 'Editar meta' : 'Nova meta'}</Text>
              <TouchableOpacity testID="close-form" onPress={() => { setShowForm(false); resetForm(); }}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-semibold text-gray-700 mb-1">Descrição</Text>
              <TextInput
                testID="input-description"
                placeholder="Ex: Viagem para Europa"
                value={description}
                onChangeText={setDescription}
                className="border border-gray-200 rounded-xl px-3 py-2 mb-3 bg-white text-gray-800"
              />
              <Text className="text-sm font-semibold text-gray-700 mb-1">Valor da meta</Text>
              <TextInput
                testID="input-amount"
                placeholder="R$ 0,00"
                value={amount}
                onChangeText={t => setAmount(moeda(t))}
                keyboardType="numeric"
                className="border border-gray-200 rounded-xl px-3 py-2 mb-3 bg-white text-gray-800"
              />
              <Text className="text-sm font-semibold text-gray-700 mb-1">Valor já guardado</Text>
              <TextInput
                testID="input-currentAmount"
                placeholder="R$ 0,00"
                value={currentAmount}
                onChangeText={t => setCurrentAmount(moeda(t))}
                keyboardType="numeric"
                className="border border-gray-200 rounded-xl px-3 py-2 mb-3 bg-white text-gray-800"
              />
              <Text className="text-sm font-semibold text-gray-700 mb-1">Prazo (DD/MM/AAAA)</Text>
              <TextInput
                testID="input-date"
                placeholder="31/12/2026"
                value={date}
                onChangeText={setDate}
                className="border border-gray-200 rounded-xl px-3 py-2 mb-3 bg-white text-gray-800"
              />
              <CategoryPicker
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                customValue={customCategory}
                onCustomChange={setCustomCategory}
                showCustom={showCustomCat}
                setShowCustom={setShowCustomCat}
              />
              <View className="flex-row mt-6">
                {editing && (
                  <TouchableOpacity
                    testID="delete-goal-button"
                    onPress={() => { setShowForm(false); handleDelete(editing); }}
                    className="flex-1 bg-red-50 border border-red-200 rounded-xl py-3 items-center mr-2"
                  >
                    <Text className="text-red-600 font-bold">Excluir</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  testID="submit-goal-button"
                  onPress={handleSubmit}
                  className="flex-1 bg-purple-600 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold">{editing ? 'Salvar' : 'Criar meta'}</Text>
                </TouchableOpacity>
              </View>
              <View className="h-6" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Deposit Modal */}
      <Modal visible={!!depositGoal} animationType="fade" transparent>
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View className="bg-white rounded-2xl p-5">
            <Text className="text-lg font-bold text-gray-800 mb-2">Depositar na meta</Text>
            {depositGoal && (
              <Text className="text-sm text-gray-500 mb-3">{depositGoal.description} • {Number(depositGoal.currentAmount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} de {Number(depositGoal.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</Text>
            )}
            <Text className="text-sm font-semibold text-gray-700 mb-1">Valor do depósito</Text>
            <TextInput
              testID="input-deposit-amount"
              placeholder="R$ 0,00"
              value={depositAmount}
              onChangeText={t => setDepositAmount(moeda(t))}
              keyboardType="numeric"
              className="border border-gray-200 rounded-xl px-3 py-2 mb-4 bg-white text-gray-800"
            />
            <View className="flex-row">
              <TouchableOpacity testID="cancel-deposit" onPress={() => { setDepositGoal(null); setDepositAmount(""); }} className="flex-1 bg-gray-100 rounded-xl py-3 items-center mr-2">
                <Text className="text-gray-600 font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-deposit" onPress={handleDepositConfirm} className="flex-1 bg-purple-600 rounded-xl py-3 items-center">
                <Text className="text-white font-bold">Depositar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
