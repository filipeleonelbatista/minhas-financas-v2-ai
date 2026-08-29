import { financeRepo, filterFinances, calcTithePure } from '../../src/repositories/finance';

describe('financeRepo - filteredList + Tithe', () => {
  beforeEach(async () => {
    // clean memory fallback if exists
    // @ts-ignore
    if (financeRepo.clearMemory) await financeRepo.clearMemory();
  });

  test('Tithe 10% sobre Ganhos selecionados', async () => {
    await financeRepo.add({
      description: 'Salário',
      amount: 1000,
      category: 'Ganhos',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isEnabled: 0,
      isFavorited: 0,
    });
    await financeRepo.add({
      description: 'Aluguel',
      amount: 500,
      category: 'Moradia',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isFavorited: 0,
      isEnabled: 1,
    });
    const tithe = await financeRepo.calcTithe({ percent: 10, categories: ['Ganhos'] });
    expect(tithe).toBe(100);
  });

  test('Tithe base 0 => R$0 + warning (Roadmap 5.12)', async () => {
    await financeRepo.add({
      description: 'Salário',
      amount: 1000,
      category: 'Ganhos',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isEnabled: 0,
      isFavorited: 0,
    });
    const tithe = await financeRepo.calcTithe({ percent: 10, categories: [] });
    expect(tithe).toBe(0);
  });

  test('filteredList pipeline tipo→busca→periodo→categoria→status→favoritos→sort (PaymentsContext)', () => {
    const now = Date.now();
    const yesterday = now - 86400000;
    const tomorrow = now + 86400000;
    const list = [
      { id: '1', description: 'Salário Agosto', amount: 1000, category: 'Ganhos', date: now, paymentDate: now, paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
      { id: '2', description: 'Aluguel', amount: 500, category: 'Moradia', date: now, paymentDate: now, paymentStatus: 0, isEnabled: 1, isFavorited: 0 },
      { id: '3', description: 'Freela', amount: 200, category: 'Ganhos', date: yesterday, paymentDate: yesterday, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;

    // tipo 1 = entradas (isEnabled 0)
    let filtered = filterFinances(list, { tipo: '1', busca: '', categoria: 'Todos', status: 'Todos', favoritos: 'Todos', orderBy: 'Vencimento' });
    expect(filtered.length).toBe(2);
    expect(filtered.every((i) => i.isEnabled === 0)).toBe(true);

    // busca textual
    filtered = filterFinances(list, { tipo: '0', busca: 'Salário', categoria: 'Todos', status: 'Todos', favoritos: 'Todos', orderBy: 'Vencimento' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].description).toBe('Salário Agosto');

    // categoria
    filtered = filterFinances(list, { tipo: '0', busca: '', categoria: 'Ganhos', status: 'Todos', favoritos: 'Todos', orderBy: 'Vencimento' });
    expect(filtered.length).toBe(2);

    // status Pago
    filtered = filterFinances(list, { tipo: '0', busca: '', categoria: 'Todos', status: 'Pago', favoritos: 'Todos', orderBy: 'Vencimento' });
    expect(filtered.length).toBe(2);
    expect(filtered.every((i) => i.paymentStatus)).toBe(true);

    // favoritos
    filtered = filterFinances(list, { tipo: '0', busca: '', categoria: 'Todos', status: 'Todos', favoritos: 'Favoritos', orderBy: 'Vencimento' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');

    // sort Vencimento decrescente: now before tomorrow etc - ensure sorted newest first
    const unsorted = [
      { id: 'a', description: 'A', amount: 10, category: 'Outros', date: yesterday, paymentDate: yesterday, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: 'b', description: 'B', amount: 10, category: 'Outros', date: tomorrow, paymentDate: tomorrow, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;
    filtered = filterFinances(unsorted, { tipo: '0', busca: '', categoria: 'Todos', status: 'Todos', favoritos: 'Todos', orderBy: 'Vencimento' });
    expect(filtered[0].id).toBe('b');

    // orderBy Pagamento
    const listPay = [
      { id: 'a', description: 'A', amount: 10, category: 'Outros', date: now, paymentDate: yesterday, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: 'b', description: 'B', amount: 10, category: 'Outros', date: now, paymentDate: tomorrow, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;
    filtered = filterFinances(listPay, { tipo: '0', busca: '', categoria: 'Todos', status: 'Todos', favoritos: 'Todos', orderBy: 'Pagamento' });
    expect(filtered[0].id).toBe('b');
  });

  test('queryFiltered applies periodo inclusive (startDate/endDate)', () => {
    const base = new Date('2026-08-15T12:00:00Z').getTime();
    const startDate = '10/08/2026';
    const endDate = '20/08/2026';
    const list = [
      { id: '1', description: 'Dentro', amount: 100, category: 'Ganhos', date: base, paymentDate: base, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: '2', description: 'Fora antes', amount: 100, category: 'Ganhos', date: new Date('2026-08-05T12:00:00Z').getTime(), paymentDate: base, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: '3', description: 'Fora depois', amount: 100, category: 'Ganhos', date: new Date('2026-08-25T12:00:00Z').getTime(), paymentDate: base, paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    ] as any;
    const filtered = filterFinances(list, { tipo: '0', busca: '', categoria: 'Todos', status: 'Todos', favoritos: 'Todos', orderBy: 'Vencimento', startDate, endDate });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  test('calcTithePure with prefix subtraction', () => {
    const list = [
      { id: '1', description: 'Salário', amount: 1000, category: 'Ganhos', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: '2', description: 'Dízimo - Igreja', amount: 100, category: 'Outros', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
      { id: '3', description: 'PIX Dízimo', amount: 50, category: 'Outros', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    ] as any;
    // without prefix flag, should not subtract saidas
    expect(calcTithePure(list, { percent: 10, categories: ['Ganhos'], willUsePrefixToRemoveTitheSum: false, prefixTithe: 'Dízimo' })).toBe(100);
    // with flag and prefix, should subtract matching saidas: 1000 -100 -50 =850 =>85
    expect(calcTithePure(list, { percent: 10, categories: ['Ganhos'], willUsePrefixToRemoveTitheSum: true, prefixTithe: 'Dízimo' })).toBe(85);
    // negative protection: saidas maiores que ganhos => 0
    const listNeg = [
      { id: '1', description: 'Salário Dízimo', amount: 100, category: 'Ganhos', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
      { id: '2', description: 'Dízimo extra', amount: 500, category: 'Outros', date: Date.now(), paymentDate: Date.now(), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    ] as any;
    expect(calcTithePure(listNeg, { percent: 10, categories: ['Ganhos'], willUsePrefixToRemoveTitheSum: true, prefixTithe: 'Dízimo' })).toBe(0);
  });
});
