import { calcHeroValues, getExpensesByCategory, getLast6MonthsLineData, getUrgentGoals, calcGoalProgress } from '../../src/pages/Dashboard';
import { financeRepo } from '../../src/repositories/finance';
import { goalRepo } from '../../src/repositories/goal';

// Mock navigation hooks before importing component
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Mock Header to avoid native-base provider complexity
jest.mock('../../src/components/Header', () => ({
  __esModule: true,
  default: ({ title }: any) => {
    const { Text } = require('react-native');
    return <Text testID="header-mock">{title}</Text>;
  },
}));

// Mock chart-kit to simple view
jest.mock('react-native-chart-kit', () => ({
  PieChart: ({ data }: any) => {
    const { View, Text } = require('react-native');
    return <View testID="pie-mocked">{data.map((d: any) => <Text key={d.name}>{d.name}</Text>)}</View>;
  },
  LineChart: ({ data }: any) => {
    const { View, Text } = require('react-native');
    return <View testID="line-mocked"><Text>{data.labels.join(',')}</Text></View>;
  },
}));

import { render, waitFor } from '@testing-library/react-native';
import Dashboard from '../../src/pages/Dashboard';
import React from 'react';

describe('Dashboard pure helpers', () => {
  test('calcHeroValues Saldo/Entradas/Saídas/Dízimo', () => {
    const list = [
      { id: '1', description: 'Salário', amount: 2000, category: 'Ganhos', date: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: '2', description: 'Aluguel', amount: 800, category: 'Moradia', date: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
      { id: '3', description: 'Mercado', amount: 200, category: 'Mercado', date: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    ] as any;
    const hero = calcHeroValues(list);
    expect(hero.Incomings).toBe(2000);
    expect(hero.Expenses).toBe(1000);
    expect(hero.Saldo).toBe(1000);
    expect(hero.Tithe).toBe(200); // 10% de 2000
  });

  test('getExpensesByCategory pizza gastos por categoria', () => {
    const list = [
      { id: '1', description: 'Aluguel', amount: 500, category: 'Moradia', date: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
      { id: '2', description: 'Cartão', amount: 300, category: 'Cartão', date: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
      { id: '3', description: 'Salário', amount: 1000, category: 'Ganhos', date: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;
    const data = getExpensesByCategory(list);
    expect(data.length).toBe(2);
    expect(data[0].name).toBe('Moradia'); // maior primeiro
    expect(data.find(d => d.name === 'Ganhos')).toBeUndefined(); // entradas não entram
  });

  test('getLast6MonthsLineData retorna 6 labels e datasets', () => {
    const now = Date.now();
    const list = [
      { id: '1', description: 'Salário', amount: 1000, category: 'Ganhos', date: now, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;
    const res = getLast6MonthsLineData(list);
    expect(res.labels.length).toBe(6);
    expect(res.incomings.length).toBe(6);
    expect(res.expenses.length).toBe(6);
    expect(res.net.length).toBe(6);
    // último mês deve ter 1000
    expect(res.incomings[5]).toBe(1000);
  });

  test('getUrgentGoals filtra ≤30 dias e ordena', () => {
    const now = Date.now();
    const goals = [
      { id: '1', description: 'Viagem', amount: 1000, currentAmount: 200, date: now + 5 * 86400000 },
      { id: '2', description: 'Carro', amount: 5000, currentAmount: 1000, date: now + 60 * 86400000 },
      { id: '3', description: 'Curso', amount: 500, currentAmount: 500, date: now + 10 * 86400000 },
      { id: '4', description: 'Passada', amount: 300, currentAmount: 100, date: now - 5 * 86400000 },
    ] as any;
    const urgent = getUrgentGoals(goals);
    expect(urgent.length).toBe(2);
    expect(urgent[0].id).toBe('1'); // 5 dias primeiro
    expect(urgent[1].id).toBe('3');
  });

  test('calcGoalProgress 0-1 clamp', () => {
    expect(calcGoalProgress({ amount: 1000, currentAmount: 500 } as any)).toBe(0.5);
    expect(calcGoalProgress({ amount: 1000, currentAmount: 1500 } as any)).toBe(1);
    expect(calcGoalProgress({ amount: 0, currentAmount: 100 } as any)).toBe(0);
  });
});

describe('Dashboard component Início com hero + pizza/linha + metas', () => {
  beforeEach(async () => {
    if (financeRepo.clearMemory) await financeRepo.clearMemory();
    if (goalRepo.clearMemory) await goalRepo.clearMemory();
  });

  test('render hero Saldo/Entradas/Saídas/Dízimo', async () => {
    await financeRepo.add({ description: 'Salário', amount: 2000, category: 'Ganhos', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 });
    await financeRepo.add({ description: 'Aluguel', amount: 800, category: 'Moradia', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 });

    const { getByTestId, getByText } = render(<Dashboard />);

    await waitFor(() => expect(getByTestId('card-saldo')).toBeTruthy());
    expect(getByTestId('card-entradas')).toBeTruthy();
    expect(getByTestId('card-saidas')).toBeTruthy();
    expect(getByTestId('card-dizimo')).toBeTruthy();
    expect(getByTestId('pizza-title')).toBeTruthy();
    expect(getByTestId('line-title')).toBeTruthy();
    expect(getByTestId('goals-title')).toBeTruthy();
    expect(getByText('Início')).toBeTruthy();
  });

  test('pizza e linha exibem quando há dados, senão empty', async () => {
    // empty state
    const { getByTestId: get1, unmount } = render(<Dashboard />);
    await waitFor(() => expect(get1('pizza-empty')).toBeTruthy());
    expect(get1('line-empty')).toBeTruthy();
    unmount();

    // with data, pie mocked should appear
    await financeRepo.add({ description: 'Mercado', amount: 300, category: 'Mercado', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 });
    const { getByTestId: get2 } = render(<Dashboard />);
    await waitFor(() => expect(get2('pie-mocked')).toBeTruthy());
    expect(get2('line-mocked')).toBeTruthy();
  });

  test('metas urgentes aparecem ≤30 dias', async () => {
    const now = Date.now();
    await goalRepo.add({ description: 'Viagem Urgente', amount: 1000, currentAmount: 300, date: now + 7 * 86400000, icon: 'target', category: 'viagem' });
    await goalRepo.add({ description: 'Longa', amount: 5000, currentAmount: 0, date: now + 90 * 86400000, icon: 'target', category: 'outros' });

    const { getByTestId, getByText } = render(<Dashboard />);
    await waitFor(() => expect(getByTestId('goals-list')).toBeTruthy());
    expect(getByText('Viagem Urgente')).toBeTruthy();
    expect(getByText(/Restam 7 dias|Restam 6 dias/)).toBeTruthy(); // tolerance day diff
  });
});
