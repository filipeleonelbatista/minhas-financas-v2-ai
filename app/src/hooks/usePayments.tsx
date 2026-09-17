// @ts-nocheck
import { useState, useCallback } from 'react';
import { Alert, ToastAndroid } from 'react-native';
import { useFinanceStore } from '../stores/finance';
import { useSettingsStore } from '../stores/settings';

const categoriesList = [
  "Todos",
  "Outros",
  "Bares e Restaurantes",
  "Beleza",
  "Cartão",
  "Emergência",
  "Estudos",
  "Ganhos",
  "Investimentos",
  "Mercado",
  "Moradia",
  "Saúde",
  "Streaming",
  "TV/Internet/Telefone",
  "Transporte",
  "Vestuário",
];

const filterLabels = [
  "Este mês",
  "Próximo mês",
  "Esta semana",
  "Próxima semana",
  "Em duas semanas",
  "Em três semanas",
  "Em quatro semanas",
  "Semana passada",
  "Duas semanas atrás",
  "Três semanas atrás",
  "Quatro semanas atrás",
  "Mês passado",
  "Todos",
];

const pamentStatusLabel = ["Todos", "Pago", "Não Pago"];
const dateOrderOptions = ["Vencimento", "Pagamento"];
const favoritedFilterLabel = ["Todos", "Favoritos", "Não favoritados"];

// module-level selectedTransaction shared across hook instances (mimics context singleton)
let _selectedTransaction;
let _setSelectedTransactionRef = null;

export function usePayments() {
  const store = useFinanceStore();
  const settings = useSettingsStore();
  const [localSelected, setLocalSelected] = useState(_selectedTransaction);

  // keep module-level in sync
  const setSelectedTransaction = useCallback((v) => {
    _selectedTransaction = v;
    setLocalSelected(v);
    if (_setSelectedTransactionRef) _setSelectedTransactionRef(v);
  }, []);

  // expose filteredList and derived totals via store getters (reactive via store subscription)
  const transactionsList = store.transactionsList;
  const filteredList = store.getFilteredList();
  const listTotal = store.getListTotal();
  const Saldo = store.getSaldo();
  const Incomings = store.getIncomings();
  const Expenses = store.getExpenses();
  const Total = listTotal;
  const Tithe = store.getTithe({
    percent: 10,
    categories: settings.titheCategories ? settings.titheCategories.split(',') : undefined,
    prefix: settings.prefixTithe,
    willUsePrefix: !!settings.willUsePrefixToRemoveTihteSum,
  });

  const addTransaction = useCallback(async (dto) => {
    await store.add(dto);
    ToastAndroid.show("Transação Adicionada", ToastAndroid.SHORT);
  }, [store]);

  const updateTransaction = useCallback(async (dto) => {
    const id = dto.id;
    if (!id) return;
    await store.update(id, dto);
    ToastAndroid.show("Transação Atualizada", ToastAndroid.SHORT);
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
            await store.remove(dto);
            ToastAndroid.show("Transação Removida", ToastAndroid.SHORT);
          },
        },
      ]
    );
  }, [store]);

  const importTransactions = useCallback(async (list) => {
    for (const item of list) {
      await store.add(item);
    }
    ToastAndroid.show("Importação feita com sucesso", ToastAndroid.SHORT);
  }, [store]);

  const handleFavorite = useCallback(async (dto) => {
    await store.handleFavorite(dto);
    ToastAndroid.show(
      (!dto.isFavorited ? "Removido" : "Adicionado") + " aos favoritos",
      ToastAndroid.SHORT
    );
  }, [store]);

  // filter setters mapping
  const selectedtypeofpayment = store.selectedtypeofpayment;
  const setselectedtypeofpayment = store.setSelectedType;
  const selectedPaymentCategory = store.selectedPaymentCategory;
  const setSelectedPaymentCategory = store.setSelectedCategory;
  const selectedPaymentStatus = store.selectedPaymentStatus;
  const setSelectedPaymentStatus = store.setSelectedStatus;
  const selectedFavoritedFilter = store.selectedFavoritedFilter;
  const setSelectedFavoritedFilter = store.setSelectedFavorited;
  const selectedDateOrderFilter = store.selectedDateOrderFilter;
  const setSelectedDateOrderFilter = store.setSelectedOrder;
  const search = store.search;
  const setSearch = store.setSearch;
  const startDate = store.startDate;
  const endDate = store.endDate;
  const setStartDate = useCallback((v) => store.setPeriod(v, store.endDate), [store]);
  const setEndDate = useCallback((v) => store.setPeriod(store.startDate, v), [store]);
  const setPeriod = store.setPeriod;

  // legacy period state (Este mês etc) – keep local
  const [selectedPeriod, setSelectedPeriod] = useState("Este mês");

  const loadTransactions = store.load;
  const setTransactionsList = useCallback((list) => {
    useFinanceStore.setState({ transactionsList: list });
  }, []);

  return {
    transactionsList,
    setTransactionsList,
    Incomings,
    Expenses,
    Total,
    Tithe,
    Saldo,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    selectedTransaction: localSelected ?? _selectedTransaction,
    setSelectedTransaction,
    filteredList,
    listTotal,
    selectedtypeofpayment,
    setselectedtypeofpayment,
    selectedPeriod,
    setSelectedPeriod,
    filterLabels,
    importTransactions,
    pamentStatusLabel,
    selectedPaymentStatus,
    setSelectedPaymentStatus,
    selectedDateOrderFilter,
    setSelectedDateOrderFilter,
    dateOrderOptions,
    handleFavorite,
    selectedFavoritedFilter,
    setSelectedFavoritedFilter,
    favoritedFilterLabel,
    categoriesList,
    selectedPaymentCategory,
    setSelectedPaymentCategory,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    setPeriod,
    loadTransactions,
  };
}
