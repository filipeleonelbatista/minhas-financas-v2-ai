import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const finances = sqliteTable('finances', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  date: integer('date').notNull(),
  paymentDate: integer('paymentDate'),
  paymentStatus: integer('paymentStatus').notNull(),
  isEnabled: integer('isEnabled').notNull(),
  isFavorited: integer('isFavorited').notNull(),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  currentDistance: real('currentDistance').notNull(),
  unityAmount: real('unityAmount').notNull(),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  date: integer('date').notNull(),
  location: text('location').notNull(),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  currentAmount: real('currentAmount').notNull(),
  date: integer('date').notNull(),
  icon: text('icon').default('target'),
  category: text('category').default('outros'),
});

export const stock = sqliteTable('stock', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  quantity: integer('quantity').notNull(),
  quantityDesired: integer('quantityDesired').notNull(),
});

export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  location: text('location'),
  quantity: integer('quantity').notNull(),
  amount: real('amount').notNull(),
  date: integer('date').notNull(),
});

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  list_id: text('list_id').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  quantity: integer('quantity').notNull(),
  quantityDesired: integer('quantityDesired').notNull(),
  location: text('location'),
  date: integer('date').notNull(),
});

export const config = sqliteTable('config', {
  id: text('id').primaryKey(),
  colorModeState: text('colorModeState'),
  isAiEnabled: integer('isAiEnabled'),
  apiKey: text('apiKey'),
  isShowLabelOnNavigation: integer('isShowLabelOnNavigation'),
  isEnableTitheCard: integer('isEnableTitheCard'),
  isEnableTotalHistoryCard: integer('isEnableTotalHistoryCard'),
  willAddFuelToTransactionList: integer('willAddFuelToTransactionList'),
  willUsePrefixToRemoveTihteSum: integer('willUsePrefixToRemoveTihteSum'),
  simpleFinancesItem: integer('simpleFinancesItem'),
  marketSimplifiedItems: integer('marketSimplifiedItems'),
  prefixTithe: text('prefixTithe'),
  veicleName: text('veicleName'),
  veicleBrand: text('veicleBrand'),
  veicleYear: text('veicleYear'),
  veicleColor: text('veicleColor'),
  veiclePlate: text('veiclePlate'),
  veicleAutonomy: real('veicleAutonomy'),
  selectedFolderToSave: text('selectedFolderToSave'),
  isBiometricEnabled: integer('isBiometricEnabled'),
  // Tithe JFA: % custom + base Ganhos + menu flag
  tithePercent: real('tithePercent'),
  titheCategories: text('titheCategories'),
  isTitheMenuEnabled: integer('isTitheMenuEnabled'),
  hasSeenInteractiveTour: integer('hasSeenInteractiveTour'),
});

export const tithePayments = sqliteTable('tithe_payments', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  date: integer('date').notNull(),
  month: integer('month'),
  year: integer('year'),
  createdAt: integer('createdAt'),
});

// snake_case alias for compatibility with raw SQL expectations
export const tithe_payments = tithePayments;
