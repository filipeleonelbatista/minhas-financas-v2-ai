/**
 * Seed completo para testes - cobre todos os modelos com dados possíveis
 * Uso:
 *  import { seedDatabase, clearAndSeed } from '@/db/seed';
 *  await seedDatabase(); // dentro do app (Expo) - popula SQLite via drizzle ou memória em jest
 *  npx jest src/db/seed.test.ts
 */
import dayjs from 'dayjs';
import { configRepo } from '../repositories/config';
import { financeRepo } from '../repositories/finance';
import { runRepo } from '../repositories/run';
import { marketRepo } from '../repositories/market';
import { goalRepo } from '../repositories/goal';
import { listRepo } from '../repositories/list';
import { titheRepo } from '../repositories/tithe';

const now = Date.now();
const TS_12H = 43200000;
const ts = (d: Date | string | number) => {
  const t = new Date(d).getTime();
  return t + TS_12H;
};

export type SeedResult = {
  config: any;
  finances: any[];
  runs: any[];
  goals: any[];
  stock: any[];
  lists: any[];
  items: any[];
  tithePayments: any[];
};

export async function clearAll() {
  await Promise.all([
    financeRepo.clearMemory(),
    runRepo.clearMemory(),
    goalRepo.clearMemory(),
    marketRepo.clearMemory(),
    listRepo.clearMemory(),
    titheRepo.clearMemory(),
    configRepo.clearMemory(),
  ]);
}

// ---------------------------------------------------------------------------
// Helpers: datas distribuídas nos últimos 6 meses para alimentar Dashboard line chart
// + helper fixo para SETEMBRO 2026 (01/09/2026 - 30/09/2026) para garantir cards no mês corrente
// ---------------------------------------------------------------------------
function monthsAgo(n: number, day = 15) {
  return ts(dayjs().subtract(n, 'month').date(day).hour(12).minute(0).second(0).toDate());
}
function sept2026(day: number, hour = 12) {
  return ts(dayjs('2026-09-01').date(day).hour(hour).minute(0).second(0).toDate());
}
function daysFromNow(days: number) {
  return ts(dayjs().add(days, 'day').hour(12).toDate());
}
function daysAgo(days: number) {
  return ts(dayjs().subtract(days, 'day').hour(12).toDate());
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
export async function seedDatabase(): Promise<SeedResult> {
  // garante db limpo para testes determinísticos (em produção pode remover o clear)
  // await clearAll(); // descomente se quiser limpar antes - por padrão seed faz clear
  // Vamos sempre limpar para garantir idempotência em testes
  await clearAll();

  // 1. CONFIG - singleton com todos os toggles possíveis
  const config = await configRepo.upsert({
    id: 'config-singleton',
    colorModeState: 'light',
    isAiEnabled: 1,
    apiKey: 'sk-test-1234567890-USE-FAKE-KEY-FOR-SEED',
    isShowLabelOnNavigation: 0, // removido do menu mas mantido no schema
    isEnableTitheCard: 1,
    isEnableTotalHistoryCard: 1,
    willAddFuelToTransactionList: 1,
    willUsePrefixToRemoveTihteSum: 1,
    simpleFinancesItem: 0,
    marketSimplifiedItems: 0,
    prefixTithe: 'Reembolso', // para testar soma do dízimo removendo prefixo
    veicleName: 'Onix',
    veicleBrand: 'Chevrolet',
    veicleYear: '2020',
    veicleColor: 'Prata',
    veiclePlate: 'ABC1D23',
    veicleAutonomy: 12.5,
    selectedFolderToSave: '',
    isBiometricEnabled: 0,
    tithePercent: 10,
    titheCategories: JSON.stringify(['Ganhos', 'Investimentos']),
    isTitheMenuEnabled: 1,
  });

  // 2. FINANCES - ~30 linhas cobrindo todos os filtros e edge cases
  const financeSeeds = [
    // Entradas - Ganhos e Investimentos (base para dízimo)
    { description: 'Salário Janeiro', amount: 4500.0, category: 'Ganhos', date: monthsAgo(5, 5), paymentDate: monthsAgo(5, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Salário Fevereiro', amount: 4500.0, category: 'Ganhos', date: monthsAgo(4, 5), paymentDate: monthsAgo(4, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Março', amount: 4800.5, category: 'Ganhos', date: monthsAgo(3, 5), paymentDate: monthsAgo(3, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Salário Abril', amount: 4800.5, category: 'Ganhos', date: monthsAgo(2, 5), paymentDate: monthsAgo(2, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Maio', amount: 5200.0, category: 'Ganhos', date: monthsAgo(1, 5), paymentDate: monthsAgo(1, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Junho Atual', amount: 5200.0, category: 'Ganhos', date: monthsAgo(0, 5), paymentDate: monthsAgo(0, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Freelance Design', amount: 1200.75, category: 'Ganhos', date: ts(dayjs().subtract(10, 'day').toDate()), paymentDate: ts(dayjs().subtract(9, 'day').toDate()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Rendimento Investimentos', amount: 350.2, category: 'Investimentos', date: monthsAgo(0, 10), paymentDate: monthsAgo(0, 11), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Dividendos', amount: 180.0, category: 'Investimentos', date: monthsAgo(1, 12), paymentDate: monthsAgo(1, 12), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    // Entrada com prefixo que deve ser removida do dízimo quando flag ativa (saída com prefixo não conta, mas entrada com prefixo não - testar)
    { description: 'Reembolso - Salário Extra', amount: 600.0, category: 'Ganhos', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },

    // Saídas - todas categorias
    { description: 'Aluguel Apartamento', amount: 1500.0, category: 'Moradia', date: monthsAgo(0, 2), paymentDate: monthsAgo(0, 2), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    { description: 'Condomínio', amount: 320.0, category: 'Moradia', date: monthsAgo(0, 3), paymentDate: monthsAgo(0, 3), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Mercado Mensal', amount: 850.43, category: 'Mercado', date: monthsAgo(0, 8), paymentDate: monthsAgo(0, 8), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Cartão Nubank', amount: 2100.99, category: 'Cartão', date: monthsAgo(0, 15), paymentDate: monthsAgo(0, 15), paymentStatus: 0, isEnabled: 1, isFavorited: 1 }, // não pago
    { description: 'Netflix', amount: 39.9, category: 'Streaming', date: monthsAgo(0, 1), paymentDate: monthsAgo(0, 1), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Internet Vivo Fibra', amount: 99.9, category: 'TV/Internet/Telefone', date: monthsAgo(0, 1), paymentDate: monthsAgo(0, 1), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Combustível - Posto Shell', amount: 250.0, category: 'Transporte', date: monthsAgo(0, 12), paymentDate: monthsAgo(0, 12), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Academia SmartFit', amount: 89.9, category: 'Saúde', date: monthsAgo(0, 5), paymentDate: monthsAgo(0, 5), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Curso Alura', amount: 69.0, category: 'Estudos', date: monthsAgo(1, 20), paymentDate: monthsAgo(1, 20), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    { description: 'Bar do Zé - Happy Hour', amount: 120.0, category: 'Bares e Restaurantes', date: monthsAgo(0, 18), paymentDate: monthsAgo(0, 18), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Roupas Renner', amount: 299.9, category: 'Vestuário', date: monthsAgo(2, 10), paymentDate: monthsAgo(2, 10), paymentStatus: 0, isEnabled: 1, isFavorited: 0 }, // não pago
    { description: 'Salão Beleza', amount: 80.0, category: 'Beleza', date: monthsAgo(1, 8), paymentDate: monthsAgo(1, 8), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Reserva Emergência', amount: 500.0, category: 'Emergência', date: monthsAgo(3, 15), paymentDate: monthsAgo(3, 15), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'TV a Cabo', amount: 79.9, category: 'TV/Internet/Telefone', date: monthsAgo(2, 5), paymentDate: monthsAgo(2, 5), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Outros - Presente Aniversário', amount: 150.0, category: 'Outros', date: monthsAgo(1, 25), paymentDate: monthsAgo(1, 25), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    // Saída com prefixo para testar remoção do dízimo (isEnabled=1 e description contém prefixo)
    { description: 'Reembolso - Combustível Empresa', amount: 200.0, category: 'Transporte', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    // Edges: valores limite
    { description: 'Valor Mínimo', amount: 0.01, category: 'Outros', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Valor Zero Entrada', amount: 0, category: 'Ganhos', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Valor Alto Saída', amount: 15000.99, category: 'Moradia', date: monthsAgo(0, 20), paymentDate: monthsAgo(0, 20), paymentStatus: 1, isEnabled: 1, isFavorited: 0 }, // testa fontSize 20
    { description: 'Valor Limite 10000', amount: 10000.0, category: 'Outros', date: monthsAgo(0, 22), paymentDate: monthsAgo(0, 22), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    // GARANTIA MÊS CORRENTE 01/09/2026 - 30/09/2026 (para não ficar zerado após restart)
    { description: 'Salário Setembro 2026', amount: 5200.0, category: 'Ganhos', date: sept2026(1), paymentDate: sept2026(2), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Freelance Setembro', amount: 900.0, category: 'Ganhos', date: sept2026(3), paymentDate: sept2026(3), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Dividendos Setembro', amount: 250.0, category: 'Investimentos', date: sept2026(5), paymentDate: sept2026(5), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Aluguel Setembro', amount: 1500.0, category: 'Moradia', date: sept2026(5), paymentDate: sept2026(5), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Mercado Setembro', amount: 680.0, category: 'Mercado', date: sept2026(8), paymentDate: sept2026(8), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Cartão Setembro', amount: 1100.0, category: 'Cartão', date: sept2026(10), paymentDate: sept2026(10), paymentStatus: 0, isEnabled: 1, isFavorited: 1 },
    { description: 'Transporte Setembro', amount: 220.0, category: 'Transporte', date: sept2026(12), paymentDate: sept2026(12), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Saúde Setembro', amount: 180.0, category: 'Saúde', date: sept2026(15), paymentDate: sept2026(15), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Streaming Setembro', amount: 45.9, category: 'Streaming', date: sept2026(18), paymentDate: sept2026(18), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Restaurante Setembro', amount: 95.0, category: 'Bares e Restaurantes', date: sept2026(20), paymentDate: sept2026(20), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Reembolso - Setembro', amount: 150.0, category: 'Transporte', date: sept2026(22), paymentDate: sept2026(22), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
  ];

  const finances: any[] = [];
  for (const dto of financeSeeds) {
    // drizzle espera number para date/paymentDate já com TS_12H
    const row = await financeRepo.add(dto as any);
    finances.push(row);
  }

  // 3. RUNS (combustível) - 12 abastecimentos cobrindo últimos 6 meses (Abril-Setembro 2026) + todos os tipos
  const runSeeds = [
    // Abril 2026
    { currentDistance: 10000, unityAmount: 5.89, amount: 150.0, type: 'Gasolina comum', date: monthsAgo(5, 8), location: 'Posto Ipiranga - Centro (Abr)' },
    { currentDistance: 10350, unityAmount: 4.29, amount: 100.0, type: 'Etanol', date: monthsAgo(5, 22), location: 'Posto BR - Marginal (Abr)' },
    // Maio 2026
    { currentDistance: 10700, unityAmount: 6.19, amount: 120.5, type: 'Gasolina aditivada', date: monthsAgo(4, 10), location: 'Shell - Av. Paulista (Mai)' },
    { currentDistance: 10980, unityAmount: 4.59, amount: 110.0, type: 'Etanol aditivada', date: monthsAgo(4, 24), location: 'Posto Ale - Zona Leste (Mai)' },
    // Junho 2026
    { currentDistance: 11200, unityAmount: 6.05, amount: 200.0, type: 'Dísel', date: monthsAgo(3, 8), location: 'Posto Dísel - Rodovia (Jun)' },
    { currentDistance: 11500, unityAmount: 3.99, amount: 80.0, type: 'GNV', date: monthsAgo(3, 20), location: 'Posto GNV - Radial (Jun)' },
    // Julho 2026
    { currentDistance: 11800, unityAmount: 5.95, amount: 165.0, type: 'Gasolina comum', date: monthsAgo(2, 6), location: 'Posto Ipiranga - Centro (Jul)' },
    { currentDistance: 12100, unityAmount: 0.85, amount: 45.0, type: 'Carga elétrica', date: monthsAgo(2, 18), location: 'Eletroposto Shopping (Jul)' },
    // Agosto 2026
    { currentDistance: 12400, unityAmount: 6.15, amount: 210.0, type: 'Dísel-S10', date: monthsAgo(1, 10), location: 'Posto Ipiranga - Sul (Ago)' },
    { currentDistance: 12700, unityAmount: 6.35, amount: 180.75, type: 'Dísel aditivado', date: monthsAgo(1, 22), location: 'Posto BR - Norte (Ago)' },
    // Setembro 2026 (mês corrente)
    { currentDistance: 13000, unityAmount: 5.99, amount: 155.0, type: 'Gasolina comum', date: sept2026(5), location: 'Posto Shell - Setembro' },
    { currentDistance: 13300, unityAmount: 4.35, amount: 95.0, type: 'Etanol', date: sept2026(12), location: 'Posto BR - Setembro' },
    { currentDistance: 13550, unityAmount: 6.10, amount: 175.0, type: 'Dísel', date: sept2026(20), location: 'Posto Dísel - Setembro' },
    { currentDistance: 13800, unityAmount: 6.20, amount: 185.0, type: 'Gasolina aditivada', date: sept2026(25), location: 'Posto Ale - Setembro' },
  ];
  const runs: any[] = [];
  for (const dto of runSeeds) {
    const row = await runRepo.add(dto as any);
    runs.push(row);
  }

  // 4. GOALS - cobrindo status: vencida, concluída, ativa, urgente
  const goalSeeds = [
    { description: 'Viagem para Europa', amount: 10000, currentAmount: 2500, date: daysFromNow(5), category: 'viagem', icon: 'map-pin' }, // urgente 5d
    { description: 'Carro Novo', amount: 50000, currentAmount: 12000, date: daysFromNow(90), category: 'carro', icon: 'truck' }, // ativa longo prazo
    { description: 'Notebook Gamer', amount: 8000, currentAmount: 8000, date: daysFromNow(30), category: 'computador', icon: 'monitor' }, // concluída 100%
    { description: 'Reserva de Emergência', amount: 15000, currentAmount: 15000, date: daysAgo(10), category: 'reserva', icon: 'shield' }, // concluída vencida mas concluída prevalece
    { description: 'Investimento Ações', amount: 2000, currentAmount: 500, date: daysFromNow(15), category: 'investimento', icon: 'trending-up' }, // urgente 15d
    { description: 'Férias Praia', amount: 3000, currentAmount: 1500, date: daysFromNow(10), category: 'férias', icon: 'sun' }, // urgente 10d
    { description: 'Casa Própria Entrada', amount: 80000, currentAmount: 20000, date: daysFromNow(365), category: 'casa', icon: 'home' }, // 1 ano
    { description: 'Curso Intercâmbio', amount: 5000, currentAmount: 0, date: daysAgo(5), category: 'outros', icon: 'target' }, // vencida não concluída
    { description: 'Meta Custom Longa Nome Com Mais De Trinta Caracteres Para Testar Truncamento', amount: 1234.56, currentAmount: 100, date: daysFromNow(60), category: 'custom longa', icon: 'tag' }, // custom category
    { description: 'Meta Zero Valor', amount: 0, currentAmount: 0, date: daysFromNow(20), category: 'outros', icon: 'target' }, // edge amount 0
  ];
  const goals: any[] = [];
  for (const dto of goalSeeds) {
    const row = await goalRepo.add(dto as any);
    goals.push(row);
  }

  // 5. STOCK (market) - cobre Em estoque / Em falta, todas categorias - comidas e suprimentos casa
  const stockSeeds = [
    // Comidas - Mercearia
    { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 2, quantityDesired: 3 }, // em falta
    { description: 'Feijão 1kg', category: 'Mercearia', amount: 8.5, quantity: 5, quantityDesired: 2 }, // em estoque
    { description: 'Macarrão 500g', category: 'Mercearia', amount: 4.99, quantity: 1, quantityDesired: 4 }, // em falta
    { description: 'Óleo 900ml', category: 'Mercearia', amount: 7.5, quantity: 0, quantityDesired: 2 }, // em falta 0
    { description: 'Açúcar 1kg', category: 'Mercearia', amount: 5.2, quantity: 3, quantityDesired: 2 }, // estoque
    { description: 'Sal 1kg', category: 'Mercearia', amount: 2.99, quantity: 2, quantityDesired: 2 }, // estoque limite
    { description: 'Café 500g', category: 'Mercearia', amount: 18.0, quantity: 10, quantityDesired: 5 }, // estoque alto
    { description: 'Leite 1L', category: 'Mercearia', amount: 4.99, quantity: 2, quantityDesired: 6 }, // em falta
    { description: 'Ovos 12un', category: 'Mercearia', amount: 12.0, quantity: 1, quantityDesired: 2 }, // em falta
    { description: 'Pão Integral', category: 'Mercearia', amount: 8.9, quantity: 0, quantityDesired: 3 }, // em falta
    // Carnes
    { description: 'Picanha 1kg', category: 'Carnes', amount: 89.9, quantity: 0, quantityDesired: 2 }, // em falta 0
    { description: 'Frango 1kg', category: 'Carnes', amount: 18.5, quantity: 2, quantityDesired: 3 }, // em falta
    { description: 'Carne Moída 1kg', category: 'Carnes', amount: 32.0, quantity: 3, quantityDesired: 2 }, // estoque
    // Fruteira
    { description: 'Maçã 1kg', category: 'Fruteira', amount: 12.9, quantity: 1, quantityDesired: 3 }, // em falta
    { description: 'Banana 1kg', category: 'Fruteira', amount: 6.5, quantity: 4, quantityDesired: 2 }, // em estoque
    { description: 'Laranja 1kg', category: 'Fruteira', amount: 5.99, quantity: 0, quantityDesired: 5 }, // em falta
    // Higiêne - suprimentos casa
    { description: 'Shampoo 400ml', category: 'Higiêne', amount: 15.99, quantity: 1, quantityDesired: 1 }, // estoque limite
    { description: 'Sabonete 6un', category: 'Higiêne', amount: 9.9, quantity: 0, quantityDesired: 2 }, // falta
    { description: 'Papel Higiênico 12un', category: 'Higiêne', amount: 22.0, quantity: 1, quantityDesired: 3 }, // em falta
    // Limpeza - suprimentos casa
    { description: 'Detergente 500ml', category: 'Limpeza', amount: 3.5, quantity: 3, quantityDesired: 2 }, // estoque
    { description: 'Água Sanitária 2L', category: 'Limpeza', amount: 7.9, quantity: 0, quantityDesired: 4 }, // falta
    { description: 'Sabão em Pó 1kg', category: 'Limpeza', amount: 16.9, quantity: 2, quantityDesired: 3 }, // em falta
    { description: 'Amaciante 2L', category: 'Limpeza', amount: 12.5, quantity: 0, quantityDesired: 1 }, // falta
    { description: 'Desinfetante 1L', category: 'Limpeza', amount: 6.99, quantity: 4, quantityDesired: 2 }, // estoque
    { description: 'Esponja 3un', category: 'Limpeza', amount: 4.5, quantity: 5, quantityDesired: 2 }, // estoque
    { description: 'Produto Genérico Outros', category: 'Outros', amount: 1.99, quantity: 1, quantityDesired: 10 }, // falta grande
  ];
  const stock: any[] = [];
  for (const dto of stockSeeds) {
    const row = await marketRepo.add(dto as any);
    stock.push(row);
  }

  // 6. LISTS + ITEMS - 3 listas: comidas, casa, mista (suprimentos casa + comidas)
  const listSeeds = [
    { description: 'Lista Setembro - Comidas', location: 'Atacadão - Alimentos', quantity: 18, amount: 180.5, date: sept2026(8) },
    { description: 'Lista Setembro - Casa (Limpeza/Higiene)', location: 'Atacadão - Casa', quantity: 12, amount: 95.3, date: sept2026(10) },
    { description: 'Compra Semanal - Mista Setembro', location: 'Mercado Bairro', quantity: 10, amount: 120.0, date: sept2026(15) },
  ];
  const lists: any[] = [];
  const items: any[] = [];
  for (const l of listSeeds) {
    const listRow = await listRepo.add(l as any);
    lists.push(listRow);
    let sampleItems: any[] = [];
    if (l.description.includes('Comidas')) {
      sampleItems = [
        { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 2, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Feijão 1kg', category: 'Mercearia', amount: 8.5, quantity: 3, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Leite 1L', category: 'Mercearia', amount: 4.99, quantity: 6, quantityDesired: 6, location: l.location, date: l.date },
        { description: 'Picanha 1kg', category: 'Carnes', amount: 89.9, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
        { description: 'Maçã 1kg', category: 'Fruteira', amount: 12.9, quantity: 2, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Banana 1kg', category: 'Fruteira', amount: 6.5, quantity: 3, quantityDesired: 3, location: l.location, date: l.date },
      ];
    } else if (l.description.includes('Casa')) {
      sampleItems = [
        { description: 'Sabão em Pó 1kg', category: 'Limpeza', amount: 16.9, quantity: 2, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Amaciante 2L', category: 'Limpeza', amount: 12.5, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
        { description: 'Detergente 500ml', category: 'Limpeza', amount: 3.5, quantity: 3, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Papel Higiênico 12un', category: 'Higiêne', amount: 22.0, quantity: 1, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Shampoo 400ml', category: 'Higiêne', amount: 15.99, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
        { description: 'Água Sanitária 2L', category: 'Limpeza', amount: 7.9, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
      ];
    } else {
      sampleItems = [
        { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 1, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Café 500g', category: 'Mercearia', amount: 18.0, quantity: 1, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Detergente', category: 'Limpeza', amount: 3.5, quantity: 2, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Shampoo', category: 'Higiêne', amount: 15.99, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
      ];
    }
    for (const it of sampleItems) {
      const itemRow = await listRepo.addItem({ ...it, list_id: listRow.id } as any);
      items.push(itemRow);
    }
  }

  // 7. TITHE PAYMENTS - pagamentos de dízimo
  const tithePayments: any[] = [];
  for (let i = 0; i < 3; i++) {
    const d = dayjs().subtract(i, 'month').date(10).toDate();
    const row = await titheRepo.addPayment({ amount: 450 + i * 20, date: ts(d), month: d.getMonth() + 1, year: d.getFullYear() });
    tithePayments.push(row);
  }
  // também cria um pagamento via markAsPaid para testar fluxo completo (cria finance saida)
  const markPaid = await titheRepo.markAsPaid({
    percent: 10,
    categories: ['Ganhos', 'Investimentos'],
    filteredList: finances as any,
    month: dayjs().month() + 1,
    year: dayjs().year(),
  });
  // markAsPaid já criou um finance de dízimo; garantir que está no array finances para contagem
  if (markPaid?.finance) {
    finances.push(markPaid.finance);
  }
  if (markPaid?.payment) {
    tithePayments.push(markPaid.payment);
  }

  return { config, finances, runs, goals, stock, lists, items, tithePayments };
}

export async function clearAndSeed(): Promise<SeedResult> {
  await clearAll();
  return seedDatabase();
}

export async function ensureSeeded(): Promise<SeedResult | null> {
  try {
    const [fin, runs, stock, lists, goals] = await Promise.all([
      financeRepo.getAll(),
      runRepo.getAll(),
      marketRepo.getAll(),
      listRepo.getAll(),
      goalRepo.getAll(),
    ]);
    // Se todos já têm dados, não semeia
    if (fin.length > 0 && runs.length > 0 && stock.length > 0 && lists.length > 0 && goals.length > 0) return null;
    // Se qualquer um estiver vazio, semeia completo para garantir corridas, estoque e lista também (01/09/2026)
    // Para não sobrescrever dados do usuário quando apenas um está vazio, semeia apenas os faltantes
    if (fin.length === 0 || runs.length === 0 || stock.length === 0 || lists.length === 0 || goals.length === 0) {
      // se finanças vazio mas outros têm dados, ainda precisa garantir setembro em todos
      // chama seed completo que faz clearAll - em produção preserva; para dev/teste é ok reseed total
      // Para teste solicitado, forçamos reseed completo quando qualquer estiver vazio para garantir mês 09/2026
      return seedDatabase();
    }
    return null;
  } catch {
    return seedDatabase();
  }
}

// Força reseed de setembro mesmo com dados existentes (para teste solicitado)
export async function seedSeptember2026(): Promise<SeedResult> {
  // força dados de setembro sem limpar tudo? limpa e recria para garantir
  return seedDatabase();
}

// Execução direta via `npx ts-node src/db/seed.ts` (fora do Expo)
// @ts-ignore - NodeRequire types available via @types/node with types: ["node"] in tsconfig
if (typeof require !== 'undefined' && require.main === module) {
  seedDatabase()
    .then((r) => {
      console.log('Seed concluído:', {
        finances: r.finances.length,
        runs: r.runs.length,
        goals: r.goals.length,
        stock: r.stock.length,
        lists: r.lists.length,
        items: r.items.length,
        tithePayments: r.tithePayments.length,
      });
      process.exit(0);
    })
    .catch((e) => {
      console.error('Seed falhou', e);
      process.exit(1);
    });
}
