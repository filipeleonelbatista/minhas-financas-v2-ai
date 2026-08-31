import { useState, useCallback } from 'react';
import { Alert, ToastAndroid } from 'react-native';
import { useGoalsStore } from '../stores/goals';

let _selectedTransaction;

export function useGoals() {
  const store = useGoalsStore();
  const [localSelected, setLocalSelected] = useState(_selectedTransaction);

  const setSelectedTransaction = useCallback((v) => {
    _selectedTransaction = v;
    setLocalSelected(v);
  }, []);

  const GoalsList = store.goals;
  const setGoalsList = useCallback((list) => {
    useGoalsStore.setState({ goals: list });
  }, []);

  const addTransaction = useCallback(async (dto) => {
    await store.add(dto);
    ToastAndroid.show("Meta Adicionada", ToastAndroid.SHORT);
  }, [store]);

  const updateTransaction = useCallback(async (dto) => {
    await store.update(dto.id, dto);
    ToastAndroid.show("Meta Atualizada", ToastAndroid.SHORT);
  }, [store]);

  const deleteTransaction = useCallback(async (dto) => {
    Alert.alert(
      "Deseja realmente deletar esse registro?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        { text: "Não", style: "cancel", onPress: () => {} },
        {
          text: "Sim",
          onPress: async () => {
            await store.delete(dto.id);
            ToastAndroid.show("Meta Removida", ToastAndroid.SHORT);
          },
        },
      ]
    );
  }, [store]);

  return {
    GoalsList,
    setGoalsList,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    selectedTransaction: localSelected ?? _selectedTransaction,
    setSelectedTransaction,
    goals: GoalsList,
    filteredGoals: store.getFilteredGoals(),
  };
}
