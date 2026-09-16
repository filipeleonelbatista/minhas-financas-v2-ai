# Dossiê Completo — Financas App v2.3.0 (app/ • Managed)

> Gerado em 2026-09-15 | Projeto: `app/` | Expo ~57.0.19 + React 19.2.3 + React Native 0.86.3 + expo-sqlite/drizzle + zod (WatermelonDB/NativeBase/Tour removidos, SAF Android-only, doctor 21/21)

---

## 1. Visão Geral

App React Native (Expo Managed + Prebuild) para **gestão financeira familiar** com 4 domínios integrados: Finanças, Combustível/Hodômetro, Mercado/Estoque e Metas, com Relatórios e IA (OpenAI). Evolução da v2.0.2 (Play Store `com.finances`) para v2.2.2 com migração total de `AsyncStorage` para banco SQLite relacional via WatermelonDB e novo domínio de **Listas de Compras**.

- **Slug/packge:** `finances` / `com.finances` (`app.json:8`)
- **VersionCode:** 230, **Version:** 2.3.0, **BuildNumber iOS:** 2.3.0, **EAS projectId:** `007d84b9-db5f-4e91-8537-b64bd4edafbe`
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
|  | `drizzle-zod` / `zod` | ^0.8.3 / ^4.6.5 | Validação `src/schemas/*` (`finance/stock/goal/run/list` + sanitização) |
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
|  | `react-native-chart-kit` + `react-native-progress` | 6.12.0 / 5.0.0 | PieChart, LineChart, Progress.Bar em `Reports.js` |
|  | ~~`react-native-walkthrough-tooltip`~~ | removido 2026-09-15 | Tour spotlight **removido a pedido** (SAF Android-only); Onboarding 7 slides mantido com `CTA glow` |
|  | `@expo/vector-icons` (Feather, FontAwesome, MaterialCommunityIcons, Fontisto, Ionicons, Octicons) | bundled | Ícones em toda UI |
| Forms | `formik` + `yup` + `zod` | 2.2.9 / 1.0.2 / 4.6.5 | Validação em `AddItemForm`, `AddFuelForm`, etc. + `src/schemas/*` zod |
| Data | `zustand` + `drizzle-orm` + `expo-sqlite` | 5 / 0.45 / 57 | SQLite offline-first (WatermelonDB **removido** em Fase 1 gaps) |
|  | `@react-native-async-storage/async-storage` | 2.2.0 | `@onboarding` flag + fallback `hasSeenInteractiveTour` |
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
|  | `jest-expo` | ~57.0.5 | Preset `jest-expo` (mock `walkthrough-tooltip` removido) |
|  | `eslint` / `eslint-config-expo` | ^8.57 / 9→57 | `npm run lint --max-warnings 0` |
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

```
src/
  assets/{icon.png, images/, onboarding/1..7.png}
  theme.js
  routes.js                    # Stack root
  bottom-tab-routes.js         # 5 tabs
  market-stack-routes.js       # **NOVO** Stack aninhado Stock->Lists->List
  databases/
    index.js                   # Database + SQLiteAdapter
    Model/{financesModel, runsModel, goalsModel, stockModel, listsModel, itemsModel, configModel}.js
    schemas/{index, financesSchema, runsSchema, goalsSchema, stockScheme, listsSchema, itemShcema, configSchema}.js
  context/{Settings, Payments, Runs, Market, Goals, Pages, Lists}.js   # Lists é NOVO
  hooks/{useSettings, usePayments, useRuns, useMarket, useGoals, usePages, useLists, useOpenAi, useIsKeyboardOpen}
  pages/{Onboarding, Finances, Runs, Market, Lists, List, Reports, AboutUs, IAPage, ActionSheet}
  components/{Header, EmptyMessage, Loading, ErrorSheet, AIComponent, AddButton, AddItemForm, EditItemForm, AddFuelForm, AutonomyForm, EditVeicleForm, ViewFuelReport, AddShoppingCartItem, EditShoppingCartItem, AddGoalForm, EditGoalForm, EstimativeForm, AddListForm, EditListForm, AddItemListtItem, EdittemListtItem}
  services/api.js
```

### 3.2 Tema, Cores e Tipografia

- **Theme** (`src/theme.js:3`): `extendTheme` com `fontConfig Poppins` (Light 100-300, Regular 400, Medium 500-600). `fonts.heading/body/mono = Poppins`. Cores vêm do `native-base` default + overrides.
- **Paleta principal:**
  - Roxo brand: `theme.colors.purple[600]` (#9c44dc), `purple[900]` (#581C87 — splash e header), `purple[800]`, `purple[500]`, `purple[300]/#D4AEF0/#DBBCF2` (gráficos Reports)
  - Background light: `warmGray[50]` (#f0f2f5 / #FAFAFA), dark: `gray[900]` #1c1e21, `gray[800]` card dark
  - Texto light: `gray[600]`, dark: `gray[200]`, header `white` / `gray[800]`
  - Semânticas: `green[500]/600` (#12a454 gastos/entradas), `red[500]/600` (#e83e5a saídas), `yellow[400]` favorito
- **Dark/Light** (`SettingsContext.js:12` + `AboutUs.js:586`): `useColorMode().toggleColorMode()` + persistência `config.colorModeState` (WatermelonDB). `NavigationContainer theme background` `dark:#1c1e21 light:#f0f2f5` (`routes.js:21`). `auto` por padrão (`app.json:11`). Ícones e `useColorModeValue` trocam bg/text/bgCard dinamicamente em todas as páginas.
- **Splash/Icon:** `assets/splash.png` bg `#581C87`, `icon.png`/`adaptive-icon.png` (`app.json:12`).
- **Header** (`src/components/Header.js`): altura extensa com `bg purple.900`, `title` + `isLeftIconComponent/isRightIconComponent/isShort` variants. Usado em todas as páginas.
- **Ícones:** Feather (`dollar-sign`, `calendar`, `filter`, `settings`, `trash`, `edit`, `shopping-cart`, `pie-chart`, `arrow-*`), FontAwesome (`car`, `medkit`, `money`, `star`), MaterialCommunityIcons (`fuel`, `lipstick`, `file-plus-outline`, `format-list-bulleted`, `robot-outline`, `account`), Fontisto (`netflix`), Ionicons (`car-sport-outline`, `shirt-outline`), Octicons (`paper-airplane` no chat IA).

### 3.3 Navegação

- **Root Stack** (`src/routes.js:14`): `Onboarding` (initial) -> `TabNavigator` (BottomTabs) -> `Configuracoes` (AboutUs) -> `IAPage` (chat IA). `headerShown:false`.
- **Bottom Tabs** (`src/bottom-tab-routes.js:19`): `Finanças` (Feather dollar-sign) | `Combustível` (MaterialCommunityIcons fuel 26px — antes Feather droplet) | `Adicionar` (botão central `AddButton` custom) | `Mercado` (**agora `MarketStackRoutes` não `Market` direto**) | `Relatórios` (pie-chart). `tabBarHideOnKeyboard:true`, `isShowLabelOnNavigation` controla `tabBarShowLabel`.
- **Market Stack** (`src/market-stack-routes.js:11`) **NOVO:** `Stock` (Market.js) -> `Lists` -> `List`. Permite `navigation.navigate("Lists")` e `navigate("List")` dentro da tab Mercado.
- **ActionSheet** (`src/pages/ActionSheet.js`): fab central que abre `Actionsheet` com `AddItemForm` / `AddGoalForm` / `AddShoppingCartItem` / `AddFuelForm` / etc. conforme `PagesContext.selectedSheet`.

---

## 4. Persistência — WatermelonDB (feature central)

### 4.1 Adapter

`src/databases/index.js:14`:
```js
new SQLiteAdapter({ schema: schemas }) + new Database({ adapter, modelClasses: [FinancesModel, RunsModel, GoalsModel, StockModel, ListsModel, ItemsModel, ConfigModel] })
```
Sync desativado (offline-first puro). Sem migrations — `version:25` (`schemas/index.js:12`).

### 4.2 Tabelas (`src/databases/schemas/`)

| Tabela | Arquivo | Colunas | Notas |
|---|---|---|---|
| `finances` | `financesSchema.js:3` | `description:string, amount:number, category:string, date:number, paymentDate:number? , paymentStatus:number, isEnabled:number, isFavorited:number` | `isEnabled 1=saída 0=entrada`, `paymentStatus 1=pago` |
| `runs` | `runsSchema.js:3` | `currentDistance:number, unityAmount:number (R$/L), amount:number (total), type:string (gasolina/etanol...), date:number, location:string` | Abastecimentos |
| `goals` | `goalsSchema.js:3` | `description, currentAmount, amount, date` | Metas financeiras |
| `stock` | `stockScheme.js:3` | `description, category, amount (unitário), quantity, quantityDesired` | Estoque mercado |
| `lists` | `listsSchema.js:3` | `description, location, quantity (total itens), amount (total R$), date` | Cabeçalho lista de compras |
| `items` | `itemShcema.js:3` | `list_id:string (FK manual), description, category, amount, quantity, desiredQuantity, location, date` | **BUG:** `desiredQuantity` vs `quantityDesired` no resto do app (ver §7) |
| `config` | `configSchema.js:3` | 17 cols: `colorModeState, isAiEnabled, apiKey, isShowLabelOnNavigation, isEnableTitheCard, isEnableTotalHistoryCard, willAddFuelToTransactionList, willUsePrefixToRemoveTihteSum, simpleFinancesItem, marketSimplifiedItems, prefixTithe, veicleName/Brand/Year/Color/Plate, veicleAutonomy, selectedFolderToSave` | Singleton (1 row) |

### 4.3 Contexts como Repository

Cada `*Context.js` encapsula CRUD via `database.write/get/query`:

- `PaymentsContext.js:409` — `addTransaction`, `updateTransaction`, `deleteTransaction`, `handleFavorite` (toggle `isFavorited`), `importTransactions`, `loadTransactions`. Filtros computados em `filteredList` (`useMemo`) + derivados `Incomings/Expenses/Total/Saldo/Tithe`.
- `RunsContext.js:222` — `addTransaction` (se `willAddFuelToTransactionList` cria também `finances` tipo Transporte), `deleteTransaction`, `handleImportRuns/handleExportRuns`.
- `MarketContext.js:451` — `addTransaction`, `updateTransaction`, `updateStock(isAdd/isSubtract)`, `handleAddItensOnBuyList` (cria `lists` + `items`), `handleAddFinances` (gera `finances` Mercado).
- `ListsContext.js:539` — gerencia 2 níveis: `lists` + `selectedListItems` (`Q.where("list_id",id)`), `addTransaction` (lista), `addItemToList`, `updateItemToList`, `updateItemQuantityToList`, `deleteItemToList`, `handleDeleteList` (cascade), `handleSelectList`, `handleImportList/handleExportList`.
- `GoalsContext.js:11` — `add/update/deleteTransaction` metas.
- `SettingsContext.js:9` — Singleton config: `loadData` cria row default se `config` vazio, `updateConfiguration` genérico (`data._raw[variable]=value`), `handleCleanStorage` destrói todas as tabelas + `AsyncStorage.clear() + DevSettings.reload()`.

---

## 5. Mapeamento de Telas & Funcionalidades

### 5.1 Onboarding (`src/pages/Onboarding.js:23`)

7 slides horizontais `FlatList pagingEnabled` com imagens `1..7.png`, títulos em `purple[900]` bg. Último slide tem botão `Vamos começar?!`. Ao sair, `FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()` obriga escolha de pasta para export (persistida em `config.selectedFolderToSave`). Flag `@onboarding=true` em AsyncStorage. `Loading` enquanto `waiting`.

Slides: 1 Organize finanças, 2 Export/Import, 3 Compras, 4 Autonomia veículo, 5 Relatórios, 6 IA, 7 Modo escuro.

### 5.2 Finanças (`src/pages/Finances.js`)

- **Header:** `Finança` + gear -> `Configuracoes`
- **Cards horizontais** (Scroll horizontal): Entradas (green arrow-up), Saídas (red arrow-down), Total (purple 900), Saldo histórico (se `isEnableTotalHistoryCard`), Dízimo 10% (se `isEnableTitheCard`).
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

### 5.7 Relatórios (`src/pages/Reports.js`)

- **Saúde finanças:** Cards `Ganhos/Despesas` + `Progress.Bar` verde/vermelho proporcional `Incomings/(Incomings+Expenses)`.
- **Gastos por categoria:** `PieChart` (12 categorias com tons roxo #2D0D45..#DBBCF2) a partir de `expensesByCatData` (filteredList).
- **Abastecimentos:** Toggle `Por Litro/Pago` + `LineChart` últimos 8 `FuelList` datas. Tap ponto abre `ViewFuelReport`.
- **Minhas metas:** Lista `goalsList` Pressable -> `EditGoalForm`. Cada meta: `description`, `Prazo: date`, `amount / currentAmount`, `Restam X dias` se <=30, `Progress.Bar` roxo (claro se 100%).
- **EmptyMessage** se sem dados.

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

### 5.9 IA (`src/components/AIComponent.js` + `src/pages/IAPage.js` + `src/hooks/useOpenAi.js`)

- **Gate:** `isAiEnabled` false => `AIComponent` retorna null. Botão FAB roxo `robot-outline` pulsante (Animated `pulseValue` loop 4s + `tiltValue` loop) + tooltip `Converser com a IA` fadeOut 6s. Aparece em todas as 4 tabs principais.
- **IAPage:** Chat full-screen. Header `Conversa`. Usa `openai@3.3.0` `Configuration` + `OpenAIApi`. Se `apiKey` vazio abre `Actionsheet` pedindo chave.
  - **Dados injetados:** `financesList` (CSV header + filteredList), `fuelCostsList` (+ autonomia), `marketCostsList`. Funções `handleAskForFinancialTips / FuelCostsTips / MarketCostsTips` montam prompt `Use esses dados... Limite 1000 chars` e chamam `createChatCompletion gpt-3.5-turbo`.
  - **Chat livre:** `handleAskToAi` mantém histórico `data: {type:user|assistant, text}` + `inputText`. Render bolhas roxa (user) vs `bgCard` (assistant) com avatares `account/robot-outline`. LoadingDots durante `isLoading`.
  - **Quick prompts** iniciais: 3 Pressables `Analise meus gastos / combustível / mercado`.
  - Erros via `openaiErrorHandler` (401/429/500 etc. -> mensagem genérica).
  - `BackHandler` custom em todas as páginas vai para `goBack`.

### 5.10 ActionSheet (Adicionar)

`src/pages/ActionSheet.js` + `src/components/AddButtton.js` (typo `Buttton`). FAB central roxo abre sheet com múltiplos `Add*Form` conforme `selectedSheet` do `PagesContext`.

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
3. **AsyncStorage legado:** `@onboarding` ainda em AsyncStorage enquanto resto em `drizzle`; `saveStorageToExportedFile` exporta AsyncStorage como txt — órfão (mantido para compat, fallback `hasSeenInteractiveTour` também em `config`).
4. **OpenAI SDK deprecated:** `openai@3.3.0` `Configuration/OpenAIApi` — **corrigido** para `openai@^4.28.0` + `src/utils/aiProviders.ts` `chatWithFallback` / `fetchModels` (teste `secureStore-migration` PASS, sem `Configuration` import).
5. **NativeBase deprecated:** NativeBase 3.4.28 arquivado — **removido**; migrado para `nativewind@4.1` + `tailwindcss@3.4.17`.
6. **React Native 0.71.8 + Kotlin 1.6.0** desatualizados (2023) — **corrigido** para `RN 0.86.3` + `Kotlin 2.1.0` + `Expo 57` + `compileSdk 36/targetSdk 36` (doctor 21/21).

---

## 8. Componentes & Forms

Todos em `src/components/`: `AddItemForm/EditItemForm` (Finanças, yup), `AddShoppingCartItem/EditShoppingCartItem` (Stock), `AddItemListtItem/EdittemListtItem` (typos originais — manter), `AddListForm/EditListForm` (Listas), `AddGoalForm/EditGoalForm`, `AddFuelForm/AutonomyForm/EditVeicleForm/ViewFuelReport`, `EstimativeForm`, `Header`, `EmptyMessage`, `ErrorSheet`, `Loading`, `AIComponent`, `AddButtton`. Todos usam `useTheme`, `useColorModeValue`, `Actionsheet` + `useDisclose`.

---

## 9. Versionamento & Entrega

- Git: branch `feature/adicionando-watermelondb` (atual) superconjunto da `main` 2.0.2.
- EAS: `eas build -p android --profile preview` gera APK, `production` AAB, `development` dev-client. `eas.json` sem `cli` version pin — adicionar `cli.version >=5`.
- `package.json:4` scripts: `prebuild`, `clean-android/ios`, `android:build:*`, `start --dev-client`, `build:dev/apk/store(/local)`.
