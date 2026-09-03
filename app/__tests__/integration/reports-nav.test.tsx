import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import Dashboard from '../../src/pages/Dashboard';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../src/repositories/finance', () => ({ financeRepo: { getAll: jest.fn().mockResolvedValue([]) }, calcTithePure: jest.fn().mockReturnValue(0) }));
jest.mock('../../src/repositories/goal', () => ({ goalRepo: { getAll: jest.fn().mockResolvedValue([]) } }));
jest.mock('../../src/repositories/config', () => ({
  configRepo: { get: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
}));
describe('Reports nav', () => {
  test('Dashboard has CTA Ver Relatórios', async () => {
    const { getByTestId } = render(<NavigationContainer><Dashboard /></NavigationContainer>);
    await waitFor(() => expect(getByTestId('cta-ver-relatorios')).toBeTruthy());
  });
});
