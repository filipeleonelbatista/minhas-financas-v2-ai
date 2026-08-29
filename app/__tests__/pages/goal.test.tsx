import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { goalRepo, DEFAULT_GOAL_CATEGORIES } from '../../src/repositories/goal';
import GoalCard from '../../src/components/ui/GoalCard';

// Mock navigation
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

// Mock expo vector icons to avoid native deps
jest.mock('@expo/vector-icons', () => ({
  Feather: ({ name }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

import Goals, { getCategoryOptions } from '../../src/pages/Goals';

describe('GoalCard progress + prazo + CTA', () => {
  test('render progress bar + prazo Restam X dias + CTA reacticx fallback', () => {
    const now = Date.now();
    const goal = { id: '1', description: 'Viagem Japão', amount: 10000, currentAmount: 2500, date: now + 10*86400000, category: 'viagem', icon: 'map-pin' };
    const onDeposit = jest.fn();
    const { getByTestId, getByText } = render(<GoalCard goal={goal} onDeposit={onDeposit} />);
    expect(getByTestId('goal-card-1')).toBeTruthy();
    expect(getByText('Viagem Japão')).toBeTruthy();
    expect(getByTestId('goal-prazo-1').props.children).toMatch(/Restam 10 dias/);
    expect(getByTestId('goal-cta-1')).toBeTruthy();
    // progress 25%
    expect(getByText('25%')).toBeTruthy();
    fireEvent.press(getByTestId('goal-cta-1'));
    expect(onDeposit).toHaveBeenCalled();
  });

  test('concluída mostra badge e sem CTA', () => {
    const goal = { id: '2', description: 'Carro', amount: 5000, currentAmount: 5000, date: Date.now()+5*86400000, category: 'carro' };
    const { getByTestId, queryByTestId } = render(<GoalCard goal={goal} onDeposit={jest.fn()} />);
    expect(getByTestId('goal-concluded-2')).toBeTruthy();
    expect(queryByTestId('goal-cta-2')).toBeNull();
  });

  test('custom category moto usa tag icon', () => {
    const goal = { id: '3', description: 'Moto', amount: 8000, currentAmount: 1000, date: Date.now()+20*86400000, category: 'moto', icon: 'tag' };
    const { getByTestId } = render(<GoalCard goal={goal} />);
    expect(getByTestId('icon-tag')).toBeTruthy();
  });
});

describe('goal custom categories integration', () => {
  beforeEach(async () => {
    await goalRepo.clearMemory();
  });

  test('goalRepo persiste custom category moto', async () => {
    const g = await goalRepo.add({ description: 'Moto custom', amount: 8000, currentAmount: 0, date: Date.now()+30*86400000, category: 'moto' });
    expect(g.category).toBe('moto');
    const all = await goalRepo.getAll();
    expect(all[0].category).toBe('moto');
  });

  test('getCategoryOptions inclui defaults + custom existentes', () => {
    const opts = getCategoryOptions([{ category: 'moto' } as any, { category: 'viagem' } as any]);
    expect(opts).toEqual(expect.arrayContaining(['viagem','carro','moto']));
    expect(opts.filter(c=> DEFAULT_GOAL_CATEGORIES.includes(c as any)).length).toBe(DEFAULT_GOAL_CATEGORIES.length);
  });

  test('Goals page render lista + form custom category', async () => {
    await goalRepo.add({ id: 'g1', description: 'Viagem', amount: 1000, currentAmount: 100, date: Date.now()+10*86400000, category: 'viagem' });
    await goalRepo.add({ id: 'g2', description: 'Moto dos sonhos', amount: 15000, currentAmount: 3000, date: Date.now()+40*86400000, category: 'moto' });

    const { getByTestId, getByText, queryByText, findByText } = render(<Goals />);
    // wait load
    await waitFor(() => expect(getByText('Viagem')).toBeTruthy());
    expect(getByText('Moto dos sonhos')).toBeTruthy();

    // filter chip custom appears
    expect(getByTestId('filter-category-moto')).toBeTruthy();

    // open add form
    fireEvent.press(getByTestId('add-goal-button'));
    await waitFor(() => expect(getByTestId('input-description')).toBeTruthy());

    // select custom chip + type custom
    fireEvent.press(getByTestId('category-custom-chip'));
    const customInput = getByTestId('input-custom-category');
    fireEvent.changeText(customInput, 'faculdade');

    fireEvent.changeText(getByTestId('input-description'), 'Faculdade');
    fireEvent.changeText(getByTestId('input-amount'), '20.000,00');
    fireEvent.changeText(getByTestId('input-date'), '31/12/2026');

    // create
    fireEvent.press(getByTestId('submit-goal-button'));
    await waitFor(async () => {
      const all = await goalRepo.getAll();
      expect(all.find(g=> g.description==='Faculdade')?.category).toBe('faculdade');
    });
  });

  test('Goals page filtra Ativas/Concluídas', async () => {
    await goalRepo.add({ description: 'Ativa', amount: 1000, currentAmount: 100, date: Date.now()+10*86400000, category: 'casa' });
    await goalRepo.add({ description: 'Concluida', amount: 1000, currentAmount: 1000, date: Date.now()+10*86400000, category: 'reserva' });
    const { getByTestId, getByText, queryByText } = render(<Goals />);
    await waitFor(() => expect(getByText('Ativa')).toBeTruthy());
    fireEvent.press(getByTestId('filter-Concluídas'));
    await waitFor(() => expect(queryByText('Ativa')).toBeNull());
    expect(getByText('Concluida')).toBeTruthy();
    fireEvent.press(getByTestId('filter-Ativas'));
    await waitFor(() => expect(getByText('Ativa')).toBeTruthy());
    expect(queryByText('Concluida')).toBeNull();
  });
});
