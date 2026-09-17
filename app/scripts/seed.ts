/**
 * db:seed CLI - popula financas.db via better-sqlite3 + drizzle (fora do Expo)
 * Uso: yarn db:seed        -> limpa e popula DB host (app/financas.db) e faz adb push se emulador ativo
 *      yarn db:seed:host   -> só popula host (sem push)
 * App limpo: App.tsx não faz auto-seed, só lê o sqlite (runMigrations + load). Após `yarn db:seed` o próximo `yarn android` verá dados.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DB_NAME = 'financas.db';
// Host path: app/financas.db (raiz do projeto app)
const hostDbPath = path.resolve(__dirname, '..', DB_NAME);
// Também tenta expo SQLite default path para web? Mantemos só host.

async function ensureBetterSqlite() {
  try {
    require.resolve('better-sqlite3');
  } catch {
    console.error('better-sqlite3 não instalado. Rode: yarn add -D better-sqlite3');
    process.exit(1);
  }
}

async function runMigrationsOnDb(db: any) {
  // Reusa SQL das migrations (inline fallback já em src/db/migrate.ts, mas para better-sqlite3 precisamos exec direto)
  const m0000 = fs.readFileSync(path.resolve(__dirname, '..', 'src/db/migrations/0000_large_clint_barton.sql'), 'utf8');
  const m0001 = fs.readFileSync(path.resolve(__dirname, '..', 'src/db/migrations/0001_add_biometric.sql'), 'utf8');
  const m0002 = fs.readFileSync(path.resolve(__dirname, '..', 'src/db/migrations/0002_add_tithe.sql'), 'utf8');

  const split = (sql: string) => sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

  const exec = (sql: string) => {
    try { db.exec(sql); } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate column')) return;
      throw e;
    }
  };

  // Detecta versão via user_version
  let cur = 0;
  try { const row = db.prepare('PRAGMA user_version').get() as any; cur = row?.user_version ?? 0; } catch {}

  const migrations = [
    { v: 1, sql: m0000 },
    { v: 2, sql: m0001 },
    { v: 3, sql: m0002 },
  ];

  for (const m of migrations) {
    if (m.v <= cur) continue;
    for (const stmt of split(m.sql)) exec(stmt);
    db.exec(`PRAGMA user_version = ${m.v}`);
    console.log(`[seed] migration v${m.v} aplicada`);
  }
}

async function seedViaDrizzle(db: any) {
  // Usa drizzle com better-sqlite3 para inserir via repos? Mais simples: chama lógica de seed adaptada para este db
  // Vamos importar schema e inserir direto com drizzle, sem depender de expo-sqlite getDb()
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const schema = await import('../src/db/schema');
  const drizzleDb = drizzle(db, { schema });

  // Helpers iguais a src/db/seed.ts
  const dayjs = (await import('dayjs')).default;
  const TS_12H = 43200000;
  const ts = (d: Date | string | number) => new Date(d).getTime() + TS_12H;
  const monthsAgo = (n: number, day = 15) => ts(dayjs().subtract(n, 'month').date(day).hour(12).minute(0).second(0).toDate());
  const sept2026 = (day: number, hour = 12) => ts(dayjs('2026-09-01').date(day).hour(hour).minute(0).second(0).toDate());
  const daysFromNow = (days: number) => ts(dayjs().add(days, 'day').hour(12).toDate());
  const daysAgo = (days: number) => ts(dayjs().subtract(days, 'day').hour(12).toDate());

  // Limpa antes (clearAndSeed)
  console.log('[seed] limpando dados existentes...');
  try { drizzleDb.delete(schema.tithePayments).run(); } catch {}
  try { drizzleDb.delete(schema.items).run(); } catch {}
  try { drizzleDb.delete(schema.lists).run(); } catch {}
  try { drizzleDb.delete(schema.stock).run(); } catch {}
  try { drizzleDb.delete(schema.goals).run(); } catch {}
  try { drizzleDb.delete(schema.runs).run(); } catch {}
  try { drizzleDb.delete(schema.finances).run(); } catch {}
  try { drizzleDb.delete(schema.config).run(); } catch {}

  // 1. CONFIG
  console.log('[seed] inserindo config...');
  drizzleDb.insert(schema.config).values({
    id: 'config-singleton',
    colorModeState: 'light',
    isAiEnabled: 1,
    apiKey: 'sk-test-1234567890-USE-FAKE-KEY-FOR-SEED',
    isShowLabelOnNavigation: 0,
    isEnableTitheCard: 1,
    isEnableTotalHistoryCard: 1,
    willAddFuelToTransactionList: 1,
    willUsePrefixToRemoveTihteSum: 1,
    simpleFinancesItem: 0,
    marketSimplifiedItems: 0,
    prefixTithe: 'Reembolso',
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
  } as any).run();

  // 2. FINANCES (30+ set2026)
  const financeSeeds = [
    { description: 'Salário Janeiro', amount: 4500.0, category: 'Ganhos', date: monthsAgo(5, 5), paymentDate: monthsAgo(5, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Salário Fevereiro', amount: 4500.0, category: 'Ganhos', date: monthsAgo(4, 5), paymentDate: monthsAgo(4, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Março', amount: 4800.5, category: 'Ganhos', date: monthsAgo(3, 5), paymentDate: monthsAgo(3, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Salário Abril', amount: 4800.5, category: 'Ganhos', date: monthsAgo(2, 5), paymentDate: monthsAgo(2, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Maio', amount: 5200.0, category: 'Ganhos', date: monthsAgo(1, 5), paymentDate: monthsAgo(1, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Salário Junho Atual', amount: 5200.0, category: 'Ganhos', date: monthsAgo(0, 5), paymentDate: monthsAgo(0, 6), paymentStatus: 1, isEnabled: 0, isFavorited: 1 },
    { description: 'Freelance Design', amount: 1200.75, category: 'Ganhos', date: ts(dayjs().subtract(10, 'day').toDate()), paymentDate: ts(dayjs().subtract(9, 'day').toDate()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Rendimento Investimentos', amount: 350.2, category: 'Investimentos', date: monthsAgo(0, 10), paymentDate: monthsAgo(0, 11), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Dividendos', amount: 180.0, category: 'Investimentos', date: monthsAgo(1, 12), paymentDate: monthsAgo(1, 12), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Reembolso - Salário Extra', amount: 600.0, category: 'Ganhos', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Aluguel Apartamento', amount: 1500.0, category: 'Moradia', date: monthsAgo(0, 2), paymentDate: monthsAgo(0, 2), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    { description: 'Condomínio', amount: 320.0, category: 'Moradia', date: monthsAgo(0, 3), paymentDate: monthsAgo(0, 3), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Mercado Mensal', amount: 850.43, category: 'Mercado', date: monthsAgo(0, 8), paymentDate: monthsAgo(0, 8), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Cartão Nubank', amount: 2100.99, category: 'Cartão', date: monthsAgo(0, 15), paymentDate: monthsAgo(0, 15), paymentStatus: 0, isEnabled: 1, isFavorited: 1 },
    { description: 'Netflix', amount: 39.9, category: 'Streaming', date: monthsAgo(0, 1), paymentDate: monthsAgo(0, 1), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Internet Vivo Fibra', amount: 99.9, category: 'TV/Internet/Telefone', date: monthsAgo(0, 1), paymentDate: monthsAgo(0, 1), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Combustível - Posto Shell', amount: 250.0, category: 'Transporte', date: monthsAgo(0, 12), paymentDate: monthsAgo(0, 12), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Academia SmartFit', amount: 89.9, category: 'Saúde', date: monthsAgo(0, 5), paymentDate: monthsAgo(0, 5), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Curso Alura', amount: 69.0, category: 'Estudos', date: monthsAgo(1, 20), paymentDate: monthsAgo(1, 20), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    { description: 'Bar do Zé - Happy Hour', amount: 120.0, category: 'Bares e Restaurantes', date: monthsAgo(0, 18), paymentDate: monthsAgo(0, 18), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Roupas Renner', amount: 299.9, category: 'Vestuário', date: monthsAgo(2, 10), paymentDate: monthsAgo(2, 10), paymentStatus: 0, isEnabled: 1, isFavorited: 0 },
    { description: 'Salão Beleza', amount: 80.0, category: 'Beleza', date: monthsAgo(1, 8), paymentDate: monthsAgo(1, 8), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Reserva Emergência', amount: 500.0, category: 'Emergência', date: monthsAgo(3, 15), paymentDate: monthsAgo(3, 15), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'TV a Cabo', amount: 79.9, category: 'TV/Internet/Telefone', date: monthsAgo(2, 5), paymentDate: monthsAgo(2, 5), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Outros - Presente Aniversário', amount: 150.0, category: 'Outros', date: monthsAgo(1, 25), paymentDate: monthsAgo(1, 25), paymentStatus: 1, isEnabled: 1, isFavorited: 1 },
    { description: 'Reembolso - Combustível Empresa', amount: 200.0, category: 'Transporte', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Valor Mínimo', amount: 0.01, category: 'Outros', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Valor Zero Entrada', amount: 0, category: 'Ganhos', date: ts(new Date()), paymentDate: ts(new Date()), paymentStatus: 1, isEnabled: 0, isFavorited: 0 },
    { description: 'Valor Alto Saída', amount: 15000.99, category: 'Moradia', date: monthsAgo(0, 20), paymentDate: monthsAgo(0, 20), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
    { description: 'Valor Limite 10000', amount: 10000.0, category: 'Outros', date: monthsAgo(0, 22), paymentDate: monthsAgo(0, 22), paymentStatus: 1, isEnabled: 1, isFavorited: 0 },
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

  const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  let financesCount = 0;
  for (const dto of financeSeeds) {
    drizzleDb.insert(schema.finances).values({ id: genId(), description: dto.description, amount: dto.amount, category: dto.category, date: dto.date, paymentDate: dto.paymentDate, paymentStatus: dto.paymentStatus, isEnabled: dto.isEnabled, isFavorited: dto.isFavorited } as any).run();
    financesCount++;
  }
  console.log(`[seed] finances ${financesCount}`);

  const runSeeds = [
    { currentDistance: 10000, unityAmount: 5.89, amount: 150.0, type: 'Gasolina comum', date: monthsAgo(5, 8), location: 'Posto Ipiranga - Centro (Abr)' },
    { currentDistance: 10350, unityAmount: 4.29, amount: 100.0, type: 'Etanol', date: monthsAgo(5, 22), location: 'Posto BR - Marginal (Abr)' },
    { currentDistance: 10700, unityAmount: 6.19, amount: 120.5, type: 'Gasolina aditivada', date: monthsAgo(4, 10), location: 'Shell - Av. Paulista (Mai)' },
    { currentDistance: 10980, unityAmount: 4.59, amount: 110.0, type: 'Etanol aditivada', date: monthsAgo(4, 24), location: 'Posto Ale - Zona Leste (Mai)' },
    { currentDistance: 11200, unityAmount: 6.05, amount: 200.0, type: 'Dísel', date: monthsAgo(3, 8), location: 'Posto Dísel - Rodovia (Jun)' },
    { currentDistance: 11500, unityAmount: 3.99, amount: 80.0, type: 'GNV', date: monthsAgo(3, 20), location: 'Posto GNV - Radial (Jun)' },
    { currentDistance: 11800, unityAmount: 5.95, amount: 165.0, type: 'Gasolina comum', date: monthsAgo(2, 6), location: 'Posto Ipiranga - Centro (Jul)' },
    { currentDistance: 12100, unityAmount: 0.85, amount: 45.0, type: 'Carga elétrica', date: monthsAgo(2, 18), location: 'Eletroposto Shopping (Jul)' },
    { currentDistance: 12400, unityAmount: 6.15, amount: 210.0, type: 'Dísel-S10', date: monthsAgo(1, 10), location: 'Posto Ipiranga - Sul (Ago)' },
    { currentDistance: 12700, unityAmount: 6.35, amount: 180.75, type: 'Dísel aditivado', date: monthsAgo(1, 22), location: 'Posto BR - Norte (Ago)' },
    { currentDistance: 13000, unityAmount: 5.99, amount: 155.0, type: 'Gasolina comum', date: sept2026(5), location: 'Posto Shell - Setembro' },
    { currentDistance: 13300, unityAmount: 4.35, amount: 95.0, type: 'Etanol', date: sept2026(12), location: 'Posto BR - Setembro' },
    { currentDistance: 13550, unityAmount: 6.10, amount: 175.0, type: 'Dísel', date: sept2026(20), location: 'Posto Dísel - Setembro' },
    { currentDistance: 13800, unityAmount: 6.20, amount: 185.0, type: 'Gasolina aditivada', date: sept2026(25), location: 'Posto Ale - Setembro' },
  ];
  for (const dto of runSeeds) {
    drizzleDb.insert(schema.runs).values({ id: genId(), ...dto } as any).run();
  }
  console.log(`[seed] runs ${runSeeds.length}`);

  const goalSeeds = [
    { description: 'Viagem para Europa', amount: 10000, currentAmount: 2500, date: daysFromNow(5), category: 'viagem', icon: 'map-pin' },
    { description: 'Carro Novo', amount: 50000, currentAmount: 12000, date: daysFromNow(90), category: 'carro', icon: 'truck' },
    { description: 'Notebook Gamer', amount: 8000, currentAmount: 8000, date: daysFromNow(30), category: 'computador', icon: 'monitor' },
    { description: 'Reserva de Emergência', amount: 15000, currentAmount: 15000, date: daysAgo(10), category: 'reserva', icon: 'shield' },
    { description: 'Investimento Ações', amount: 2000, currentAmount: 500, date: daysFromNow(15), category: 'investimento', icon: 'trending-up' },
    { description: 'Férias Praia', amount: 3000, currentAmount: 1500, date: daysFromNow(10), category: 'férias', icon: 'sun' },
    { description: 'Casa Própria Entrada', amount: 80000, currentAmount: 20000, date: daysFromNow(365), category: 'casa', icon: 'home' },
    { description: 'Curso Intercâmbio', amount: 5000, currentAmount: 0, date: daysAgo(5), category: 'outros', icon: 'target' },
    { description: 'Meta Custom Longa Nome Com Mais De Trinta Caracteres Para Testar Truncamento', amount: 1234.56, currentAmount: 100, date: daysFromNow(60), category: 'custom longa', icon: 'tag' },
    { description: 'Meta Zero Valor', amount: 0, currentAmount: 0, date: daysFromNow(20), category: 'outros', icon: 'target' },
  ];
  for (const dto of goalSeeds) {
    drizzleDb.insert(schema.goals).values({ id: genId(), ...dto } as any).run();
  }
  console.log(`[seed] goals ${goalSeeds.length}`);

  const stockSeeds = [
    { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 2, quantityDesired: 3 },
    { description: 'Feijão 1kg', category: 'Mercearia', amount: 8.5, quantity: 5, quantityDesired: 2 },
    { description: 'Macarrão 500g', category: 'Mercearia', amount: 4.99, quantity: 1, quantityDesired: 4 },
    { description: 'Óleo 900ml', category: 'Mercearia', amount: 7.5, quantity: 0, quantityDesired: 2 },
    { description: 'Açúcar 1kg', category: 'Mercearia', amount: 5.2, quantity: 3, quantityDesired: 2 },
    { description: 'Sal 1kg', category: 'Mercearia', amount: 2.99, quantity: 2, quantityDesired: 2 },
    { description: 'Café 500g', category: 'Mercearia', amount: 18.0, quantity: 10, quantityDesired: 5 },
    { description: 'Leite 1L', category: 'Mercearia', amount: 4.99, quantity: 2, quantityDesired: 6 },
    { description: 'Ovos 12un', category: 'Mercearia', amount: 12.0, quantity: 1, quantityDesired: 2 },
    { description: 'Pão Integral', category: 'Mercearia', amount: 8.9, quantity: 0, quantityDesired: 3 },
    { description: 'Picanha 1kg', category: 'Carnes', amount: 89.9, quantity: 0, quantityDesired: 2 },
    { description: 'Frango 1kg', category: 'Carnes', amount: 18.5, quantity: 2, quantityDesired: 3 },
    { description: 'Carne Moída 1kg', category: 'Carnes', amount: 32.0, quantity: 3, quantityDesired: 2 },
    { description: 'Maçã 1kg', category: 'Fruteira', amount: 12.9, quantity: 1, quantityDesired: 3 },
    { description: 'Banana 1kg', category: 'Fruteira', amount: 6.5, quantity: 4, quantityDesired: 2 },
    { description: 'Laranja 1kg', category: 'Fruteira', amount: 5.99, quantity: 0, quantityDesired: 5 },
    { description: 'Shampoo 400ml', category: 'Higiêne', amount: 15.99, quantity: 1, quantityDesired: 1 },
    { description: 'Sabonete 6un', category: 'Higiêne', amount: 9.9, quantity: 0, quantityDesired: 2 },
    { description: 'Papel Higiênico 12un', category: 'Higiêne', amount: 22.0, quantity: 1, quantityDesired: 3 },
    { description: 'Detergente 500ml', category: 'Limpeza', amount: 3.5, quantity: 3, quantityDesired: 2 },
    { description: 'Água Sanitária 2L', category: 'Limpeza', amount: 7.9, quantity: 0, quantityDesired: 4 },
    { description: 'Sabão em Pó 1kg', category: 'Limpeza', amount: 16.9, quantity: 2, quantityDesired: 3 },
    { description: 'Amaciante 2L', category: 'Limpeza', amount: 12.5, quantity: 0, quantityDesired: 1 },
    { description: 'Desinfetante 1L', category: 'Limpeza', amount: 6.99, quantity: 4, quantityDesired: 2 },
    { description: 'Esponja 3un', category: 'Limpeza', amount: 4.5, quantity: 5, quantityDesired: 2 },
    { description: 'Produto Genérico Outros', category: 'Outros', amount: 1.99, quantity: 1, quantityDesired: 10 },
  ];
  for (const dto of stockSeeds) {
    drizzleDb.insert(schema.stock).values({ id: genId(), ...dto } as any).run();
  }
  console.log(`[seed] stock ${stockSeeds.length}`);

  const listSeeds = [
    { description: 'Lista Setembro - Comidas', location: 'Atacadão - Alimentos', quantity: 18, amount: 180.5, date: sept2026(8) },
    { description: 'Lista Setembro - Casa (Limpeza/Higiene)', location: 'Atacadão - Casa', quantity: 12, amount: 95.3, date: sept2026(10) },
    { description: 'Compra Semanal - Mista Setembro', location: 'Mercado Bairro', quantity: 10, amount: 120.0, date: sept2026(15) },
  ];
  for (const l of listSeeds) {
    const id = genId();
    drizzleDb.insert(schema.lists).values({ id, ...l } as any).run();
    let sample: any[] = [];
    if (l.description.includes('Comidas')) {
      sample = [
        { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 2, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Feijão 1kg', category: 'Mercearia', amount: 8.5, quantity: 3, quantityDesired: 3, location: l.location, date: l.date },
        { description: 'Leite 1L', category: 'Mercearia', amount: 4.99, quantity: 6, quantityDesired: 6, location: l.location, date: l.date },
        { description: 'Picanha 1kg', category: 'Carnes', amount: 89.9, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
      ];
    } else if (l.description.includes('Casa')) {
      sample = [
        { description: 'Sabão em Pó 1kg', category: 'Limpeza', amount: 16.9, quantity: 2, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Amaciante 2L', category: 'Limpeza', amount: 12.5, quantity: 1, quantityDesired: 1, location: l.location, date: l.date },
        { description: 'Detergente 500ml', category: 'Limpeza', amount: 3.5, quantity: 3, quantityDesired: 3, location: l.location, date: l.date },
      ];
    } else {
      sample = [
        { description: 'Arroz 5kg', category: 'Mercearia', amount: 25.9, quantity: 1, quantityDesired: 2, location: l.location, date: l.date },
        { description: 'Café 500g', category: 'Mercearia', amount: 18.0, quantity: 1, quantityDesired: 2, location: l.location, date: l.date },
      ];
    }
    for (const it of sample) {
      drizzleDb.insert(schema.items).values({ id: genId(), list_id: id, ...it } as any).run();
    }
  }
  console.log(`[seed] lists 3 + items`);

  for (let i = 0; i < 3; i++) {
    const d = dayjs().subtract(i, 'month').date(10).toDate();
    drizzleDb.insert(schema.tithePayments).values({ id: genId(), amount: 450 + i * 20, date: ts(d), month: d.getMonth() + 1, year: d.getFullYear() } as any).run();
  }
  console.log('[seed] tithePayments 3');
}

async function main() {
  await ensureBetterSqlite();
  const Database = (await import('better-sqlite3')).default;
  if (!fs.existsSync(hostDbPath)) {
    console.log(`[seed] criando DB em ${hostDbPath}`);
  } else {
    console.log(`[seed] usando DB existente ${hostDbPath}`);
  }
  const sqlite = new Database(hostDbPath);
  await runMigrationsOnDb(sqlite);
  await seedViaDrizzle(sqlite);
  sqlite.close();
  console.log(`[seed] concluído host ${hostDbPath} (${(fs.statSync(hostDbPath).size/1024).toFixed(1)} KB)`);

  // Push para device se emulador/dispositivo conectado
  const shouldPush = process.argv.includes('--push') || !process.argv.includes('--host-only');
  if (shouldPush) {
    try {
      const devices = execSync('adb devices | grep -v "List" | grep "device" | head -1', { encoding: 'utf8' }).trim();
      if (!devices) {
        console.log('[seed] nenhum device adb encontrado, pule push (use --host-only para silenciar). Rode `adb devices` e `yarn db:seed` novamente com emulador aberto.');
        return;
      }
      const target = '/data/data/com.finances/databases/financas.db';
      // Garante diretório
      try { execSync(`adb shell "run-as com.finances mkdir -p databases"`, { stdio: 'ignore' }); } catch {}
      // Tenta run-as push (API 29+ requer run-as)
      try {
        execSync(`adb push "${hostDbPath}" "${target}"`, { stdio: 'inherit' });
        console.log(`[seed] push OK → ${target}`);
      } catch {
        // fallback via run-as cat
        execSync(`adb shell "run-as com.finances cp /sdcard/financas.db ${target}" 2>&1 | head`, { stdio: 'inherit' });
      }
      // Alternativa: copia para sdcard e move
      try {
        execSync(`adb push "${hostDbPath}" "/sdcard/financas.db"`, { stdio: 'ignore' });
        execSync(`adb shell "run-as com.finances cp /sdcard/financas.db databases/financas.db; run-as com.finances chmod 660 databases/financas.db"`, { stdio: 'ignore' });
        console.log('[seed] push via sdcard fallback OK');
      } catch {}
    } catch (e: any) {
      console.log('[seed] adb push falhou (ok para dev host-only):', e?.message?.slice(0,200));
    }
  } else {
    console.log('[seed] --host-only, sem adb push');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
