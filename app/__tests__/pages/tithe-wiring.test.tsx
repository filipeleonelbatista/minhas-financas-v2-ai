import { getMonthlyTithePreview, validateTithePercent } from '../../src/repositories/tithe';
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
