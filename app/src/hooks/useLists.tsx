// @ts-nocheck
import { useState, useCallback } from 'react';
import { Alert, ToastAndroid } from 'react-native';
import { useListsStore } from '../stores/lists';

let _selectedList;
let _selectedListItems = [];

export function useLists() {
  const store = useListsStore();
  const [localSelectedList, setLocalSelectedList] = useState(_selectedList);
  const [localItems, setLocalItems] = useState(_selectedListItems);

  const lists = store.lists;
  const selectedList = store.selectedList ?? localSelectedList;
  const selectedListItems = store.selectedListItems ?? localItems;
  const filteredList = store.getFilteredList();
  const listTotal = store.getListTotal();
  const search = store.search;
  const setSearch = store.setSearch;
  const selectedCategory = store.selectedCategory;
  const setSelectedCategory = store.setSelectedCategory;

  const setSelectedList = useCallback((v) => {
    _selectedList = v;
    setLocalSelectedList(v);
    useListsStore.setState({ selectedList: v });
  }, []);

  const setSelectedListItems = useCallback((v) => {
    _selectedListItems = v;
    setLocalItems(v);
    useListsStore.setState({ selectedListItems: v });
  }, []);

  const addTransaction = useCallback(async (dto) => {
    const id = await store.addList(dto);
    ToastAndroid.show(id !== null ? "Lista criada com sucesso" : "Não foi possível criar a lista", ToastAndroid.SHORT);
    return id;
  }, [store]);

  const addItemToList = useCallback(async (dto) => {
    await store.addItem(dto);
  }, [store]);

  const updateTransaction = useCallback(async (dto) => {
    // lists update via repo direct
    const { listRepo } = require('../repositories/list');
    await listRepo.update(dto.id, dto);
    await store.load();
    ToastAndroid.show("Informações da lista atualizadas com sucesso", ToastAndroid.SHORT);
  }, [store]);

  const deleteTransaction = useCallback(async (dto) => {
    Alert.alert("Deseja realmente deletar esse registro?", "Esta ação é irreversível! Deseja continuar?", [
      { text: "Não", style: "cancel", onPress: () => {} },
      {
        text: "Sim",
        onPress: async () => {
          // historical bug: delete stock instead of list – keep as lists delete
          await store.deleteList(dto.id ?? dto);
          ToastAndroid.show("Item removido", ToastAndroid.SHORT);
        },
      },
    ]);
  }, [store]);

  const deleteItemToList = useCallback(async (dto) => {
    Alert.alert("Deseja realmente deletar esse registro?", "Esta ação é irreversível! Deseja continuar?", [
      { text: "Não", style: "cancel", onPress: () => {} },
      {
        text: "Sim",
        onPress: async () => {
          const { listRepo } = require('../repositories/list');
          await listRepo.deleteItem(dto.id);
          await store.handleSelect(dto.list_id);
          await store.load();
          ToastAndroid.show("Item removido do carrinho", ToastAndroid.SHORT);
        },
      },
    ]);
  }, [store]);

  const updateItemToList = useCallback(async (dto) => {
    const { listRepo } = require('../repositories/list');
    await listRepo.updateItem(dto.id, dto);
    await store.handleSelect(dto.list_id);
    await store.load();
  }, [store]);

  const updateItemQuantityToList = useCallback(async (dto, isAdd = false, isSubtract = false) => {
    const currentQuantity = isAdd ? dto.quantity + 1 : isSubtract ? dto.quantity - 1 : dto.quantity;
    await store.updateQuantity(dto, isAdd);
  }, [store]);

  const handleSelectList = useCallback(async (id) => {
    await store.handleSelect(id);
    _selectedList = useListsStore.getState().selectedList;
    _selectedListItems = useListsStore.getState().selectedListItems;
    setLocalSelectedList(_selectedList);
    setLocalItems(_selectedListItems);
  }, [store]);

  const handleDeleteList = useCallback(async (id, goBack) => {
    Alert.alert("Deseja realmente deletar esse registro?", "Esta ação é irreversível! Deseja continuar?", [
      { text: "Não", style: "cancel", onPress: () => {} },
      {
        text: "Sim",
        onPress: async () => {
          await store.deleteList(id);
          ToastAndroid.show("Lista excluida", ToastAndroid.SHORT);
          if (goBack) goBack();
        },
      },
    ]);
  }, [store]);

  const handleExportList = useCallback(async (id) => {
    ToastAndroid.show("Exportação de lista disponível em breve", ToastAndroid.SHORT);
  }, []);

  const handleImportList = useCallback(async () => {
    ToastAndroid.show("Importação de lista disponível em breve", ToastAndroid.SHORT);
  }, []);

  const loadTransactions = store.load;

  return {
    lists,
    addTransaction,
    deleteTransaction,
    selectedList,
    setSelectedList,
    updateTransaction,
    addItemToList,
    updateItemToList,
    deleteItemToList,
    handleSelectList,
    handleDeleteList,
    selectedListItems,
    setSelectedListItems,
    listTotal,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    filteredList,
    updateItemQuantityToList,
    handleExportList,
    loadTransactions,
    handleImportList,
  };
}
