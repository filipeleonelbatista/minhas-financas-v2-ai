import { financeRepo, calcTithePure } from '../../src/repositories/finance';
import { titheRepo, TITHE_SCRIPTURES, validateTithePercent, getMonthlyTithePreview } from '../../src/repositories/tithe';

describe('tithe - JFA, % custom, base Ganhos, R$0 warning', () => {
  beforeEach(async () => {
    if ((financeRepo as any).clearMemory) await (financeRepo as any).clearMemory();
    if ((titheRepo as any).clearMemory) await (titheRepo as any).clearMemory();
  });

  test('base 0 => R$0 + warning (Roadmap 5.12)', async () => {
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
    // pure também
    expect(calcTithePure([{ id:'1', description:'Salário', amount:1000, category:'Ganhos', date:Date.now(), paymentDate:Date.now(), paymentStatus:1, isEnabled:0, isFavorited:0 } as any], { percent:10, categories:[] })).toBe(0);
  });

  test('% custom default 10, step 0.5, valid 1-100', () => {
    expect(validateTithePercent(undefined)).toBe(10);
    expect(validateTithePercent(10)).toBe(10);
    expect(validateTithePercent(10.5)).toBe(10.5);
    expect(validateTithePercent(12.3)).toBe(12.5); // round to nearest 0.5
    expect(validateTithePercent(0)).toBe(1);
    expect(validateTithePercent(0.2)).toBe(1);
    expect(validateTithePercent(100)).toBe(100);
    expect(validateTithePercent(150)).toBe(100);
    expect(validateTithePercent(NaN)).toBe(10);
  });

  test('calcTithePure com % custom sobre base Ganhos', () => {
    const list = [
      { id:'1', description:'Salário', amount:1000, category:'Ganhos', date:Date.now(), paymentDate:Date.now(), paymentStatus:1, isEnabled:0, isFavorited:0 },
      { id:'2', description:'Freela Invest', amount:500, category:'Investimentos', date:Date.now(), paymentDate:Date.now(), paymentStatus:1, isEnabled:0, isFavorited:0 },
      { id:'3', description:'Aluguel', amount:300, category:'Moradia', date:Date.now(), paymentDate:Date.now(), paymentStatus:1, isEnabled:1, isFavorited:0 },
    ] as any;
    // only Ganhos 10% => 100
    expect(calcTithePure(list, { percent:10, categories:['Ganhos'] })).toBe(100);
    // Ganhos+Investimentos 10% => 150
    expect(calcTithePure(list, { percent:10, categories:['Ganhos','Investimentos'] })).toBe(150);
    // custom 15% sobre Ganhos => 150
    expect(calcTithePure(list, { percent:15, categories:['Ganhos'] })).toBe(150);
    // custom 10.5% sobre Ganhos => 105
    expect(calcTithePure(list, { percent:10.5, categories:['Ganhos'] })).toBe(105);
  });

  test('monthly preview R$0 warning quando base vazia', () => {
    const now = Date.now();
    const list = [
      { id:'1', description:'Salário', amount:2000, category:'Ganhos', date:now, paymentDate:now, paymentStatus:1, isEnabled:0, isFavorited:0 },
    ] as any;
    const previewEmpty = getMonthlyTithePreview(list, 10, []);
    expect(previewEmpty.amount).toBe(0);
    expect(previewEmpty.warning).toBe('Selecione ao menos um Ganho');

    const previewOk = getMonthlyTithePreview(list, 10, ['Ganhos']);
    expect(previewOk.amount).toBe(200);
    expect(previewOk.warning).toBeNull();
  });

  test('escrituras JFA - 5 referências obrigatórias', () => {
    expect(TITHE_SCRIPTURES.length).toBe(5);
    const refs = TITHE_SCRIPTURES.map(s=>s.reference);
    expect(refs).toEqual(expect.arrayContaining([
      expect.stringContaining('Malaquias 3:8-10'),
      expect.stringContaining('Marcos 12:41-44'),
      expect.stringContaining('2 Coríntios 9:6-7'),
      expect.stringContaining('Provérbios 3:9-10'),
      expect.stringContaining('Lucas 6:38'),
    ]));
    // cada tem texto JFA + reflexão
    for (const s of TITHE_SCRIPTURES) {
      expect(s.text.length).toBeGreaterThan(20);
      expect(s.reflection.length).toBeGreaterThan(5);
      expect(s.translation).toMatch(/JFA|João Ferreira de Almeida/i);
    }
  });

  test('Marcar como pago cria transação saída Dízimo - Mês categoria Outros + tithe_payments', async () => {
    await financeRepo.add({
      description: 'Salário',
      amount: 2000,
      category: 'Ganhos',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isEnabled: 0,
      isFavorited: 0,
    });
    const now = new Date();
    const month = now.getMonth()+1;
    const year = now.getFullYear();
    const result = await titheRepo.markAsPaid({ percent:10, categories:['Ganhos'], month, year });
    expect(result.finance).toBeDefined();
    expect(result.finance.description).toMatch(/Dízimo/);
    expect(result.finance.category).toBe('Outros');
    expect(result.finance.isEnabled).toBe(1);
    expect(result.finance.amount).toBe(200);
    expect(result.payment).toBeDefined();
    expect(result.payment.amount).toBe(200);
    expect(result.payment.month).toBe(month);
    expect(result.payment.year).toBe(year);
    // verifica que finances contém a saída criada
    const all = await financeRepo.getAll();
    expect(all.some(f=>f.description.includes('Dízimo'))).toBe(true);
    // verifica histórico
    const payments = await titheRepo.getAll();
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(200);
  });

  test('financeRepo calcTithe integra percent custom e base Ganhos', async () => {
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
      description: 'Invest retorno',
      amount: 500,
      category: 'Investimentos',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isEnabled: 0,
      isFavorited: 0,
    });
    const v1 = await financeRepo.calcTithe({ percent:10, categories:['Ganhos'] });
    expect(v1).toBe(100);
    const v2 = await financeRepo.calcTithe({ percent:12.5, categories:['Ganhos','Investimentos'] });
    expect(v2).toBe(187.5);
  });
});
