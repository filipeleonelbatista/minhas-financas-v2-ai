import { useState, useCallback } from 'react';
import { Alert, ToastAndroid } from 'react-native';
import { useMarketStore } from '../stores/market';
import { useFinanceStore } from '../stores/finance';
import { useListsStore } from '../stores/lists';
import { useSettingsStore } from '../stores/settings';

let _selectedTransaction;

export function useMarket() {
  const store = useMarketStore();
  const financeStore = useFinanceStore();
  const listsStore = useListsStore();
  const settings = useSettingsStore();
  const [localSelected, setLocalSelected] = useState(_selectedTransaction);

  const setSelectedTransaction = useCallback((v) => {
    _selectedTransaction = v;
    setLocalSelected(v);
  }, []);

  const MarketList = store.stockList;
  const filteredList = store.getFiltered();
  const listTotal = filteredList.reduce((acc, it) => acc + Number(it.amount) * Number(it.quantity), 0);
  const selectedCategory = store.selectedCategory;
  const setSelectedCategory = store.setSelectedCategory;
  const search = store.search;
  const setSearch = store.setSearch;

  const addTransaction = useCallback(async (dto) => {
    await store.add(dto);
    ToastAndroid.show("Item adicionado ao carrinho", ToastAndroid.SHORT);
  }, [store]);

  const updateTransaction = useCallback(async (dto) => {
    await store.update(dto.id, dto);
    ToastAndroid.show("Item atualizado com sucesso", ToastAndroid.SHORT);
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
            await store.remove(dto.id);
            ToastAndroid.show("Item removido do carrinho", ToastAndroid.SHORT);
          },
        },
      ]
    );
  }, [store]);

  const updateStock = useCallback(async (currentTransaction, isAdd = false, isSubtract = false) => {
    const currentQuantity = isAdd
      ? Number(currentTransaction.quantity) + 1
      : isSubtract
      ? Number(currentTransaction.quantity) - 1
      : currentTransaction.quantity;
    await store.update(currentTransaction.id, { quantity: Number(currentQuantity) });
    ToastAndroid.show("Item atualizado com sucesso", ToastAndroid.SHORT);
  }, [store]);

  const handleAddFinances = useCallback(async () => {
    const data = {
      description: "Compras",
      amount: listTotal,
      date: Date.now() + 43200000,
      category: "Mercado",
      paymentDate: "",
      paymentStatus: 0,
      isEnabled: 1,
      isFavorited: 0,
    };
    await financeStore.add(data);
  }, [financeStore, listTotal]);

  const handleAddItensOnBuyList = useCallback(async (goListsPage) => {
    Alert.alert(
      "Adicionar itens do estoque",
      "Deseja adicionar itens do estoque a uma lista de compras?",
      [
        { text: "Cancelar", style: "cancel", onPress: () => {} },
        {
          text: "Somente em falta",
          onPress: async () => {
            const lowestStockList = MarketList.filter((item) => item.quantity < item.quantityDesired);
            if (lowestStockList.length > 0) {
              const totalAmount = lowestStockList.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
              const totalQuantity = lowestStockList.reduce((acc, t) => acc + Number(t.quantity), 0);
              const createdList = {
                description: "Em falta no estoque",
                location: "",
                amount: totalAmount,
                quantity: totalQuantity,
                date: Date.now() + 43200000,
              };
              const currentId = await listsStore.addList(createdList);
              if (currentId !== null) {
                for (const item of lowestStockList) {
                  await listsStore.addItem({
                    list_id: currentId,
                    description: item.description,
                    category: item.category,
                    amount: item.amount,
                    quantity: item.quantity,
                    quantityDesired: item.quantityDesired,
                    location: createdList.location,
                    date: createdList.date,
                  });
                }
              }
              if (goListsPage) goListsPage();
            } else {
              ToastAndroid.show("Nenhum item em falta para criar esta lista", ToastAndroid.SHORT);
            }
          },
        },
        {
          text: "Todos os itens",
          onPress: async () => {
            if (MarketList.length > 0) {
              const totalAmount = MarketList.reduce((acc, t) => acc + Number(t.amount) * Number(t.quantity), 0);
              const totalQuantity = MarketList.reduce((acc, t) => acc + Number(t.quantity), 0);
              const createdList = {
                description: "Itens do estoque",
                location: "",
                amount: totalAmount,
                quantity: totalQuantity,
                date: Date.now() + 43200000,
              };
              const currentId = await listsStore.addList(createdList);
              if (currentId !== null) {
                for (const item of MarketList) {
                  await listsStore.addItem({
                    list_id: currentId,
                    description: item.description,
                    category: item.category,
                    amount: item.amount,
                    quantity: item.quantity,
                    quantityDesired: item.quantityDesired,
                    location: createdList.location,
                    date: createdList.date,
                  });
                }
              }
              if (goListsPage) goListsPage();
            } else {
              ToastAndroid.show("Nenhum item para criar esta lista", ToastAndroid.SHORT);
            }
          },
        },
      ]
    );
  }, [MarketList, listsStore]);

  // stubs for import/export – keep file-system logic via repos? For now delegate to no-op with toast
  const handleImportStock = useCallback(async () => {
    ToastAndroid.show("Importação de estoque via CSV disponível em breve", ToastAndroid.SHORT);
  }, []);

  const handleExportStock = useCallback(async () => {
    ToastAndroid.show("Exportação de estoque via CSV disponível em breve", ToastAndroid.SHORT);
  }, []);

  const loadTransactions = store.load;
  const setMarketList = useCallback((list) => {
    useMarketStore.setState({ stockList: list });
  }, []);

  return {
    MarketList,
    setMarketList,
    filteredList,
    listTotal,
    selectedCategory,
    setSelectedCategory,
    addTransaction,
    deleteTransaction,
    selectedTransaction: localSelected ?? _selectedTransaction,
    setSelectedTransaction,
    updateTransaction,
    handleAddFinances,
    handleImportStock,
    handleExportStock,
    search,
    setSearch,
    updateStock,
    handleAddItensOnBuyList,
    loadTransactions,
    stockList: MarketList,
  };
}
