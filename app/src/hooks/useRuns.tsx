// @ts-nocheck
import { useState, useCallback } from 'react';
import { Alert, ToastAndroid } from 'react-native';
import { useRunsStore } from '../stores/runs';
import { useFinanceStore } from '../stores/finance';
import { useSettingsStore } from '../stores/settings';

export function useRuns() {
  const store = useRunsStore();
  const financeStore = useFinanceStore();
  const settings = useSettingsStore();
  const [autonomy, setAutonomy] = useState(settings.veicleAutonomy);

  const FuelList = store.runsList;
  const setFuelList = useCallback((list) => {
    useRunsStore.setState({ runsList: list });
  }, []);

  const addTransaction = useCallback(async (dto) => {
    await store.add(dto);
    if (settings.willAddFuelToTransactionList) {
      const newPaymentTransaction = {
        description: `Abastecimento - ${dto.location}`,
        amount: dto.amount,
        date: dto.date,
        category: "Transporte",
        paymentDate: dto.date,
        paymentStatus: 1,
        isEnabled: 1,
        isFavorited: 0,
      };
      await financeStore.add(newPaymentTransaction);
    }
    ToastAndroid.show("Abastecimento Adicionado", ToastAndroid.SHORT);
  }, [store, financeStore, settings.willAddFuelToTransactionList]);

  const deleteTransaction = useCallback(async (dto) => {
    Alert.alert(
      "Deseja realmente deletar esse registro?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        { text: "Não", style: "cancel", onPress: () => {} },
        {
          text: "Sim",
          onPress: async () => {
            await store.remove(dto.id ?? dto);
            ToastAndroid.show("Abastecimento Removido", ToastAndroid.SHORT);
          },
        },
      ]
    );
  }, [store]);

  const handleImportRuns = useCallback(async () => {
    ToastAndroid.show("Importação de abastecimentos disponível em breve", ToastAndroid.SHORT);
  }, []);

  const handleExportRuns = useCallback(async () => {
    ToastAndroid.show("Exportação de abastecimentos disponível em breve", ToastAndroid.SHORT);
  }, []);

  const loadTransactions = store.load;

  return {
    FuelList,
    setFuelList,
    addTransaction,
    deleteTransaction,
    handleImportRuns,
    handleExportRuns,
    loadTransactions,
    runsList: FuelList,
    autonomy: settings.veicleAutonomy,
  };
}
