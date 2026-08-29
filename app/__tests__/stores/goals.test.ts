import { useGoalsStore, DEFAULT_GOAL_CATEGORIES as STORE_CATEGORIES, normalizeCategory as storeNormalize, calcGoalProgress as storeCalc } from '../../src/stores/goals';
import { goalRepo, DEFAULT_GOAL_CATEGORIES, normalizeCategory, calcGoalProgress } from '../../src/repositories/goal';
import * as goalsStoreMod from '../../src/stores/goals';

beforeEach(async () => {
  await goalRepo.clearMemory();
  useGoalsStore.setState({
    goals: [],
    selectedFilter: 'Todas',
    search: '',
  } as any);
});

test('re-exports DEFAULT_GOAL_CATEGORIES, normalizeCategory, calcGoalProgress', () => {
  expect(DEFAULT_GOAL_CATEGORIES).toContain('viagem');
  expect(DEFAULT_GOAL_CATEGORIES).toContain('casa');
  expect(typeof normalizeCategory).toBe('function');
  expect(typeof calcGoalProgress).toBe('function');
  // store should re-export
  expect((goalsStoreMod as any).DEFAULT_GOAL_CATEGORIES).toEqual(DEFAULT_GOAL_CATEGORIES);
  expect(STORE_CATEGORIES).toEqual(DEFAULT_GOAL_CATEGORIES);
  expect(typeof storeNormalize).toBe('function');
  expect(typeof storeCalc).toBe('function');
  expect(storeNormalize('  VIAGEM ')).toBe(normalizeCategory('  VIAGEM '));
  expect(storeCalc({ amount: 100, currentAmount: 50 })).toBe(0.5);
});

test('load initially empty and add goal', async () => {
  const s = useGoalsStore.getState();
  await s.load();
  expect(s.goals.length).toBe(0);

  await s.add({
    description: 'Viagem Japão',
    amount: 10000,
    currentAmount: 2500,
    date: Date.now() + 30 * 86400000,
    category: 'viagem',
  });

  const list = useGoalsStore.getState().goals;
  expect(list.length).toBe(1);
  expect(list[0].description).toBe('Viagem Japão');
  expect(list[0].amount).toBe(10000);
  expect(list[0].currentAmount).toBe(2500);
  // category normalized
  expect(normalizeCategory(list[0].category)).toBe('viagem');
});

test('update goal', async () => {
  await useGoalsStore.getState().add({
    description: 'Carro',
    amount: 50000,
    currentAmount: 10000,
    date: Date.now() + 60 * 86400000,
    category: 'carro',
  });
  const id = useGoalsStore.getState().goals[0].id;
  await useGoalsStore.getState().update(id, { currentAmount: 20000 });
  const updated = useGoalsStore.getState().goals[0];
  expect(updated.currentAmount).toBe(20000);
  expect(calcGoalProgress(updated)).toBe(0.4);
});

test('delete goal', async () => {
  await useGoalsStore.getState().add({
    description: 'Computador',
    amount: 5000,
    currentAmount: 5000,
    date: Date.now() + 15 * 86400000,
    category: 'computador',
  });
  await useGoalsStore.getState().add({
    description: 'Reserva',
    amount: 2000,
    currentAmount: 500,
    date: Date.now() + 20 * 86400000,
    category: 'reserva',
  });
  expect(useGoalsStore.getState().goals.length).toBe(2);
  const id = useGoalsStore.getState().goals[0].id;
  // support both delete and remove aliases
  const state: any = useGoalsStore.getState();
  if (typeof state.delete === 'function') {
    await state.delete(id);
  } else if (typeof state.remove === 'function') {
    await state.remove(id);
  } else {
    throw new Error('no delete/remove method');
  }
  expect(useGoalsStore.getState().goals.length).toBe(1);
  const all = await goalRepo.getAll();
  expect(all.length).toBe(1);
});

test('filteredGoals Todas/Ativas/Concluídas', async () => {
  // ativa: progress <1, concluída: progress >=1
  await useGoalsStore.getState().add({
    description: 'Ativa 1',
    amount: 1000,
    currentAmount: 200,
    date: Date.now() + 30 * 86400000,
    category: 'viagem',
  });
  await useGoalsStore.getState().add({
    description: 'Concluída',
    amount: 1000,
    currentAmount: 1000,
    date: Date.now() + 30 * 86400000,
    category: 'casa',
  });
  await useGoalsStore.getState().add({
    description: 'Ativa 2',
    amount: 500,
    currentAmount: 0,
    date: Date.now() + 30 * 86400000,
    category: 'investimento',
  });

  // helper to get filtered via either method
  const getFiltered = () => {
    const s: any = useGoalsStore.getState();
    if (typeof s.getFilteredGoals === 'function') return s.getFilteredGoals();
    if (Array.isArray(s.filteredGoals)) return s.filteredGoals;
    // fallback: compute via calcGoalProgress
    return s.goals.filter((g: any) => calcGoalProgress(g) < 1);
  };

  // default Todas
  expect(getFiltered().length).toBe(3);

  const s: any = useGoalsStore.getState();
  if (typeof s.setFilter === 'function') {
    s.setFilter('Ativas');
  } else if (typeof s.setSelectedFilter === 'function') {
    s.setSelectedFilter('Ativas');
  } else if (typeof s.setSelectedFilter !== 'function' && 'selectedFilter' in s) {
    useGoalsStore.setState({ selectedFilter: 'Ativas' } as any);
  }
  const ativas = getFiltered();
  expect(ativas.length).toBe(2);
  expect(ativas.every((g: any) => calcGoalProgress(g) < 1)).toBe(true);

  const s2: any = useGoalsStore.getState();
  if (typeof s2.setFilter === 'function') {
    s2.setFilter('Concluídas');
  } else if (typeof s2.setSelectedFilter === 'function') {
    s2.setSelectedFilter('Concluídas');
  } else {
    useGoalsStore.setState({ selectedFilter: 'Concluídas' } as any);
  }
  const concluidas = getFiltered();
  expect(concluidas.length).toBe(1);
  expect(concluidas[0].description).toBe('Concluída');

  // back to Todas
  const s3: any = useGoalsStore.getState();
  if (typeof s3.setFilter === 'function') s3.setFilter('Todas');
  else if (typeof s3.setSelectedFilter === 'function') s3.setSelectedFilter('Todas');
  else useGoalsStore.setState({ selectedFilter: 'Todas' } as any);
  expect(getFiltered().length).toBe(3);
});

test('normalizeCategory trims, lowercases and maps ferias', () => {
  expect(normalizeCategory('  VIAGEM ')).toBe('viagem');
  expect(normalizeCategory('FÉRIAS')).toBe('férias');
  expect(normalizeCategory('ferias')).toBe('férias');
  expect(normalizeCategory('')).toBe('outros');
  expect(normalizeCategory('  Custom Category  ')).toBe('custom category');
});

test('calcGoalProgress clamps 0..1', () => {
  expect(calcGoalProgress({ amount: 100, currentAmount: 50 })).toBe(0.5);
  expect(calcGoalProgress({ amount: 100, currentAmount: 150 })).toBe(1);
  expect(calcGoalProgress({ amount: 100, currentAmount: -10 })).toBe(0);
  expect(calcGoalProgress({ amount: 0, currentAmount: 10 })).toBe(0);
  expect(calcGoalProgress(null)).toBe(0);
});

test('load reflects repo state', async () => {
  await goalRepo.add({
    description: 'Casa própria',
    amount: 200000,
    currentAmount: 50000,
    date: Date.now() + 90 * 86400000,
    category: 'casa',
  });
  await useGoalsStore.getState().load();
  expect(useGoalsStore.getState().goals.length).toBe(1);
  expect(useGoalsStore.getState().goals[0].description).toBe('Casa própria');
});
