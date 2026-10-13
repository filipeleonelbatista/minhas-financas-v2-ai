# Dossiê Completo — Financas App v2.3.1 (app/ • Managed)

> Atualizado em 2026-10-13 | Projeto: `app/` | Expo ~57.0.19 + React 19.2.3 + React Native 0.86.3 + expo-sqlite/drizzle + zod 3.23.8 + TypeScript strict:true (WatermelonDB/NativeBase/Tour/Reports removidos — Dashboard é a tela oficial de gráficos, SAF Android-only, 35 suites/187 testes PASS)

---

## 1. Visão Geral

App React Native (Expo Managed + Prebuild) para **gestão financeira familiar** com 4 domínios integrados: Finanças, Combustível/Hodômetro, Mercado/Estoque e Metas, com painel Início (Dashboard com gráficos) e IA multi-provider. Evolução da v2.0.2 (Play Store `com.finances`) para v2.2.2 com migração total de `AsyncStorage` para banco SQLite relacional via WatermelonDB e novo domínio de **Listas de Compras**; Fase 1 migrou para `expo-sqlite` + `drizzle-orm` (managed puro).

- **Slug/packge:** `finances` / `com.finances` (`app.json:8`)
- **VersionCode:** 231, **Version:** 2.3.1, **BuildNumber iOS:** 2.3.1, **EAS projectId:** `cd320c43-f9dd-45c7-91be-b39fa3606fd2` (`app.json`, owner `filipeleonelbatista`)
- **Orientação:** portrait only, `userInterfaceStyle: automatic` (segue sistema)
- **Workspace:** `app/` (renomeado de `finances-app-feature-adicionando-watermelondb/` em `ae034a8`; `app/android/` + `app/ios/` ignorados via `.gitignore`, managed puro)
- **Doctor:** `npx expo-doctor` **21/21** (com `expo.install.exclude: ["expo-sqlite","expo", "expo-*", "eslint-config-expo"]`, `android/ios` removidos)

---

## 2. Stack Técnica

### 2.1 Core (SDK 57 — atualizado 2026-09-03)

| Camada | Lib | Versão | Papel |
|---|---|---|---|
| Runtime | `expo` | ~57.0.19 | Managed workflow + EAS Build |
|  | `react` | 19.2.3 |  |
|  | `react-native` | 0.86.3 |  |
|  | `expo-splash-screen` | ~57.0.8 | `preventAutoHideAsync`/`hideAsync` splash gate em `App.js` |
|  | `expo-file-system` | ~57.0.6 | SAF `StorageAccessFramework` (Android) + `documentDirectory` fallback iOS |
|  | `expo-local-authentication` | ~57.0.2 | Biometria `isBiometricAvailable`/`authenticateAsync` |
|  | `expo-secure-store` | ~57.0.3 | Chaves IA por provider |
|  | `expo-sqlite` | ^57.0.2 | SQLite `openDatabaseSync("financas.db")` + `src/db/migrate.ts` `runMigrations()` via `PRAGMA user_version` (one-shot em `App.js:103`) |
|  | `drizzle-orm` / `drizzle-kit` | ^0.45.2 / ^0.31.10 | ORM + migrations (`src/db/schema.ts`, `drizzle.config.ts`) |
|  | `drizzle-zod` / `zod` | ^0.8.3 / ^3.23.8 | Validação `src/schemas/*` (`finance/stock/goal/run/list` + sanitização, única validação — `yup` removido) |
|  | `zustand` | ^5.0.8 | Stores `settings/finance/runs/market/lists/goals` |
| Navegação | `@react-navigation/native` | ^6.1.6 | NavigationContainer + theming |
|  | `@react-navigation/stack` | ^6.3.16 | Stack (Onboarding, MarketStack) |
|  | `@react-navigation/bottom-tabs` | ^6.5.7 | Bottom Tabs |
| UI | `nativewind` | ^4.1 + `tailwindcss@3.4.17` | Design system util-first, `global.css` + `withNativewind` |
|  | `@expo-google-fonts/poppins` | ^0.2.3 | `Poppins_400Regular/600SemiBold` (`App.js:8`) |
|  | `react-native-svg` | 15.15.4 | Necessário para chart-kit |
|  | `react-native-gesture-handler` | ~2.32.0 |  |
|  | `react-native-safe-area-context` | ~5.7.0 |  |
|  | `react-native-reanimated` | 4.5.1 |  |
|  | `react-native-chart-kit` + `react-native-progress` | 6.12.0 / 5.0.0 | PieChart, LineChart, Progress.Bar no `Dashboard` (painel Início, tela oficial de gráficos) |
|  | `@expo/vector-icons` (Feather, FontAwesome, MaterialCommunityIcons, Fontisto, Ionicons, Octicons) | bundled | Ícones em toda UI |
| Forms | `formik` + `zod` | 2.2.9 / 3.23.8 | Validação `zod` única em `src/schemas/*` + `runSchema` em `EditFuelForm.tsx` (yup removido) |
| Data | `zustand` + `drizzle-orm` + `expo-sqlite` | 5 / 0.45 / 57 | SQLite offline-first (WatermelonDB **removido** em Fase 1 gaps) |
|  | `@react-native-async-storage/async-storage` | 2.2.0 | `@onboarding` flag |
|  | `dayjs` + `date-fns` | 1.11.7 / 2.30.0 | Manipulação datas |
|  | `@react-native-community/datetimepicker` | 9.1.0 | `DateTimePickerAndroid.open` |
|  | `@react-native-picker/picker` | 2.11.4 | Dropdowns categoria |
| Export | `expo-file-system` | ~57.0.6 | **SAF iOS branch:** `Platform.OS === 'android' ? StorageAccessFramework.createFileAsync/writeAsStringAsync : FileSystem.writeAsStringAsync(documentDirectory + fileName)` (`AboutUs.js`/`Onboarding.js`) **Android-only, `android.permissions:[]`** |
|  | ~~`expo-media-library`~~ | removido 2026-09-15 | SAF Android-only não exige `READ/WRITE_EXTERNAL_STORAGE`; `checkPermissions()` → `true` em Android |
|  | `expo-document-picker` | ~57.0.1 | `getDocumentAsync` tipo `*/*` (hardening via `isAllowedImport/parseImport`) |
|  | `react-native-csv` | ^0.2.0 | `jsonToCSV`, `readString` (fallback se `parseImport` vazio) |
|  | `xlsx` | ^0.18.5 | Import XLSX com allowlist `xlsx/csv` + `parseImport` hardening (5MB/5k, `cellFormula:false`, `PK\x03\x04`) |
| IA | `openai` | ^4.28.0 | `new OpenAI({apiKey})` via `src/utils/aiProviders.ts` `chatWithFallback` (openai 3.x `Configuration` removido) |
|  | `zustand` + `expo-secure-store` | 5 / 57 | `getProviderKey` por provider |
| Build | `expo-build-properties` | ~57.0.16 | `compileSdk 36/targetSdk 36`, `kotlinVersion 2.1.0` |
|  | `jest-expo` | ~57.0.5 | Preset `jest-expo` |
|  | `eslint` / `eslint-config-expo` | ^8.57 / ~57.0.2 | `npm run lint --max-warnings 0` (sem fallback), `typescript 6.0.3` `strict:true` + `noImplicitAny` + `strictNullChecks` |
| Babel | `nativewind` preset | — | Sem `plugin-proposal-decorators` (WatermelonDB removido), `nativewind/babel` + `react-native-reanimated/plugin` |

### 2.2 Configuração de Build

- **Babel** (`babel.config.js:1`): `babel-preset-expo` (`jsxImportSource: nativewind`) + `nativewind/babel` + `react-native-reanimated/plugin` (decorators removidos).
- **Metro** (`metro.config.js:1`): `getDefaultConfig` + `withNativewind({input:"./global.css"})` (fallback se tailwind mismatch).
- **EAS** (`eas.json:3`): 3 profiles — `development` (`developmentClient:true`, `distribution:internal`), `preview` (APK), `production`.
- **Android** (`app.json:28`): `kotlinVersion: 2.1.20`, `compileSdk 36/targetSdk 36`, `permissions:[]` (SAF Android-only), `adaptiveIcon backgroundColor #581C87`, `package com.finances`. Pasta `android/` **removida** (`rm -rf app/android`, `.gitignore` `android/`), managed puro.
- **iOS** (`app.json:18`): `bundleIdentifier com.finances`, `usesIcloudStorage:true`, `NSPhotoLibraryUsageDescription/Add`, `NSFaceIDUsageDescription`. Pasta `ios/` **removida** (`.gitignore` `ios/`), managed puro; fallback iOS `FileSystem.documentDirectory` mantido default.

---

## 3. Arquitetura & Design System

### 3.1 Estrutura de Pastas (`src/`)

### 3.1 Estrutura de Pastas (`src/`, TypeScript strict)

```
src/
  assets/{icon.png, images/, onboarding/1..7.png}
  routes.tsx                     # Stack root
  bottom-tab-routes.tsx          # 4 tabs + FAB central
  market-stack-routes.tsx        # Stack aninhado Stock->Lists->List
  db/{schema.ts, index.ts, migrate.ts, seed.ts}
  db/migrations/                 # 0000 base + 0001 biometric + 0002 tithe
  repositories/{finance, run, market, list, goal, config, tithe}.ts
  stores/{settings, finance, runs, market, lists, goals, pages}.ts  # zustand 5
  schemas/{finance, stock, goal, run, list, config}.zod.ts          # zod única validação
  utils/{aiProviders, biometry, secureStore, sanitize, excel, prompt, datePicker}.ts
  hooks/{useSettings, usePages, useIsKeyboardOpen, useOpenAi}
  pages/{Onboarding, Dashboard, Finances, Runs, Market, Lists, List, Goals, AboutUs, IAPage, AIProviders, TitheSettings, ActionSheet}.tsx
  components/{Header, EmptyMessage, Loading, ErrorSheet, AIComponent, AddButtton, *Form, SwipeableFinanceRow, nativewindui/, ui/}.tsx
```

### 3.2 Tema, Cores e Tipografia

- **Tema** (`tailwind.config.js` + `global.css`): fonte Poppins (`@expo-google-fonts/poppins`), cores via preset NativeWind.
- **Paleta principal:**
  - Roxo brand: `#9c44dc` (purple 600), `#581C87` (purple 900 — splash e header), tons `#D4AEF0/#DBBCF2` (gráficos do Dashboard)
  - Background light: `warmGray[50]` (#f0f2f5 / #FAFAFA), dark: `gray[900]` #1c1e21, `gray[800]` card dark
  - Texto light: `gray[600]`, dark: `gray[200]`, header `white` / `gray[800]`
  - Semânticas: `green[500]/600` (#12a454 gastos/entradas), `red[500]/600` (#e83e5a saídas), `yellow[400]` favorito
- **Dark/Light** (`src/stores/settings.ts` `colorModeState` + `Appearance`): `NavigationContainer theme background` `dark:#1c1e21 light:#f0f2f5` (`routes.tsx`). `automatic` por padrão (`app.json`). Classes `dark:` do NativeWind trocam bg/text dinamicamente em todas as páginas.
- **Splash/Icon:** `assets/splash.png` bg `#581C87`, `icon.png`/`adaptive-icon.png` (`app.json:12`).
- **Header** (`src/components/Header.js`): altura extensa com `bg purple.900`, `title` + `isLeftIconComponent/isRightIconComponent/isShort` variants. Usado em todas as páginas.
- **Ícones:** Feather (`dollar-sign`, `calendar`, `filter`, `settings`, `trash`, `edit`, `shopping-cart`, `pie-chart`, `arrow-*`), FontAwesome (`car`, `medkit`, `money`, `star`), MaterialCommunityIcons (`fuel`, `lipstick`, `file-plus-outline`, `format-list-bulleted`, `robot-outline`, `account`), Fontisto (`netflix`), Ionicons (`car-sport-outline`, `shirt-outline`), Octicons (`paper-airplane` no chat IA).

### 3.3 Navegação

- **Root Stack** (`src/routes.tsx`): `Onboarding` (initial) -> `TabNavigator` (BottomTabs) -> `Configuracoes` (AboutUs) -> `IAPage` (chat IA) + `AIProviders` + `TitheSettings` + `Goals`. `headerShown:false`.
- **Bottom Tabs** (`src/bottom-tab-routes.tsx`): `Início` (Dashboard, Feather home) | `Finanças` (Feather dollar-sign) | `Adicionar` (botão central `AddButtton` custom) | `Combustível` (MaterialCommunityIcons fuel) | `Mercado` (`MarketStackRoutes`). `tabBarHideOnKeyboard:true`, sem labels. A tela de gráficos oficial é o `Dashboard` (painel Início) — não existe tela `Reports`.
- **Market Stack** (`src/market-stack-routes.tsx`): `Stock` (Market) -> `Lists` -> `List`. Permite `navigation.navigate("Lists")` e `navigate("List")` dentro da tab Mercado.
- **ActionSheet** (`src/pages/ActionSheet.tsx`): fab central que abre `Modal` com `AddItemForm` / `AddShoppingCartItem` / `AddFuelForm` / `AddListForm` / `AddItemListtItem` conforme `usePagesStore.selectedSheet`.

---

## 4. Persistência — expo-sqlite + drizzle (Fase 1, managed puro)

> Histórico: v2.2.2 usava WatermelonDB (`src/databases/`, 7 tabelas, `version:25`, `android/` ejectado). Fase 1 migrou tudo para `expo-sqlite` + `drizzle-orm`; `src/databases/`, `src/context/` e decorators foram removidos.

### 4.1 Conexão e migrações

`src/db/index.ts`: `SQLite.openDatabaseSync("financas.db")` + `drizzle(expoDb)`. `src/db/migrate.ts` `runMigrations()` via `PRAGMA user_version` (one-shot em `App.tsx`), aplicando `src/db/migrations/0000` (base 8 tabelas) + `0001_add_biometric` (`isBiometricEnabled`) + `0002_add_tithe` (`tithe_payments`). Offline-first puro, sem sync.

### 4.2 Tabelas (`src/db/schema.ts`)

| Tabela | Colunas | Notas |
|---|---|---|
| `finances` | `id, description, amount, category, date, paymentDate?, paymentStatus, isEnabled, isFavorited, createdAt` | `isEnabled 1=saída 0=entrada`, `paymentStatus 1=pago` |
| `runs` | `currentDistance, unityAmount (R$/L), amount (total), type, date, location` | Abastecimentos |
| `goals` | `description, currentAmount, amount, date, icon, category` | Metas, categoria normalizada (`normalizeCategory`) |
| `stock` | `description, category, amount (unitário), quantity, quantityDesired` | Estoque mercado |
| `lists` | `description, location, quantity (total itens), amount (total R$), date` | Cabeçalho lista de compras |
| `items` | `list_id (FK manual), description, category, amount, quantity, quantityDesired, location, date` | Debt antigo `desiredQuantity` **corrigido** |
| `config` | singleton: `colorModeState, isAiEnabled, apiKey (legado), ..., isBiometricEnabled, tithePercent, titheCategories, isTitheMenuEnabled, selectedFolderToSave` | 1 row |
| `tithe_payments` | histórico de dízimos pagos (`markAsPaid`) | Fase 1 |

### 4.3 Repositories + stores

Cada `src/repositories/*.ts` encapsula acesso via drizzle prepared statements (sem SQL concatenado):
- `finance.ts` — `getAll/add/update/delete`, `filterFinances` pipeline puro (tipo→busca→período→categoria→status→favoritos→sort) + `calcTithe`/`calcTithePure` com `%` custom e base por categorias.
- `run/market/list/goal/config/tithe.ts` — CRUD por agregado; `list` com cascade `list_id`; `tithe` com `validateTithePercent`, `getMonthlyTithePreview`, `markAsPaid`, `TITHE_SCRIPTURES` (JFA).
- Validação `zod` em `src/schemas/*.zod.ts` + sanitização (`sanitizeDescription/sanitizeAmount/...`) nos repos.
- `src/stores/*.ts` (zustand 5, `useShallow`): `settings/finance/runs/market/lists/goals/pages` — UI consome stores, nunca o db direto.

---

## 5. Mapeamento de Telas & Funcionalidades

### 5.1 Onboarding (`src/pages/Onboarding.tsx`)

7 slides horizontais `FlatList pagingEnabled` com imagens `1..7.png` + botão `Pular` sempre visível. A pasta de exportação (SAF) é solicitada **sob demanda** no export, sem bloquear o onboarding (`Platform.OS === 'android' ? SAF : documentDirectory` — iOS usa `documentDirectory` direto). Flag `@onboarding=true` em AsyncStorage. `Loading` enquanto `waiting`.

Slides: 1 Organize finanças, 2 Export/Import, 3 Compras, 4 Autonomia veículo, 5 Painel Início, 6 IA, 7 Modo escuro.

### 5.2 Finanças (`src/pages/Finances.tsx`)

- **Header:** `Finança` + `heart` (`header-tithe-heart` → `TitheSettings`, se `isTitheMenuEnabled`) + gear -> `Configuracoes`
- **Cards horizontais** (Scroll horizontal): Entradas (green arrow-up), Saídas (red arrow-down), Total (purple 900), Saldo histórico (se `isEnableTotalHistoryCard`), Dízimo `%` custom (se `isEnableTitheCard`, via `getTithe({percent, categories})`).
- **Card mensal do dízimo** (`finances-tithe-monthly`, se `isTitheMenuEnabled`): `Dízimo devido: R$ Y` + CTAs `Configurar` (`finances-tithe-config`) e `Pagar` (`finances-tithe-pay`) → `TitheSettings`.
- **Extrato:** Título + botão `Filtros`. Filtros colapsáveis (`openFilter`):
  - Período: `Input` + `DateTimePickerAndroid` para `startDate/endDate` (default mês atual via PaymentsContext).
  - Tipo: Picker `Todas/Entradas/Saídas` (`selectedtypeofpayment`).
  - Categoria: Picker `categoriesList` (14 opções) — hide se `simpleFinancesItem`.
  - Status pagamento: Chips `Todos/Pago/Não Pago`.
  - Favoritos: Chips `Todos/Favoritos/Não favoritados`.
  - Busca: `Input` `search` quando há itens.
- **Lista:** `filteredList.map` cards com ícone categoria (`categoryItemLib`), `description`, `date/paymentDate`, `category`, `amount` (- prefix se `isEnabled`), badge `Pago/Não Pago`, estrela `isFavorited`. Tap abre `EditItemForm` em `Actionsheet`, long-press toggle favorito.
- **Rodapé:** `listTotal` (soma filtrada) + `<AIComponent/>`.
- **Regras:** `formatCurrency` pt-BR BRL, `Tithe = 10%` de entradas menos saídas com prefixo se `willUsePrefixToRemoveTihteSum`.

### 5.3 Combustível (`src/pages/Runs.js`)

- **Cards topo:** `Km Estimado` (fórmula `(autonomia * valorPago / precoLitro) + kmAtual` de `currentEstimative`), `Autonomia` (press abre `AutonomyForm`), `Km Atual` (último `currentDistance`).
- **Filtro período:** `startDate/endDate` via DateTimePickerAndroid.
- **Lista:** Cards `fuel` icon, `location`, `Km no Abast.`, `date`, `unityAmount` e litros `(amount/unityAmount)`, total `amount`. Tap -> `deleteTransaction`.
- **FAB:** `car-sport-outline` abre `EditVeicleForm` (dados veículo).
- **Integração Finanças:** Se `willAddFuelToTransactionList` ativo, cada `addTransaction` cria também `finances` `Abastecimento - location` categoria Transporte.

### 5.4 Mercado — Estoque (`src/pages/Market.js`) + MarketStack

- **Header isShort:** `Compra` + gear.
- **FABs:** `file-plus-outline` -> `handleAddItensOnBuyList(navigate Lists)` (dialog `Somente em falta / Todos` — cria `lists`+`items`), `format-list-bulleted` -> `Lists`.
- **Filtro categoria** Picker + busca.
- **Cards:** `shopping-bag`, `description`, `category`, `amount` unitário, `quantity` com stepper `- / +` via `updateStock` (se `!marketSimplifiedItems`), badge `Em estoque/Em falta` (`quantityDesired <= quantity`), total `amount*quantity`.
- **Ação:** Tap abre `EditShoppingCartItem` em Actionsheet.
- **Total geral:** `listTotal`.

### 5.5 Listas de Compras (`src/pages/Lists.js` — NOVO)

- Header com back `Stock`.
- Título + subtítulo `Pressione e segure para exportar`.
- Lista `lists.map` cards: `shopping-cart`, `description`, `location` (ou Sem mercado), `quantity itens`, `amount`. Tap `handleSelectList(id) -> navigate List`, long-press `handleExportList(id)`.
- Estado vaziu mostra `EmptyMessage`.

### 5.6 Lista Detalhe (`src/pages/List.js` — NOVO)

- Header `Item` + back `Lists`.
- Cabeçalho mostra `selectedList.description/location/date` + botões `edit` (green) e `trash` (red, `handleDeleteList`).
- Filtro categoria Picker + busca.
- Lista `filteredList` (do `ListsContext`) cards idênticos ao Market mas com `updateItemQuantityToList`. Tap abre `EdittemListtItem`.
- Total `listTotal`.

### 5.7 Painel Início — Dashboard (`src/pages/Dashboard.tsx`, tela oficial de gráficos)

> A antiga tela `Reports.js` foi **absorvida pelo Dashboard** (descope 2026-09-15, confirmado 2026-10-13). Não existe tela, rota ou tab de Relatórios.

- **Hero:** 4 cards `Saldo/Entradas/Saídas/Dízimo` com `LinearGradient` roxo; Dízimo usa `%` custom + base por categorias (`calcTithePure`, `tithePercent/titheCategories` do settings).
- **Saúde finanças:** `Ganhos/Despesas` + barra proporcional `Incomings/(Incomings+Expenses)` + saldo.
- **Gastos por categoria:** `InteractivePieChart` (12 categorias, tons roxo) a partir do mês atual; legenda só categoria, tap mostra tooltip com valor.
- **Linha:** últimos 6 meses Entradas vs Saídas + série de abastecimentos (toggle Litro/Pago).
- **Metas urgentes:** top 3 com vencimento ≤30d (`GoalCard` + progress).
- **Empty states** (`pizza-empty`, `line-empty`) quando sem dados.

### 5.8 Configurações (`src/pages/AboutUs.js` — ~1200 linhas, com Privacidade/Export iOS)

Seções com `Switch` + `Button` roxos:

1. **Aparência:** `Tema Escuro`, `Títulos nos ícones`, `IA Beta` (mostra input API key + link `platform.openai.com/account/api-keys` + `handleSaveApiKey` que testa `createChatCompletion Olá mundo`).
2. **Privacidade (NOVO 2026-09-03):** `Exigir biometria ao abrir` (`testID biometry-switch`) com guard `isBiometricAvailable()`; `disabled` se hardware indisponível + mensagem `biometry-unavailable`. Persiste `isBiometricEnabled` (0/1) e bloqueia `BiometricGate` em `App.js`.
3. **Finanças:** `formulário simplificado`, `card Saldo`, `card Dízimo`, `Remover prefixo da soma Dízimo` + `Input prefixTithe`; Botões `Exportar/Importar finanças` (CSV via SAF Android / `documentDirectory` iOS + reselect folder), `Apagar finanças`.
4. **Corridas:** `adicionar abastecimento em finanças`; `Exportar/Importar Abastecimentos`, `Apagar Abastecimentos`.
5. **Compras:** `formulário simplificado itens`; `Exportar/Importar Estoque`, `Importar Lista`, `Apagar Compras` (dialog Apagar Listas/estoque/tudo).
6. **Geral:** `Redefinir configurações` (`handleResetConfigs` apaga row config), `Apagar tabelas` (`handleCleanStorage` destrói tudo + reload), `Alterar pasta de exportação` (`requestDirectoryPermissionsAsync` — só Android; iOS usa `documentDirectory` direto), `Exportar finanças antigo` (`getAllDataAsJSON` legado).
7. **Export SAF iOS branch:** `AboutUs.js` `exportSomeData` e `Onboarding.js` `preleavingOnboarding` usam `Platform.OS === 'android' ? StorageAccessFramework.createFileAsync/writeAsStringAsync : FileSystem.writeAsStringAsync(documentDirectory + fileName)` com `Alert` fallback.
8. Rodapé link `filipeleonelbatista.vercel.app` + `Constants.manifest.version`.

### 5.9 IA (`src/components/AIComponent.tsx` + `src/pages/IAPage.tsx` + `src/pages/AIProviders.tsx` + `src/utils/aiProviders.ts`)

- **Multi-provider (1 ativo + fallback):** `OpenAI` / `Gemini` / `Anthropic` / `OpenRouter` / `Zen` — chaves em `expo-secure-store` (`getProviderKey`), modelos via `fetchModels` dinâmico por chave, `chatWithFallback` tenta ativo + ordem de fallback (1 retry por provider). Fallbacks estáticos vivos (`FALLBACK_MODELS`); modelos Gemini desligados migram sozinhos (`migrateGeminiModel`, ver `aiProviders.ts`).
- **Tela `AIProviders`:** cards por provider com chave mascarada + `Pesquisar modelos` + radio ativo + ordem de fallback.
- **Gate:** `isAiEnabled` false => `AIComponent` retorna null. FAB roxo com ORB (`NebulaOrb` Skia + `BorderBeam`).
- **IAPage:** chat full-screen com `buildPrompt` (`prompt.ts`: delimitadores `<<<DADOS>>>`, bloqueio de injection, `Limite 1000 chars`, rate 3/60s). Injeta `financesList/fuelCostsList/marketCostsList`. Header com ORB + `model-select`, input com `BorderBeam` + `btn-send`, assistant em `Markdown`, user com `Ver tudo/Ver menos`.
- **Metas na IA:** tela dedicada `Goals.tsx` (filtros Todas/Ativas/Concluídas, `CategoryPicker` + `+ Outra`, `GoalCard` + progress); tela `TitheSettings.tsx` (`%` custom step 0.5 1-100, base por categorias, preview mensal, `markAsPaid`, carrossel 5 escrituras JFA).

### 5.10 ActionSheet (Adicionar)

`src/pages/ActionSheet.tsx` + `src/components/AddButtton.tsx` (typo `Buttton`). FAB central roxo abre sheet com múltiplos `Add*Form` conforme `selectedSheet` do `usePagesStore`.

---

## 6. Permissões, Import/Export e Impactos por Versão Android/iOS

### 6.1 Permissões Declaradas (`app.json:30`)

```json
[] // 2026-09-15: SAF Android-only, targetSdk 36, sem READ/WRITE_EXTERNAL_STORAGE (removido), sem expo-media-library
+ plugin expo-document-picker (iCloudContainerEnvironment: Production) + expo-file-system SAF
// iOS fallback: FileSystem.documentDirectory mantido default, sem SAF
```

### 6.2 Fluxo Atual (wireado 2026-09-15, `AboutUs.js`)

- **Gate:** `checkPermissions()` → `Platform.OS==='android'? true` (SAF não exige `MediaLibrary`; permissões `[]` em `app.json:27`). Pasta SAF validada separadamente (`selectedFolderToSave` vazio → `Alert`).
- **Export:** `jsonToCSV(list) -> StorageAccessFramework.createFileAsync(directoryUri, fileName, "text/*") -> writeAsStringAsync(createdFile, CSV, utf8)` se `Platform.OS==='android'` senão `FileSystem.writeAsStringAsync(documentDirectory+fileName)` (fallback iOS padrão).
- **Import:** `DocumentPicker.getDocumentAsync({copyToCacheDirectory:false, type:"*/*"})` → `isAllowedImport(fileName,fileSize)` (block `xls/xlsm/xlsb/ods/zip`, max 5MB/5k/20col) → `ext==='xlsx' ? read base64 + parseImport(Uint8Array, fileName) : read utf8 + parseImport(content, fileName) (fallback readString+handleCSVtoArrayFormat)` → `sanitizeDescription/sanitizeAmount` nos repos + `zod` em `src/schemas/*`.
- **Seleção de pasta:** Onboarding (`Platform.OS!=='android' ? handleLeave : requestDirectoryPermissionsAsync`) + `AboutUs: Alterar pasta de exportação` salva `directoryUri` em `config.selectedFolderToSave`. Todas exportações usam essa URI.

### 6.3 Impactos por Versão Android

| API | Versão | Comportamento | Impacto no app |
|---|---|---|---|
| <23 | <6.0 | Permissões install-time | Funciona com `READ/WRITE_EXTERNAL_STORAGE` grant automático. |
| 23-28 | 6.0-9 | Runtime permissions + acesso livre external storage | `requestPermissionsAsync` necessário. App já implementa. |
| 29 | 10 | **Scoped Storage** introduzido (`requestLegacyExternalStorage`). SAF recomendado. | App já usa `StorageAccessFramework` (SAF) — compatível, mas `ACCESS_MEDIA_LOCATION` ainda necessário p/ média. |
| 30 | 11 | **Scoped Storage obrigatório**, `MANAGE_EXTERNAL_STORAGE` para amplo, SAF é o caminho oficial. Pasta escolhida via SAF persiste com `directoryUri`. | **Ponto crítico:** app depende 100% de SAF + `selectedFolderToSave`. Se usuário não selecionar pasta no Onboarding, `directoryUri== ""` -> `createFileAsync` falha silenciosamente. Necessário fallback/erro visível. |
| 31-33 | 12-13 | `READ_MEDIA_IMAGES/VIDEO/AUDIO` granular, `READ_EXTERNAL_STORAGE` deprecated. `WRITE` não concede read. Notificações, etc. | `expo-media-library` plugin já mapeia granular, mas `app.json` ainda declara legado `READ_EXTERNAL_STORAGE`. Em API 33+ pode logar warnings e falhar em devices sem grant granular. `expo-build-properties` precisa `targetSdkVersion 33+`. |
| 34 | 14 | Foto picker restrito, `READ_MEDIA_VISUAL_USER_SELECTED`, foreground service types. | Export via SAF não afetado, mas `MediaLibrary.getPermissionsAsync` checa `MEDIA_LOCATION` que muda em 14. Testar em 34. |
| 35+ | 15 (2025) | `targetSdk 35` exigido Play Store ago/2025, `READ_MEDIA_IMAGES` deprecated, `MANAGE_MEDIA`. | **Modernização pendente:** atualizar `expo` 48 -> 54+, `targetSdk 35`, remover `WRITE_EXTERNAL_STORAGE` (não efetivo em 33+), migrar para `expo-file-system` next + `StorageAccessFramework` mantido. Pasta `android/` ejectada permite `gradle` bump. |

### 6.4 iOS

- `usesIcloudStorage:true` + `expo-document-picker iCloudContainerEnvironment Production` permite import/export via iCloud Drive + DocumentPicker `text/*`.
- `NSPhotoLibraryUsageDescription/Add` para media-library (não usado ativamente, mas plugin exige).
- SAF não existe em iOS; `expo-file-system` fallback usa `documentDirectory`. Código atual chama `StorageAccessFramework` que em iOS lança `UnavailabilityError` — **bug latente**: import/export quebrará em iOS se não houver branch `Platform.OS === 'android' ? SAF : FileSystem.writeAsStringAsync`.

### 6.5 XLSX

`xlsx@0.18.5` e `expo-sharing` instalados mas não usados em UI 2.2.2. Export só CSV. Observação para modernização: `readString` não parseia XLSX; necessário `XLSX.readFile` + `expo-sharing` para abrir arquivo.

**Nota SAF watermelon removida:** tabela comparativa removida (era scaffolding Expo 48 / WatermelonDB). Stack atual Managed puro via `expo-sqlite` + `drizzle-orm` (ver §2.1).

---

## 7. Bugs & Débitos Conhecidos (atualizado 2026-09-03)

1. **Items schema mismatch:** `itemShcema.js:27` coluna `desiredQuantity` vs `ListsContext.js:185`/`Market` usa `quantityDesired` — **corrigido** em Fase 1 com `drizzle` `quantityDesired` (migration 0000) e `ListsContext` normalizado; `stock`/`items` usam `quantityDesired` consistente.
2. **SAF em iOS:** `StorageAccessFramework` não existe em iOS — **corrigido** com branch `Platform.OS === 'android' ? SAF : FileSystem.documentDirectory` em `AboutUs.js:193-240` e `Onboarding.js:84` (testes `saf-ios` PASS).
3. **AsyncStorage legado:** `@onboarding` ainda em AsyncStorage enquanto resto em `drizzle`; `saveStorageToExportedFile` exporta AsyncStorage como txt — órfão (mantido para compat).
4. **OpenAI SDK deprecated:** `openai@3.3.0` `Configuration/OpenAIApi` — **corrigido** para `openai@^4.28.0` + `src/utils/aiProviders.ts` `chatWithFallback` / `fetchModels` (teste `secureStore-migration` PASS, sem `Configuration` import).
5. **NativeBase deprecated:** NativeBase 3.4.28 arquivado — **removido**; migrado para `nativewind@4.1` + `tailwindcss@3.4.17`.
6. **React Native 0.71.8 + Kotlin 1.6.0** desatualizados (2023) — **corrigido** para `RN 0.86.3` + `Kotlin 2.1.0` + `Expo 57` + `compileSdk 36/targetSdk 36` (doctor 21/21).

---

## 8. Componentes & Forms

Todos em `src/components/`: `AddItemForm/EditItemForm` (Finanças, zod), `AddShoppingCartItem/EditShoppingCartItem` (Stock), `AddItemListtItem/EdittemListtItem` (typos originais — manter), `AddListForm/EditListForm` (Listas), `AddGoalForm/EditGoalForm`, `AddFuelForm/EditFuelForm.tsx` (zod) / `AutonomyForm/EditVeicleForm/ViewFuelReport`, `EstimativeForm`, `Header`, `EmptyMessage`, `ErrorSheet`, `Loading`, `AIComponent`, `AddButtton`. Migrados para TS strict:true, `yup` removido, `zod` única validação.

---

## 9. Versionamento & Entrega

- Git: branch `feature/adicionando-watermelondb` (atual) superconjunto da `main` 2.0.2.
- EAS: `eas build -p android --profile preview` gera APK, `production` AAB, `development` dev-client. `eas.json` sem `cli` version pin — adicionar `cli.version >=5`.
- `package.json:4` scripts: `prebuild`, `clean-android/ios`, `android:build:*`, `start --dev-client`, `build:dev/apk/store(/local)`.
