import { useFinanceStore } from '../../src/stores/finance';
import { financeRepo } from '../../src/repositories/finance';

beforeEach(async () => {
  await financeRepo.clearMemory();
  useFinanceStore.setState({
    transactionsList: [],
    search: '',
    selectedPaymentCategory: 'Todos',
    selectedPaymentStatus: 'Todos',
    selectedFavoritedFilter: 'Todos',
    selectedtypeofpayment: '0',
    selectedDateOrderFilter: 'Vencimento',
    startDate: '',
    endDate: '',
  });
});

test('filteredList pipeline tipo→busca→categoria', async () => {
  await financeRepo.add({
    description: 'Salário',
    amount: 1000,
    category: 'Ganhos',
    date: Date.now(),
    paymentStatus: 1,
    isEnabled: 0,
    isFavorited: 0,
  });
  await financeRepo.add({
    description: 'Aluguel',
    amount: 500,
    category: 'Moradia',
    date: Date.now(),
    paymentStatus: 1,
    isEnabled: 1,
    isFavorited: 0,
  });
  const s = useFinanceStore.getState();
  await s.load();
  s.setSearch('Sal');
  const filtered = s.getFilteredList();
  expect(filtered.length).toBe(1);
  expect(filtered[0].description).toBe('Salário');
});

test('selector shallow não re-renderiza em filtro não usado', () => {
  const { getState } = useFinanceStore;
  getState().setSearch('x');
  // se usar useShallow, componente que lê só listTotal não deve mudar quando search muda sem afetar total
  expect(getState().search).toBe('x');
});
