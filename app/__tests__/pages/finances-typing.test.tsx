import { filterFinances } from '../../src/repositories/finance';
import type { FinanceRow } from '../../src/repositories/finance';

test('filterFinances typed with FinanceRow', () => {
  const rows: FinanceRow[] = [{ id: '1', description: 'Salário', amount: 100, category: 'Ganhos', date: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0, paymentDate: null } as FinanceRow];
  expect(filterFinances(rows as FinanceRow[], { tipo: '1' }).length).toBe(1);
});

test('filterFinances respects FinanceRow typing for entradas vs saidas', () => {
  const rows: FinanceRow[] = [
    { id: '1', description: 'Salário', amount: 100, category: 'Ganhos', date: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0, paymentDate: null } as FinanceRow,
    { id: '2', description: 'Aluguel', amount: 200, category: 'Moradia', date: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0, paymentDate: null } as FinanceRow,
  ];
  expect(filterFinances(rows, { tipo: '1' }).length).toBe(1);
  expect(filterFinances(rows, { tipo: '2' }).length).toBe(1);
  expect(filterFinances(rows, { tipo: '0' }).length).toBe(2);
});
