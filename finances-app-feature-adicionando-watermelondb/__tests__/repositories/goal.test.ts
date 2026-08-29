import { goalRepo, calcGoalProgress, getDaysRemaining, isGoalConcluded, filterGoalsByStatus, DEFAULT_GOAL_CATEGORIES, normalizeCategory, getCategoryIcon } from '../../src/repositories/goal';

describe('goalRepo - CRUD + categorias custom', () => {
  beforeEach(async () => {
    await goalRepo.clearMemory();
  });

  test('CRUD metas com icon/category', async () => {
    const g = await goalRepo.add({ description: 'Viagem', amount: 1000, currentAmount: 200, date: Date.now()+10*86400000, category: 'viagem' });
    expect(g.category).toBe('viagem');
    expect(g.icon).toBe('map-pin');
    const all = await goalRepo.getAll();
    expect(all.length).toBe(1);
    const updated = await goalRepo.update(g.id, { currentAmount: 500 });
    expect(updated.currentAmount).toBe(500);
    await goalRepo.delete(g.id);
    expect((await goalRepo.getAll()).length).toBe(0);
  });

  test('categoria custom normalizada e ícone tag fallback', async () => {
    const g = await goalRepo.add({ description: 'Moto custom', amount: 5000, currentAmount: 0, date: Date.now()+30*86400000, category: 'moto' });
    expect(g.category).toBe('moto');
    expect(g.icon).toBe('tag');
    // sanitiza custom com limite 30
    const long = 'a'.repeat(50);
    const g2 = await goalRepo.add({ description: 'long', amount: 100, currentAmount: 0, date: Date.now(), category: long });
    expect(g2.category.length).toBe(30);
  });

  test('default categories incluem viagem/carro/computador/investimento/férias/casa/reserva', () => {
    expect(DEFAULT_GOAL_CATEGORIES).toEqual(expect.arrayContaining(['viagem','carro','computador','investimento','férias','casa','reserva']));
    expect(getCategoryIcon('viagem')).toBe('map-pin');
    expect(getCategoryIcon('carro')).toBe('truck');
    expect(getCategoryIcon('computador')).toBe('monitor');
    expect(getCategoryIcon('investimento')).toBe('trending-up');
    expect(getCategoryIcon('férias')).toBe('sun');
    expect(getCategoryIcon('casa')).toBe('home');
    expect(getCategoryIcon('reserva')).toBe('shield');
  });

  test('calcGoalProgress 0-1 clamp', () => {
    expect(calcGoalProgress({ amount: 1000, currentAmount: 500 })).toBe(0.5);
    expect(calcGoalProgress({ amount: 1000, currentAmount: 1500 })).toBe(1);
    expect(calcGoalProgress({ amount: 0, currentAmount: 100 })).toBe(0);
    expect(calcGoalProgress({ amount: 1000, currentAmount: -100 })).toBe(0);
  });

  test('getDaysRemaining Restam X dias', () => {
    const now = Date.now();
    expect(getDaysRemaining({ date: now + 10*86400000 }, now)).toBe(10);
    expect(getDaysRemaining({ date: now - 2*86400000 }, now)).toBe(-2);
  });

  test('filter Ativas/Concluídas', async () => {
    await goalRepo.add({ description: 'Ativa', amount: 1000, currentAmount: 200, date: Date.now()+10*86400000, category: 'viagem' });
    await goalRepo.add({ description: 'Concluida', amount: 1000, currentAmount: 1000, date: Date.now()+10*86400000, category: 'carro' });
    const all = await goalRepo.getAll();
    expect(filterGoalsByStatus(all, 'Ativas').length).toBe(1);
    expect(filterGoalsByStatus(all, 'Concluídas').length).toBe(1);
    expect(filterGoalsByStatus(all, 'Todas').length).toBe(2);
  });

  test('normalizeCategory aceita ferias sem acento', () => {
    expect(normalizeCategory('ferias')).toBe('férias');
    expect(normalizeCategory('Ferias')).toBe('férias');
    expect(normalizeCategory('VIAGEM')).toBe('viagem');
  });
});
