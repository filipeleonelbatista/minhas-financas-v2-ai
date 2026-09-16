import { financeSchema } from '../../src/schemas/finance.zod';

test('financeSchema rejects javascript: injection', () => {
  const res = financeSchema.safeParse({ description: 'javascript:alert(1)', amount: 100, category: 'Ganhos', date: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 });
  expect(res.success).toBe(true);
  if (res.success) expect(res.data.description).not.toContain('javascript:');
});

test('yup removed from deps', () => {
  const pkg = require('../../package.json');
  expect(pkg.dependencies.yup).toBeUndefined();
});
