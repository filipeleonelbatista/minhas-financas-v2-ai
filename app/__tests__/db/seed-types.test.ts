import { seedDatabase } from '../../src/db/seed';

describe('seedDatabase typed', () => {
  test('returns finances.length > 0 and typed SeedResult', async () => {
    const r = await seedDatabase();
    expect(r).toBeDefined();
    expect(r.finances.length).toBeGreaterThan(0);
    expect(r.runs.length).toBeGreaterThan(0);
    expect(r.goals.length).toBeGreaterThan(0);
    expect(r.stock.length).toBeGreaterThan(0);
    expect(r.lists.length).toBeGreaterThan(0);
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.tithePayments.length).toBeGreaterThan(0);
    // typed returns finances
    const finances: typeof r.finances = r.finances;
    expect(Array.isArray(finances)).toBe(true);
  });
});
