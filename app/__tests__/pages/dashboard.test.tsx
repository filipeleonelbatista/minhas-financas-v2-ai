jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-walkthrough-tooltip', () => {
  const ReactMod = require('react');
  const { View: RNView } = require('react-native');
  const MockTooltip = ({ isVisible, content, children, testID }: any) =>
    ReactMod.createElement(RNView, { testID: testID ?? 'tooltip-mock' }, children, isVisible ? ReactMod.createElement(RNView, { testID: 'tooltip-content-mock' }, content) : null);
  return { __esModule: true, default: MockTooltip, Tooltip: MockTooltip };
});
jest.mock('../../src/repositories/config', () => {
  let mem: any = {};
  return {
    configRepo: {
      get: jest.fn(async () => (Object.keys(mem).length ? mem : null)),
      upsert: jest.fn(async (dto: any) => { mem = { ...mem, ...dto }; return dto; }),
    },
  };
});

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

// Mock InteractivePieChart - inner pie with onSelect support
jest.mock('../../src/components/InteractivePieChart', () => ({
  __esModule: true,
  default: ({ data, onSelect, testID }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID || 'interactive-pie'}>
        <View testID="pie-mocked">
          {data.map((d: any) => (
            <Text key={d.name}>{d.name}</Text>
          ))}
        </View>
        {/* expose slice press for tests */}
        {data.map((_: any, idx: number) => (
          <TouchableOpacity key={idx} testID={`pie-slice-${idx}`} onPress={() => onSelect && onSelect(idx)} />
        ))}
      </View>
    );
  },
}));

import { render, waitFor, fireEvent, within } from '@testing-library/react-native';
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
    const { useSettingsStore } = require('../../src/stores/settings');
    useSettingsStore.setState({ isEnableTitheCard: 1, isEnableTotalHistoryCard: 1, colorModeState: 'light' });
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
    expect(getByText('Minhas Financa')).toBeTruthy();
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

  test('legenda mostra só categoria e ao clicar no gráfico/legenda mostra tooltip com valor 2 casas', async () => {
    await financeRepo.add({ description: 'Casa', amount: 123.4567, category: 'Moradia', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 });
    await financeRepo.add({ description: 'Cartão', amount: 50, category: 'Cartão', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 });
    const { getByTestId, getByText, queryByTestId } = render(<Dashboard />);
    await waitFor(() => expect(getByTestId('pizza-legend')).toBeTruthy());
    // legend shows only category, no value
    expect(getByTestId('legend-Moradia')).toBeTruthy();
    expect(getByTestId('legend-Cartão')).toBeTruthy();
    expect(queryByTestId('pizza-tooltip')).toBeFalsy();
    // click slice -> tooltip
    fireEvent.press(getByTestId('pie-slice-0'));
    await waitFor(() => expect(getByTestId('pizza-tooltip')).toBeTruthy());
    const tooltip = getByTestId('pizza-tooltip');
    expect(within(tooltip).getByText('Moradia')).toBeTruthy();
    // 123.4567 -> R$ 123,46 (2 casas)
    expect(within(tooltip).getByText(/123,46/)).toBeTruthy();
    // tooltip should not show extra decimals - not 123,456
    expect(within(tooltip).queryByText(/123,456/)).toBeFalsy();
    // click legend toggles off
    fireEvent.press(getByTestId('legend-Moradia'));
    await waitFor(() => expect(queryByTestId('pizza-tooltip')).toBeFalsy());
    // click legend again opens
    fireEvent.press(getByTestId('legend-Moradia'));
    await waitFor(() => expect(getByTestId('pizza-tooltip')).toBeTruthy());
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
