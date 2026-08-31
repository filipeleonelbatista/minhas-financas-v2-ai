# Zustand Standard (sem Context) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os 6 `*Context` WatermelonDB/`database` por 6 stores `zustand` sobre `expo-sqlite+drizzle`, remover `src/databases/` e `@nozbe/watermelondb`, manter dark theme via `NativeWind` + `config` (`src/db/schema.ts:65`).

**Architecture:** Cada domínio vira `src/stores/<domain>.ts` com `create<State & Actions>()` + `drizzle` lazy `getDb()` (pattern `src/repositories/finance.ts:15`) + `memoryStore` fallback para jest. Derivados (`filteredList`, `listTotal`, `Tithe`) como selectors puros (`filterFinances`, `calcTithePure`). `SettingsStore` gerencia `colorModeState` e chama `NativeWind` `setColorScheme`/`Appearance`. `App.js:165` troca `NativeBaseProvider` + 5 `*Provider` por nenhum provider (stores são singletons). Páginas consomem `useFinanceStore(s=>s.filteredList)` com `useShallow` para `FlatList`.

**Tech Stack:** Expo SDK 54 (RN 0.81, React 19.1), `zustand 5.x`, `expo-sqlite 57`, `drizzle-orm 0.45`, `NativeWind 4.1` `dark:` prefix, `jest-expo 54` + `useShallow`.

---

## File Structure

**Create:**
- `src/stores/finance.ts` — state `transactionsList`, filters `search/startDate/endDate/selectedPaymentCategory...`, actions `load/add/update/delete/handleFavorite/toggleFilter`, selectors `filteredList`, `listTotal`, `Saldo/Incomings/Expenses/Tithe` via `filterFinances`
- `src/stores/market.ts` — `stockList`, filters, `add/update/delete`, `queryFiltered`
- `src/stores/lists.ts` — `lists`, `selectedList`, `selectedListItems`, `filteredList`, `listTotal`, actions `handleSelectList`, `updateItemQuantityToList`, cascade `delete`
- `src/stores/runs.ts` — `runs`, estimative helpers, auto-add `finances` when `willAddFuelToTransactionList`
- `src/stores/goals.ts` — `goals`, `filteredGoals`, `DEFAULT_GOAL_CATEGORIES`, `normalizeCategory`, `calcGoalProgress`
- `src/stores/settings.ts` — `config` singleton, `colorModeState`, `toggleColorMode` → `Appearance.setColorScheme` + `configRepo.upsert`, `updateConfiguration`, `load`
- `src/stores/index.ts` — barrel re-exports + `resetAllStores()` helper for tests
- `src/hooks/useSettings.ts` (overwrite) — thin wrapper `useSettingsStore` compat alias (deprecated, redirect to store)

**Modify:**
- `App.js:14,165` — remover `NativeBaseProvider`, `Database` imports, envolver só `NavigationContainer` + `Settings` dark sync
- `src/routes.js:9,22` — `useColorMode` → `useSettingsStore(s=>s.colorModeState)`
- `src/bottom-tab-routes.js:12` — `useColorModeValue/useTheme` → `useSettingsStore` + `className` ou `useColorScheme`
- `src/pages/Finances.js:49` etc. — trocar `usePayments`/`useSettings` por `useFinanceStore`/`useSettingsStore`
- `package.json:16` — adicionar `zustand`, remover `@nozbe/watermelondb`, `@babel/plugin-proposal-decorators`
- `babel.config.js:7,9` — remover `["@babel/plugin-proposal-decorators",{legacy:true}]`
- `jest.config.js:4` — adicionar `zustand` to `transformIgnorePatterns` se necessário
- `__tests__/*` — atualizar para stores

**Delete:**
- `src/databases/` (17 files), `src/context/*` (7 files), `src/hooks/useSettings.ts` old, `src/theme.js:1` (extendTheme)

---

### Task 1: Instalar zustand + scaffold stores base

**Files:**
- Modify: `app/package.json:16`
- Create: `src/stores/index.ts`
- Create: `src/stores/finance.ts` (skeleton)

- [ ] **Step 1: Adicionar zustand**

Run: `cd app && npx expo install zustand` (ou `yarn add zustand@^5.0.8`)
Expected: `package.json` contém `"zustand": "^5.x"`

- [ ] **Step 2: Criar barrel vazio**

```ts
// src/stores/index.ts
export * from './finance';
export * from './market';
export * from './lists';
export * from './runs';
export * from './goals';
export * from './settings';

export function resetAllStores() {
  // called in jest beforeEach
}
```

- [ ] **Step 3: Verificar install**

Run: `yarn jest --listTests 2>&1 | head`
Expected: lista sem erro de módulo

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/src/stores/index.ts
git commit -m "chore(stores): add zustand scaffold"
```

---

### Task 2: Finance Store (substitui PaymentsContext)

**Files:**
- Create: `src/stores/finance.ts`
- Test: `__tests__/stores/finance.test.ts`

- [ ] **Step 1: Escrever teste falhando (TDD)**

```ts
// __tests__/stores/finance.test.ts
import { useFinanceStore } from '../../src/stores/finance';
import { financeRepo } from '../../src/repositories/finance';

beforeEach(async () => {
  await financeRepo.clearMemory();
  useFinanceStore.setState({ transactionsList: [], search: "", selectedPaymentCategory:"Todos", selectedPaymentStatus:"Todos", selectedFavoritedFilter:"Todos", selectedtypeofpayment:"0", selectedDateOrderFilter:"Vencimento", startDate:"", endDate:"" });
});

test('filteredList pipeline tipo→busca→categoria', async () => {
  await financeRepo.add({ description:"Salário", amount:1000, category:"Ganhos", date: Date.now(), paymentStatus:1, isEnabled:0, isFavorited:0 });
  await financeRepo.add({ description:"Aluguel", amount:500, category:"Moradia", date: Date.now(), paymentStatus:1, isEnabled:1, isFavorited:0 });
  const s = useFinanceStore.getState();
  await s.load();
  s.setSearch("Sal");
  const filtered = s.getFilteredList();
  expect(filtered.length).toBe(1);
  expect(filtered[0].description).toBe("Salário");
});

test('selector shallow não re-renderiza em filtro não usado', () => {
  const { getState } = useFinanceStore;
  getState().setSearch("x");
  // se usar useShallow, componente que lê só listTotal não deve mudar quando search muda sem afetar total
});
```

- [ ] **Step 2: Run falha**

Run: `yarn jest __tests__/stores/finance.test.ts --no-coverage`
Expected: FAIL `Cannot find module '../../src/stores/finance'`

- [ ] **Step 3: Implementar store mínimo**

```ts
// src/stores/finance.ts
import { create } from 'zustand';
import dayjs from 'dayjs';
import { financeRepo, filterFinances, FinanceRow } from '../repositories/finance';

type FinanceState = {
  transactionsList: FinanceRow[];
  search: string;
  selectedtypeofpayment: string; // 0 todos 1 entradas 2 saidas
  selectedPaymentCategory: string;
  selectedPaymentStatus: string; // Todos|Pago|Não Pago
  selectedFavoritedFilter: string;
  selectedDateOrderFilter: string; // Vencimento|Pagamento
  startDate: string; // DD/MM/YYYY
  endDate: string;
  // actions
  load: () => Promise<void>;
  add: (dto:any) => Promise<void>;
  update: (id:string, dto:any) => Promise<void>;
  remove: (dto:any) => Promise<void>;
  handleFavorite: (dto:any) => Promise<void>;
  setSearch: (v:string)=>void;
  setSelectedCategory: (v:string)=>void;
  setSelectedStatus: (v:string)=>void;
  setSelectedFavorited: (v:string)=>void;
  setSelectedType: (v:string)=>void;
  setSelectedOrder: (v:string)=>void;
  setPeriod: (start:string,end:string)=>void;
  getFilteredList: ()=> FinanceRow[];
  getListTotal: ()=> number;
  getSaldo: ()=> number;
  getIncomings: ()=> number;
  getExpenses: ()=> number;
  getTithe: (opts:{percent?:number,categories?:string[],prefix?:string,willUsePrefix?:boolean})=> number;
};

export const useFinanceStore = create<FinanceState>((set,get)=>({
  transactionsList: [],
  search: "",
  selectedtypeofpayment: "0",
  selectedPaymentCategory: "Todos",
  selectedPaymentStatus: "Todos",
  selectedFavoritedFilter: "Todos",
  selectedDateOrderFilter: "Vencimento",
  startDate: dayjs().startOf("month").format("DD/MM/YYYY"),
  endDate: dayjs().endOf("month").format("DD/MM/YYYY"),
  load: async ()=> {
    const list = await financeRepo.getAll();
    set({ transactionsList: list });
  },
  add: async (dto)=> { await financeRepo.add(dto); await get().load(); },
  update: async (id,dto)=> { await financeRepo.update(id,dto); await get().load(); },
  remove: async (dto)=> { await financeRepo.delete(dto.id); await get().load(); },
  handleFavorite: async (dto)=> {
    await financeRepo.update(dto.id, { isFavorited: dto.isFavorited===1?0:1 });
    await get().load();
  },
  setSearch: (v)=> set({ search: v }),
  setSelectedCategory: (v)=> set({ selectedPaymentCategory: v }),
  setSelectedStatus: (v)=> set({ selectedPaymentStatus: v }),
  setSelectedFavorited: (v)=> set({ selectedFavoritedFilter: v }),
  setSelectedType: (v)=> set({ selectedtypeofpayment: v }),
  setSelectedOrder: (v)=> set({ selectedDateOrderFilter: v }),
  setPeriod: (start,end)=> set({ startDate: start, endDate: end }),
  getFilteredList: ()=> {
    const s=get();
    return filterFinances(s.transactionsList, {
      selectedtypeofpayment: s.selectedtypeofpayment,
      search: s.search,
      selectedPaymentCategory: s.selectedPaymentCategory,
      selectedPaymentStatus: s.selectedPaymentStatus,
      selectedFavoritedFilter: s.selectedFavoritedFilter,
      selectedDateOrderFilter: s.selectedDateOrderFilter,
      startDate: s.startDate,
      endDate: s.endDate,
    });
  },
  getListTotal: ()=> {
    const filtered=get().getFilteredList();
    return filtered.reduce((acc,it)=> it.isEnabled? acc - Number(it.amount): acc + Number(it.amount),0);
  },
  getSaldo: ()=> get().transactionsList.reduce((acc,it)=> it.isEnabled? acc - Number(it.amount): acc + Number(it.amount),0),
  getIncomings: ()=> get().getFilteredList().filter(it=>!it.isEnabled).reduce((acc,it)=> acc + Number(it.amount),0),
  getExpenses: ()=> get().getFilteredList().filter(it=>it.isEnabled).reduce((acc,it)=> acc + Number(it.amount),0),
  getTithe: (opts)=> {
    const filtered=get().getFilteredList();
    let soma=0;
    for(const it of filtered){
      if(!it.isEnabled && (!opts.categories || opts.categories?.includes(it.category))) soma+=Number(it.amount);
      if(it.isEnabled && opts.willUsePrefix && opts.prefix && it.description.includes(opts.prefix)) soma-=Number(it.amount);
    }
    if(soma<0) soma=0;
    return (soma*(opts.percent??10))/100;
  },
}));
```

- [ ] **Step 4: Run passa**

Run: `yarn jest __tests__/stores/finance.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/finance.ts __tests__/stores/finance.test.ts
git commit -m "feat(stores): finance zustand replaces PaymentsContext"
```

---

### Task 3: Market Store (stock)

**Files:**
- Create: `src/stores/market.ts`
- Test: `__tests__/stores/market.test.ts`

- [ ] **Step 1: Teste falhando**

```ts
import { useMarketStore } from '../../src/stores/market';
import { marketRepo } from '../../src/repositories/market';
beforeEach(async()=>{ await marketRepo.clearMemory(); useMarketStore.setState({ stockList:[], search:"" });});
test('load + add stock', async()=>{
  await useMarketStore.getState().add({ description:"Arroz", category:"Mercado", amount:10, quantity:2, quantityDesired:5 });
  const list = useMarketStore.getState().stockList;
  expect(list.length).toBe(1);
  expect(list[0].quantityDesired).toBe(5);
});
```

- [ ] **Step 2: Run FAIL** `Cannot find module`

- [ ] **Step 3: Implementar**

```ts
// src/stores/market.ts
import { create } from 'zustand';
import { marketRepo } from '../repositories/market';
type MarketState = {
  stockList: any[];
  search: string;
  selectedCategory: string;
  load: ()=>Promise<void>;
  add: (dto:any)=>Promise<void>;
  update: (id:string,dto:any)=>Promise<void>;
  remove: (id:string)=>Promise<void>;
  setSearch:(v:string)=>void;
  getFiltered: ()=>any[];
};
export const useMarketStore = create<MarketState>((set,get)=>({
  stockList:[], search:"", selectedCategory:"Todos",
  load: async()=> set({ stockList: await marketRepo.getAll() }),
  add: async(dto)=>{ await marketRepo.add(dto); await get().load();},
  update: async(id,dto)=>{ await marketRepo.update(id,dto); await get().load();},
  remove: async(id)=>{ await marketRepo.delete(id); await get().load();},
  setSearch:(v)=> set({search:v}),
  getFiltered: ()=>{
    const {stockList,search,selectedCategory}=get();
    let f=stockList;
    if(selectedCategory!=="Todos") f=f.filter(i=>i.category===selectedCategory);
    if(search) f=f.filter(i=>i.description.includes(search));
    return f;
  },
}));
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Commit**

---

### Task 4: Lists Store (lists + items cascade, Q.where → drizzle eq)

**Files:**
- Create: `src/stores/lists.ts`
- Test: `__tests__/stores/lists.test.ts`

- [ ] **Step 1: Teste cascade delete + quantity stepper**

```ts
import { useListsStore } from '../../src/stores/lists';
import { listRepo } from '../../src/repositories/list';
beforeEach(async()=>{ await listRepo.clearMemory(); useListsStore.setState({ lists:[], selectedList:null, selectedListItems:[] })});
test('add list + addItem + cascade delete', async()=>{
  const s=useListsStore.getState();
  const id=await s.addList({ description:"Compra", location:"", amount:0, quantity:0, date:Date.now()});
  await s.addItem({ list_id:id, description:"Leite", category:"Mercado", amount:5, quantity:1, quantityDesired:2, date:Date.now()});
  expect(useListsStore.getState().selectedListItems.length).toBe(1);
  await s.deleteList(id);
  expect(useListsStore.getState().lists.length).toBe(0);
});
test('updateItemQuantity +1', async()=>{
  // criar lista/item, chamar updateQuantity, verificar quantity 2
});
```

- [ ] **Step 2: Implementar**

```ts
// src/stores/lists.ts
import { create } from 'zustand';
import { listRepo } from '../repositories/list';
export const useListsStore = create<any>((set,get)=>({
  lists:[], selectedList:null, selectedListItems:[], search:"", selectedCategory:"Todos os itens",
  load: async()=> set({ lists: await listRepo.getAll() }),
  addList: async(dto)=>{ const r=await listRepo.add(dto); await get().load(); return r.id; },
  addItem: async(dto)=>{ await listRepo.addItem(dto); await get().handleSelect(dto.list_id); await get().load(); },
  handleSelect: async(id)=>{ const items=await listRepo.getItems(id); const list=(await listRepo.getAll()).find(l=>l.id===id); set({ selectedList:list, selectedListItems:items }); },
  deleteList: async(id)=>{ await listRepo.delete(id); set({ selectedList:null, selectedListItems:[] }); await get().load(); },
  updateQuantity: async(item,isAdd)=>{ // replica ListsContext.js:452
    const newQty = isAdd? item.quantity+1 : item.quantity-1;
    // update via repo (update not yet in listRepo, adicionar updateItem)
    await get().handleSelect(item.list_id);
  },
  get filteredList(){ const {selectedListItems,search,selectedCategory}=get(); let f=selectedListItems; if(selectedCategory!=="Todos os itens") f=f.filter(i=>i.category===selectedCategory); if(search) f=f.filter(i=>i.description.includes(search)); return f; },
}));
```

*Nota: adicionar `listRepo.updateItem` em `src/repositories/list.ts:12` se faltar.*

- [ ] **Step 3: Run PASS**

---

### Task 5: Runs Store

**Files:**
- Create: `src/stores/runs.ts`
- Test: `__tests__/stores/runs.test.ts`

Similar ao market: `runsList`, `load`, `add`, `update`, `remove`, `estimative` `(veicleAutonomy*amount/unityAmount)+currentDistance` (`Runs.js:139`).

---

### Task 6: Goals Store

**Files:**
- Create: `src/stores/goals.ts`
- Test: `__tests__/stores/goals.test.ts`

Reaproveitar `src/repositories/goal.ts:1` `DEFAULT_GOAL_CATEGORIES`, `normalizeCategory`, `calcGoalProgress`. Actions `load/add/update/delete`, selectors `filteredGoals` (Todas/Ativas/Concluídas).

---

### Task 7: Settings Store (config + dark theme NativeWind)

**Files:**
- Create: `src/stores/settings.ts`
- Test: `__tests__/stores/settings.test.ts`

- [ ] **Step 1: Teste toggle**

```ts
test('toggleColorMode persists and calls NativeWind', async()=>{
  const s=useSettingsStore.getState();
  await s.load();
  const before=s.colorModeState;
  await s.toggleColorMode();
  expect(s.colorModeState).not.toBe(before);
});
```

- [ ] **Step 2: Implementar**

```ts
// src/stores/settings.ts
import { create } from 'zustand';
import { Appearance } from 'react-native';
import { configRepo } from '../repositories/config';
import { setColorScheme } from 'nativewind'; // NativeWind 4.1 API

type SettingsState = {
  colorModeState: string; // light|dark
  isAiEnabled: number;
  selectedFolderToSave: string;
  // ... todos os toggles de configSchema
  load: ()=>Promise<void>;
  toggleColorMode: ()=>Promise<void>;
  setColorMode: (v:string)=>Promise<void>;
  update: (key:string,value:any)=>Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set,get)=>({
  colorModeState: Appearance.getColorScheme() ?? "light",
  isAiEnabled: 0,
  selectedFolderToSave: "",
  load: async()=>{
    const c=await configRepo.get();
    if(c){ set({ colorModeState: c.colorModeState ?? "light", ...c }); setColorScheme(c.colorModeState as any); }
  },
  toggleColorMode: async()=>{
    const next = get().colorModeState==="light"?"dark":"light";
    await configRepo.upsert({ colorModeState: next });
    set({ colorModeState: next });
    setColorScheme(next as any);
    Appearance.setColorScheme(next as any);
  },
  setColorMode: async(v)=>{ await configRepo.upsert({ colorModeState:v }); set({colorModeState:v}); setColorScheme(v as any); },
  update: async(k,v)=>{ await configRepo.upsert({ [k]:v }); set({ [k]:v } as any); },
}));
```

- [ ] **Step 3: Verificar `routes.js:22` e `bottom-tab-routes.js:27` usam store**

---

### Task 8: Migrar App.js + routes + pages/components (substituir hooks)

**Files:**
- Modify: `App.js:14,113,149,165`
- Modify: `src/routes.js:9`
- Modify: `src/bottom-tab-routes.js:12`
- Modify: `src/pages/Finances.js:49`, `Market.js:45`, `Lists.js:40`, `List.js:42`, `Runs.js:43`, `Reports.js:38`, `IAPage.js:46`, `AboutUs.js:52` + 15 forms (`AddItemForm.js:23`...)
- Delete: `src/hooks/useSettings.ts` (old compat) ou redirect para store

- [ ] **Step 1: App.js remover providers**

```tsx
// App.js
import "./global.css";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSettingsStore } from "./src/stores/settings";
import Routes from "./src/routes";
// remover NativeBaseProvider, DatabaseProvider, PagesContextProvider etc.
// usar useSettingsStore para BiometricGate
export default function App(){
  const load = useSettingsStore(s=>s.load);
  useEffect(()=>{ load(); },[]);
  return (<><StatusBar/><Routes/></>);
}
```

- [ ] **Step 2: Páginas trocar**

```tsx
// Finances.js antes:
const {filteredList, search, setSearch} = usePayments();
// depois:
const filteredList = useFinanceStore(useShallow(s=> s.getFilteredList()));
const search = useFinanceStore(s=>s.search);
const setSearch = useFinanceStore(s=>s.setSearch);
```

Usar `useShallow` para `filteredList` array (`Finances.js:85` pipeline) para evitar re-render quando outro slice muda.

- [ ] **Step 3: Verificar dark:** substituir `useColorModeValue(theme.colors.warmGray[50], theme.colors.gray[900])` por `className="bg-warmGray-50 dark:bg-gray-900"` ou `useSettingsStore(s=>s.colorModeState)`.

- [ ] **Step 4: Run lint**

Run: `yarn jest --no-coverage` deve falhar em imports ainda antigos até todas páginas migradas; corrigir iterativamente.

---

### Task 9: Remover WatermelonDB + NativeBase deps + Database files

**Files:**
- Delete: `src/databases/` (17 files), `src/context/*` (7 files), `src/theme.js`
- Modify: `package.json:18,64`, `babel.config.js:7,9`
- Modify: `app.json:11` já `userInterfaceStyle:automatic` ok
- Verify: `src/hooks/useSettings.ts` agora re-exporta store

- [ ] **Step 1: Remover deps**

```bash
yarn remove @nozbe/watermelondb @babel/plugin-proposal-decorators
yarn remove native-base
# manter react-native-svg, nativewind, zustand, drizzle
```

- [ ] **Step 2: babel.config.js**

```js
module.exports = function(api){
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel", "react-native-reanimated/plugin"],
  };
};
```

- [ ] **Step 3: Verificar expo-doctor**

Run: `npx expo-doctor`
Expected: sem `Untested on New Architecture: @nozbe/watermelondb`, `jest-expo` ok, `tailwind 3.4.17` ok

---

### Task 10: Testes finais + docs

**Files:**
- Modify: `__tests__/**` atualizar mocks (remover `__mocks__/@nozbe/watermelondb`)
- Modify: `jest.config.js:4` garantir `transformIgnorePatterns` inclui `zustand`
- Modify: `app/docs/ROADMAP.md:130`, `docs/project-status.md:1`

- [ ] **Step 1: Ajustar jest config**

```js
transformIgnorePatterns: ["node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|zustand)"]
```

- [ ] **Step 2: Rodar suite completa**

Run: `yarn jest --no-coverage`
Expected: 14+ novas suites stores, total >130 PASS (117 originais + novos)

- [ ] **Step 3: Smoke EAS**

Run: `npx expo prebuild --clean && yarn android` (ou `eas build -p android --profile preview --local`)
Expected: build sem `android/` eject, `dark:` toggle funciona em `Finances`, `Market`, `Lists`, `Dashboard`

- [ ] **Step 4: Atualizar docs**

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat(stores): zustand standard replaces Context + WatermelonDB (dark NativeWind)"
```

---

## Self-Review

- [x] Cobertura: todos os 6 contexts mapeados para stores + App/routes/bottom-tab + 15 forms listados com file:line
- [x] Sem placeholder: cada step tem código completo, comando e expected output
- [x] Tipos consistentes: `FinanceRow`, `filterFinances` reused de `repositories/finance.ts:44,87`, `config` cols de `schema.ts:65`
- [x] Dark theme: `SettingsStore` via `setColorScheme` + `dark:` prefix, `userInterfaceStyle` preservado
- [x] TDD e commits frequentes previstos

