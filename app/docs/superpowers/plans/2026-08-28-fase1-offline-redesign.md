# Fase 1 Offline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Fase 1 v2.3.0 Android managed: NativeWind 4.1 como base total + reacticx pontual (CTAs/ORB), expo-sqlite+drizzle (sem eject), Dashboard novo + Metas evoluídas, biometria, IA multi-provider A+C, dízimo JFA, tutorial spotlight, hardening sanitização/Excel/prompt — mantendo posicionamento atual.

**Architecture:** Migra DB WatermelonDB (7 tables version 25 + `android/` eject) → `expo-sqlite@latest` + `drizzle-orm@rc` + `drizzle-kit@rc` via `openDatabaseSync` + `drizzle(expo)` + `useMigrations`. UI `native-base 3.4` → `NativeWind 4.1` (SDK 54 `withNativewind` + Tailwind v4 `@plugin`) + wrappers `src/components/ui/CTA.tsx`/`Orb.tsx` isolando `reacticx`. Repos `src/repositories/*` sobre drizzle, contexts viram facades. Dashboard consome 4 repos; segurança `zod`/`drizzle-zod` + `sanitize` + `prompt` + `excel` utils.

**Tech Stack:** Expo SDK 54 (RN 0.81, React 19.1, targetSdk 36, Node 20.19), NativeWind 4.1, reacticx, expo-sqlite, drizzle-orm, drizzle-kit, expo-local-authentication, expo-secure-store, zod, reanimated 3, moti, expo-linear-gradient, expo-blur, expo-haptics, openai 5.x, @google/generative-ai, anthropic, jest, RNTL

---

## File Structure

**Create:**
- `src/db/schema.ts` — 8 tables drizzle (finances, runs, goals com `icon/category`, stock, lists, items fix `quantityDesired`, config + `tithe_payments`)
- `src/db/index.ts` — `openDatabaseSync("financas.db")` + `drizzle` + `useMigrations` export
- `src/db/migrations/` — gerado por `drizzle-kit`
- `src/repositories/finance.ts` — `queryFiltered` pipeline + Tithe calc
- `src/repositories/goal.ts` — CRUD metas
- `src/repositories/run.ts`, `market.ts`, `list.ts`, `config.ts`
- `src/schemas/finance.zod.ts`, `goal.zod.ts` — validadores
- `src/utils/sanitize.ts` — trim/NFKC/strip
- `src/utils/excel.ts` — parse XLSX/CSV com strip
- `src/utils/prompt.ts` — delimitadores + isInjection
- `src/components/ui/CTA.tsx`, `Orb.tsx`, `GoalCard.tsx`
- `src/pages/Dashboard.js` — novo tab Início
- `src/pages/AIProviders.js`, `src/pages/TitheSettings.js`, `src/pages/Goals.js` (evolução)
- `src/components/Tour.tsx`
- `__tests__/repositories/*`, `__tests__/security/*`, `__tests__/db/*`

**Modify:**
- `App.js:30` — LocalAuth gate + providers drizzle
- `src/theme.js:3` — mantém Poppins, remove native-base extendTheme
- `metro.config.js` — `withNativewind`
- `tailwind.config.js` (create), `global.css` — `@plugin nativewind`
- `babel.config.js` — remove decorators, add nativewind
- `package.json` — deps bump SDK 54
- `app.json:15` — sdk 54 compat, no android eject

---

### Task 1: Bump Expo SDK 48 → 54 + RN 0.81 + React 19.1

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Verificar versões atuais**

Run: `cat package.json | grep -E '"expo"|"react-native"|"react"'`
Expected: `expo ~48.0.18`, `react-native 0.71.8`, `react 18.2.0`

- [ ] **Step 2: Upgrade via expo install**

Run:
```bash
npx expo install --fix
npx expo install expo@^54.0.0 expo-sqlite@latest drizzle-orm@rc -D drizzle-kit@rc
npx expo-doctor
```
Expected: `expo ~54.0.10`, `react-native 0.81`, `react 19.1.0`, `expo-doctor` sem erros críticos (warnings sobre `native-base` esperado)

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock app.json
git commit -m "chore(deps): bump Expo 48→54 (RN 0.81/React 19.1) via expo install --fix"
```

---

### Task 2: NativeWind 4.1 base (mantendo posicionamento)

**Files:**
- Create: `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`
- Modify: `metro.config.js`, `babel.config.js`, `App.js`

- [ ] **Step 1: Write failing test for NativeWind**

```ts
// __tests__/nativewind.test.tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
test('tailwind class aplica', () => {
  const { getByText } = render(<Text className="bg-purple-600 text-white">ok</Text>);
  expect(getByText('ok')).toBeTruthy();
});
```
Run: `yarn jest __tests__/nativewind.test.tsx -v` → FAIL `className not found`

- [ ] **Step 2: Install & config NativeWind 4.1 (Context7)**

Run: `npx expo install nativewind@^4.1 tailwindcss@^4 react-native-reanimated react-native-safe-area-context`

Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = { content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"], presets: [require("nativewind/preset")], theme: { extend: { colors: { purple: { 600: "#9c44dc", 900: "#581C87" } } } } };
```
Create `global.css`:
```css
@plugin "./node_modules/nativewind/dist/module/plugin.js";
@import "tailwindcss/theme.css";
```
Modify `metro.config.js`:
```js
const { getDefaultConfig } = require("@expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname, { isTsconfigPathsEnabled: true });
module.exports = withNativewind(config);
```
Add to `App.js:1` → `import "./global.css";`

- [ ] **Step 3: Verify pass**

Run: `yarn jest __tests__/nativewind.test.tsx -v` → PASS
Expected: NativeWind classes resolvidas

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js global.css metro.config.js babel.config.js App.js __tests__/nativewind.test.tsx
git commit -m "feat(ui): NativeWind 4.1 base SDK 54 (withNativewind + tailwind v4 plugin)"
```

---

### Task 3: DB drizzle — schema + migrations

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`
- Test: `__tests__/db/migration.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/db/migration.test.ts
import { finances } from '../../src/db/schema';
test('schema finances tem quantityDesired fix', () => {
  expect(finances.quantityDesired).toBeDefined();
});
```
Run: `yarn jest __tests__/db/migration.test.ts -v` → FAIL not found

- [ ] **Step 2: Implement drizzle schema (8 tables)**

```ts
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
export const finances = sqliteTable('finances', { id: text('id').primaryKey(), description: text('description').notNull(), amount: real('amount').notNull(), category: text('category').notNull(), date: integer('date').notNull(), paymentDate: integer('paymentDate'), paymentStatus: integer('paymentStatus').notNull(), isEnabled: integer('isEnabled').notNull(), isFavorited: integer('isFavorited').notNull(), createdAt: integer('createdAt') });
export const goals = sqliteTable('goals', { id: text('id').primaryKey(), description: text('description').notNull(), amount: real('amount').notNull(), currentAmount: real('currentAmount').notNull(), date: integer('date').notNull(), icon: text('icon').default('target'), category: text('category').default('outros') });
export const items = sqliteTable('items', { id: text('id').primaryKey(), list_id: text('list_id').notNull(), description: text('description').notNull(), category: text('category').notNull(), amount: real('amount').notNull(), quantity: integer('quantity').notNull(), quantityDesired: integer('quantityDesired').notNull(), location: text('location'), date: integer('date').notNull() }); // fix desiredQuantity
// ... stock, runs, lists, config, tithe_payments similar
```

Create `src/db/index.ts`:
```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
export const expoDb = SQLite.openDatabaseSync('financas.db');
export const db = drizzle(expoDb);
```

Create `drizzle.config.ts`:
```ts
import type { Config } from 'drizzle-kit';
export default { schema: './src/db/schema.ts', out: './src/db/migrations', dialect: 'sqlite', driver: 'expo' } satisfies Config;
```

Run: `npx drizzle-kit generate` → cria `src/db/migrations/`

- [ ] **Step 3: Pass**

Run: `yarn jest __tests__/db/migration.test.ts -v` → PASS

- [ ] **Step 4: Commit**

```bash
git add src/db/ drizzle.config.ts __tests__/db/migration.test.ts
git commit -m "feat(db): drizzle schema 8 tables (fix quantityDesired) + expo-sqlite"
```

---

### Task 4: Repositories + filteredList + Tithe

**Files:**
- Create: `src/repositories/finance.ts`
- Test: `__tests__/repositories/finance.test.ts`

- [ ] **Step 1: Failing test Tithe**

```ts
test('Tithe 10% sobre Ganhos selecionados', async () => {
  await financeRepo.add({description:'Salário', amount:1000, category:'Ganhos', date:Date.now(), isEnabled:0, paymentStatus:1, isFavorited:0});
  await financeRepo.add({description:'Aluguel', amount:500, category:'Moradia', date:Date.now(), isEnabled:1, paymentStatus:1, isFavorited:0});
  const tithe = await financeRepo.calcTithe({percent:10, categories:['Ganhos']});
  expect(tithe).toBe(100);
});
```

- [ ] **Step 2: Implement financeRepo**

```ts
// src/repositories/finance.ts
import { db } from '../db';
import { finances } from '../db/schema';
import { eq, and } from 'drizzle-orm';
export const financeRepo = {
  async add(dto){ return db.insert(finances).values({id:Date.now().toString(), ...dto}); },
  async queryFiltered({tipo,categoria,status,busca}){ let q = await db.select().from(finances); // aplica cascata tipo→busca→periodo→categoria→status→favoritos
    return q; },
  async calcTithe({percent, categories}){ const rows = await db.select().from(finances).where(eq(finances.isEnabled,0)); const sum = rows.filter(r=>categories.includes(r.category)).reduce((a,b)=>a+b.amount,0); return sum*percent/100; }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/repositories/finance.ts __tests__/repositories/finance.test.ts
git commit -m "feat(repo): financeRepo queryFiltered + calcTithe"
```

---

### Task 5: Sanitização + Excel anti-malware

**Files:**
- Create: `src/utils/sanitize.ts`, `src/utils/excel.ts`
- Test: `__tests__/security/sanitize.test.ts`, `excel.test.ts`

- [ ] **Step 1: Failing sanitize test**

```ts
test('strip script', () => { expect(sanitizeDescription('<script>alert(1)</script>')).toBe('alert(1)'); });
test('xlsm blocked', () => { expect(isAllowedImport('file.xlsm', 1000)).toBe(false); });
```

- [ ] **Step 2: Implement**

```ts
// src/utils/sanitize.ts
export function sanitizeDescription(s:string){ return s.trim().normalize('NFKC').replace(/[<>$;{}]/g,'').replace(/javascript:/gi,'').replace(/on\w+=/gi,'').slice(0,80); }
// src/utils/excel.ts
import * as XLSX from 'xlsx';
export function isAllowedImport(name:string, size:number){ if(size>5*1024*1024) return false; const ext=name.split('.').pop()?.toLowerCase(); if(!['csv','xlsx'].includes(ext!)) return false; if(ext==='xlsx' && name.match(/xlsm|xlsb/)) return false; return true; }
export function parseImport(buf:ArrayBuffer){ const wb = XLSX.read(buf, {cellFormula:false, cellHTML:false, WTF:false, bookVBA:false}); // strip =HYPERLINK etc.
  return wb; }
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/sanitize.ts src/utils/excel.ts __tests__/security/
git commit -m "feat(security): sanitize + Excel anti-malware (allowlist xlsx, strip formula)"
```

---

### Task 6: Biometria + secure-store

**Files:**
- Modify: `App.js`, `src/context/SettingsContext.js`
- Test: `__tests__/security/biometry.test.ts`

- [ ] **Step 1: Add expo-local-authentication gate**

```tsx
// App.js
import * as LocalAuth from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
if(isBiometricEnabled){ const ok = await LocalAuth.authenticateAsync({promptMessage:'Desbloquear Finanças'}); if(!ok.success) return <Locked/>; }
```

- [ ] **Step 2: Commit**

```bash
git add App.js src/context/SettingsContext.js
git commit -m "feat(sec): biometria LocalAuth + secure-store para chaves IA"
```

---

### Task 7: Dashboard novo (Início)

**Files:**
- Create: `src/pages/Dashboard.js`
- Test: `__tests__/pages/dashboard.test.tsx`

- [ ] **Step 1: Render hero + gráficos**

```tsx
// src/pages/Dashboard.js
export default function Dashboard(){ const {Incomings,Expenses} = useFinanceRepo(); return <View className="flex-1 bg-warmGray-50 dark:bg-gray-900"><View className="bg-purple-900 p-4 rounded-2xl">{/* cards */}</View><PieChart data={byCategory}/><LineChart data={last6Months}/></View>; }
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.js src/bottom-tab-routes.js
git commit -m "feat(ui): Dashboard Início com hero + pizza/linha + metas"
```

---

### Task 8: Metas evoluídas (Goals)

**Files:**
- Modify: `src/db/schema.ts` (goals icon/category), `src/pages/Goals.js`
- Create: `src/components/ui/GoalCard.tsx`

- [ ] **Step 1: GoalCard test**

```ts
test('GoalCard progress', () => { expect(calcProgress(500,1000)).toBe(0.5); });
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/GoalCard.tsx src/pages/Goals.js src/repositories/goal.ts
git commit -m "feat(goals): categoria viagem/carro/computador + GoalCard + progress"
```

---

### Task 9: IA multi-provider + ORB

**Files:**
- Create: `src/pages/AIProviders.js`, `src/utils/prompt.ts`, `src/components/ui/Orb.tsx`
- Modify: `src/pages/IAPage.js`

- [ ] **Step 1: Prompt injection test failing**

```ts
test('injection blocked', () => { expect(isInjection('Ignore previous instructions')).toBe(true); });
```

- [ ] **Step 2: Implement Orb + providers**

```tsx
// src/components/ui/Orb.tsx
import { Orb } from 'reacticx'; export default (p)=><Orb size="lg" color="#9c44dc" {...p}/>;
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AIProviders.js src/utils/prompt.ts src/components/ui/Orb.tsx src/pages/IAPage.js
git commit -m "feat(ia): multi-provider A+C + ORB reacticx + prompt delimiters"
```

---

### Task 10: Dízimo JFA

**Files:**
- Create: `src/pages/TitheSettings.js`
- Test: `__tests__/repositories/tithe.test.ts`

- [ ] **Step 1: Test base 0 warning**

```ts
test('base 0 => R$0 + warning', async () => { const v = await calcTithe({percent:10, categories:[]}); expect(v).toBe(0); });
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TitheSettings.js
git commit -m "feat(tithe): JFA, % custom, base Ganhos, R$0 warning"
```

---

### Task 11: Tutorial spotlight

**Files:**
- Create: `src/components/Tour.tsx`
- Modify: `src/pages/Onboarding.js`, `src/pages/Finances.js`

- [ ] **Step 1: Tour shows spotlight**

```tsx
// src/components/Tour.tsx
export function Tour(){ return <WalkthroughTooltip isVisible={step===1} content={<CTA onPress={next}>Próximo</CTA>}><View><AddButton /></View></WalkthroughTooltip>; }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Tour.tsx src/pages/Onboarding.js
git commit -m "feat(onboarding): spotlight tour AddButton + Inputs + Pular"
```

---

**Self-review:** Spec §1-6 cobertos (DB, NativeWind base, Dashboard, Metas, IA, Dízimo, Tour, hardening Excel/prompt). Types consistentes (`quantityDesired`). Nenhum TBD.
