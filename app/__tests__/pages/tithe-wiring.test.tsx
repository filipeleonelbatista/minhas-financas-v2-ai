import { getMonthlyTithePreview, validateTithePercent } from '../../src/repositories/tithe';
import { financeRepo } from '../../src/repositories/finance';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../src/repositories/config', () => {
  let mem: any = {};
  return {
    configRepo: {
      get: jest.fn(async () => (Object.keys(mem).length ? mem : null)),
      upsert: jest.fn(async (dto: any) => { mem = { ...mem, ...dto }; return dto; }),
    },
  };
});
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../src/components/Header', () => ({
  __esModule: true,
  default: ({ title }: any) => {
    const { Text } = require('react-native');
    return <Text testID="header-mock">{title}</Text>;
  },
}));
jest.mock('../../src/components/AIComponent', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/EditItemForm', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/SwipeableFinanceRow', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));
jest.mock('../../src/components/ui/FinanceCard', () => ({
  __esModule: true,
  default: ({ item }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`finance-card-${item.id}`}>{item.description}</Text>;
  },
}));
jest.mock('../../src/components/ui/ThemedAlert', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/ui/ThemedPicker', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/nativewindui/Sheet', () => ({
  Sheet: () => null,
  useSheetRef: () => ({ current: null }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import Finances from '../../src/pages/Finances';
import { useFinanceStore } from '../../src/stores/finance';

describe('tithe wiring', () => {
  test('validateTithePercent clamps 1-100 step 0.5', () => {
    expect(validateTithePercent(0)).toBe(1);
    expect(validateTithePercent(10.3)).toBe(10.5);
    expect(validateTithePercent(101)).toBe(100);
  });
  test('getMonthlyTithePreview with custom base', () => {
    const finances = [
      { amount: 1000, category: 'Ganhos', isEnabled: 0, date: Date.now() },
      { amount: 500, category: 'Investimentos', isEnabled: 0, date: Date.now() },
      { amount: 200, category: 'Moradia', isEnabled: 1, date: Date.now() },
    ];
    const p = getMonthlyTithePreview(finances, 10, ['Ganhos']);
    expect(p.amount).toBe(100);
  });
});

describe('finances-tithe-monthly card', () => {
  beforeEach(async () => {
    if (financeRepo.clearMemory) await financeRepo.clearMemory();
    const { useSettingsStore } = require('../../src/stores/settings');
    useSettingsStore.setState({
      isTitheMenuEnabled: 1,
      isEnableTitheCard: 1,
      tithePercent: 10,
      titheCategories: JSON.stringify(['Ganhos']),
      colorModeState: 'light',
    });
  });

  test('shows monthly tithe card with Configurar/Pagar when menu enabled', async () => {
    await financeRepo.add({ description: 'Salário', amount: 1000, category: 'Ganhos', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 });
    await useFinanceStore.getState().load();
    const { getByTestId } = render(<Finances />);
    await waitFor(() => expect(getByTestId('finances-tithe-monthly')).toBeTruthy());
    expect(getByTestId('finances-tithe-config')).toBeTruthy();
    expect(getByTestId('finances-tithe-pay')).toBeTruthy();
  });

  test('hides monthly tithe card when menu disabled', async () => {
    const { useSettingsStore } = require('../../src/stores/settings');
    useSettingsStore.setState({ isTitheMenuEnabled: 0 });
    const { queryByTestId } = render(<Finances />);
    await waitFor(() => expect(queryByTestId('header-mock')).toBeTruthy());
    expect(queryByTestId('finances-tithe-monthly')).toBeFalsy();
  });
});
