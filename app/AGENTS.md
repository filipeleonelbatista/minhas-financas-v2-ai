# AGENTS.md — Financas App v2.2.2 — Guia para Agentes & Humanos

> Fonte de verdade para features, regras de negócio, libs, arquitetura e padrões de qualidade (SOLID/TDD/Clean Code/coverage/quality gate). Derivado de inspeção direta do código em `App.js:1`, `src/databases/`, `src/context/` e `src/pages/`.

---

## 1. Propósito & Features

App offline-first de finanças familiares (100 downloads Play Store, ~10 MAU — `docs/DOSSIE.md:1`). 7 domínios:

| Domínio | Arquivos-chave | Resumo |
|---|---|---|
| **Finanças** | `src/context/PaymentsContext.js:1`, `src/pages/Finances.js:1` | CRUD transações `isEnabled` (0=entrada/1=saída), `amount`, `category`, `date/paymentDate`, `paymentStatus`, `isFavorited`. Filtros: período (startDate/endDate → mês atual), tipo, categoria (14), status pago, favoritos, busca textual, ordenação por Vencimento/Pagamento. Derivados: `Incomings/Expenses/Total/Saldo/Tithe(10%)` |
| **Combustível** | `src/context/RunsContext.js:1`, `src/pages/Runs.js:1` | Abastecimentos `currentDistance/unityAmount/amount/type/date/location`. Cards: Km Estimado `(autonomia*valor/precoLitro)+kmAtual`, Autonomia (tela `AutonomyForm`), Km Atual. Filtro período. Auto-lança em Finanças se `willAddFuelToTransactionList` |
| **Mercado/Estoque** | `src/context/MarketContext.js:1`, `src/pages/Market.js:1` | Estoque `description/category/amount/quantity/quantityDesired`. Stepper +/- (`updateStock`), badge `Em estoque/Em falta`, total `amount*quantity`. Gera `finances` Mercado via `handleAddFinances`. Gera `lists` via `handleAddItensOnBuyList` |
| **Listas de Compras (NOVO)** | `src/context/ListsContext.js:1`, `src/pages/Lists.js:1`, `src/pages/List.js:1` | Cabeçalho `lists` (description/location/quantity/amount/date) + itens `items` (FK `list_id`). CRUD 2 níveis, seleção `Q.where(list_id)`, export individual (long-press), criação a partir do estoque (todos / só em falta) |
| **Metas** | `src/context/GoalsContext.js:1`, `src/pages/Reports.js:479` | `description/amount/currentAmount/date`. Progress bar + `Restam X dias` se ≤30d |
| **Relatórios** | `src/pages/Reports.js:1` | Saúde finanças (Progress verde/vermelho), Pizza 12 categorias, Linha últimos 8 abastecimentos (toggle Litro/Pago) |
| **IA** | `src/hooks/useOpenAi.js:1`, `src/components/AIComponent.js:1`, `src/pages/IAPage.js:1` | Gate `isAiEnabled` + `apiKey` (testado com `createChatCompletion Olá mundo`). FAB pulsante. Chat gpt-3.5-turbo com 3 prompts pré-definidos injetando CSV de cada domínio, limite 1000 chars |

Navegação: `src/routes.js:14` Stack `Onboarding → TabNavigator → Configuracoes → IAPage`. Tabs `src/bottom-tab-routes.js:19` (bottom-tab) + `src/market-stack-routes.js:11` (Stock→Lists→List). FAB central `ActionSheet` com `PagesContext.selectedSheet`.

Configurações (`src/pages/AboutUs.js:1`, `src/context/SettingsContext.js:1`): singleton `config` com 17 toggles (tema dark, labels na navegação, IA, cards Saldo/Dízimo, prefixo dízimo, formulário simplificado finanças/mercado, auto-add combustível, dados veículo + autonomia, pasta de exportação). `handleCleanStorage` apaga todas as tabelas + `AsyncStorage.clear()` + `DevSettings.reload()`.

---

## 2. Regras de Negócio (não violar sem RFC)

1. **Finanças — Totais:** `Total = Σ entradas - Σ saídas` (`PaymentsContext.js:252`). `Tithe = 10%` apenas sobre entradas menos saídas com `prefixTithe` se `willUsePrefixToRemoveTihteSum` (`PaymentsContext.js:264`). Cards Saldo/Dízimo condicionais a `isEnableTotalHistoryCard/isEnableTitheCard`.
2. **Finanças — Filtros:** `filteredList` aplica em cascata tipo → busca → período (`isSameOrAfter/isSameOrBefore` via dayjs) → categoria → status → favoritos → sort. Período default = mês atual (`dayjs().startOf/endOf month`). Ordenação `Vencimento` ou `Pagamento` decrescente.
3. **Finanças — Favoritar:** `handleFavorite` inverte `isFavorited` 0/1 via `database.write` + `update`.
4. **Finanças — Modo simples:** `simpleFinancesItem` esconde `category`, `paymentDate`, `paymentStatus` (categoria e status não persistem, mas UI colapsa).
5. **Combustível — Auto lançamento:** Se `willAddFuelToTransactionList` true, `RunsContext.addTransaction` cria `finances` `Abastecimento - location` categoria `Transporte`, `isEnabled=1`, `paymentStatus=true` (`RunsContext.js:238`).
6. **Combustível — Estimativa:** `currentEstimative = (veicleAutonomy * amount / unityAmount) + currentDistance` (último registro, `Runs.js:139`).
7. **Mercado — Gerar lista:** `MarketContext.handleAddItensOnBuyList` oferece `Somente em falta` (`quantity < quantityDesired`) ou `Todos`. Recalcula `totalAmount/quantity` e cria `lists` + N `items` via `ListsContext.addTransaction/addItemToList`. `handleAddFinances` cria `finances` `Compras` categoria `Mercado` com `listTotal`.
8. **Listas — Cascade delete:** `ListsContext.handleDeleteList` apaga `lists` + todos `items` onde `list_id` (`ListsContext.js:290`).
9. **Onboarding:** Flag `@onboarding` em AsyncStorage. Ao sair, obrigatório `requestDirectoryPermissionsAsync` para `selectedFolderToSave` (`Onboarding.js:89`). Sem pasta, todos os exports falham.
10. **Pasta de exportação:** Todas as exportações usam `selectedFolderToSave` (SAF). Arquivos `nome-DD-MM-YYYY_HH-mm.csv` via `jsonToCSV` + `StorageAccessFramework.createFileAsync`.
11. **IA — Dados injetados:** `financesList/fuelCostsList/marketCostsList` são CSVs gerados em `IAPage.js:82` a partir de `filteredList/FuelList/MarketList`. Prompts exigem `Limite 1000 caracteres`.
12. **Datas:** Todas persistidas como `number` (timestamp `Date.now()+43200000`) — offset 12h para evitar UTC midnight bug. Leitura via `new Date(n).toLocaleDateString('pt-BR')`.
13. **Moeda:** Sempre `toLocaleString pt-BR BRL` com 2 casas.

---

## 3. Stacks & Libs (fixas vs candidatas a troca)

**Fixas (manter):** `react-native`, `expo`, `react-navigation`, `dayjs/date-fns`, `watermelondb`, `expo-file-system/media-library/document-picker`, `react-native-csv`.

**Candidatas a modernização (RFC obrigatório):**

| Atual | Problema | Substituto recomendado |
|---|---|---|
| `native-base 3.4.28` | Arquivado, sem suporte RN 0.74+ | `gluestack-ui` (sucessor) ou `tamagui` / `nativewind` |
| `openai 3.3.0` (Configuration/OpenAIApi) | Removido em openai 4+ | `openai@5+` com `new OpenAI({apiKey, dangerouslyAllowBrowser:true})` |
| `react 18.2 / rn 0.71.8 / expo 48 / kotlin 1.6.0` | EOL, targetSdk 33 não passa Play Store 2025 | Expo 52/53, RN 0.76+, Kotlin 1.9+ |
| `@babel/plugin-proposal-decorators` | Renomeado | `@babel/plugin-transform-decorators` |
| `xlsx 0.18.5` órfão | Não exposto | Decidir: remover ou expor import XLSX via `expo-sharing` |

**Não introduzir sem aprovação:** state manager externo (Redux/Zustand) — contexts já cobrem; ORM alternativo (Realm/Drizzle) — WatermelonDB já ejectado.

---

## 4. Persistência & Schemas

WatermelonDB `src/databases/index.js:14` SQLiteAdapter, `schemas/index.js:11` `version:25`, 7 tabelas (§ docs/DOSSIE.md 4.2). Acesso SEMPRE via `database.write` + `database.get(table).query/fetch/find/create/update/destroyPermanently`. Nunca acessar `_raw` fora de `write`. Model classes apenas definem `table` + `associations` (atualmente usam `_raw` direto — migrar para `@field`/`@date` decorators ao modernizar).

**Alert:** `itemsSchema` coluna `desiredQuantity` ≠ código `quantityDesired` — corrigir em migration (ver docs/DOSSIE.md 7.1).

---

## 5. Qualidade — SOLID / Clean Code / TDD / Coverage / Quality Gate

### 5.1 SOLID

- **S**ingle Responsibility: Cada `*Context` = Repository de 1 agregado (Payments, Runs, Market, Lists, Goals, Settings). Não misturar domínios — `RunsContext` só pode chamar `PaymentsContext.addTransaction` via hook, não acessar `finances` direto.
- **O**pen/Closed: Novos filtros em `filteredList` devem estender `useMemo` pipeline sem alterar anteriores. Novas categorias → extensão de `categoriesList`.
- **L**iskov: Modelos WatermelonDB substituíveis via `database.get(table)` — não acoplar a `_raw` shape em UI, extrair mappers.
- **I**nterface Segregation: Hooks `usePayments`/`useRuns` etc. expõem apenas o necessário; UI não deve importar `database` direto — passar por context.
- **D**ependency Inversion: Contexts dependem de `database` (abstração) não de SQLite concreto. Preparar `repositories/*` protocol para injeção em testes.

### 5.2 Clean Code

- Nomes: `handleAddItensOnBuyList` typo → renomear para `handleAddItemsToBuyList` em debt ticket (manter alias). `AddButtton`, `EdittemListtItem`, `itemShcema` registrar em `docs/tech-debt.md`.
- Funções ≤30 linhas; `AboutUs.js:1150` quebrar em seções (`GeneralSettingsSection`, `FinanceSettingsSection`).
- Sem `console.log` em produção (há `console.log` em `PaymentsContext.js:436`); usar `logger` com `__DEV__` guard.
- Tratar TODOs/FIXMEs como erro de lint.

### 5.3 TDD & Testes

**Regra de ouro:** Sem teste, sem merge.

- **Framework:** `jest` + `react-native-testing-library` + `@testing-library/react-hooks` + `jest-mock` para WatermelonDB (`__mocks__/@nozbe/watermelondb`). `msw` para OpenAI.
- **Estrutura:** `__tests__/{unit,integration,e2e}` espelhando `src/`. `src/context/__tests__/PaymentsContext.test.ts` testa `filteredList`, `Tithe`, `handleFavorite` com DB em memória (`SQLiteAdapter({schema, dbName: ':memory:'})`).
- **Ciclo TDD:** 1) escrever teste falhando (`filteredList` por categoria), 2) implementar, 3) refatorar, 4) coverage gate.
- **Cobertura:** No `jest.config.js` (a criar) gate `branches 80% lines 80%` em `src/context/**`, `src/hooks/**`. `npm run test:coverage` deve passar no CI antes de `eas build`.
- **WatermelonDB mocks:** Para unit puro, mock `database.write` + `get().query().fetch`; para integração, usar adapter memória real (lento mas fiel).
- **E2E:** `maestro` ou `detox` para fluxo Onboarding → adicionar transação → exportar CSV → verificar arquivo.

### 5.4 Quality Gate (CI)

`.github/workflows/ci.yml` (a criar) deve rodar em ordem e falhar se qualquer quebrar:

1. `npm run lint` (eslint + prettier — configurar `eslint-config-expo` + `eslint-plugin-no-danger` + `no-xlsx-formula`)
2. `npm run typecheck` (quando TS for introduzido — app é JS hoje, migrar incremental `drizzle-zod` em `src/schemas/*`)
3. `npm run test:coverage` (jest --coverage --coverageReporters=text --coverageThreshold `branches 80 lines 80` em `src/repositories/**`, `src/schemas/**`, `src/utils/sanitize/**`)
4. `npm run test:security` (novo — `jest --testPathPattern=__tests__/security` — XSS/SQL/prompt/Excel: `sql.test.ts` com `' OR 1=1 --`, `prompt.test.ts` com `IGNORE PREVIOUS`, `excel.test.ts` com `.xlsm`/`=HYPERLINK`/`WEBSERVICE`)
5. Sonar/ `npx eslint --max-warnings 0` + sem `console.*` + sem `TODO` + sem `dangerouslySetInnerHTML`
6. `npx expo-doctor` + `eas build --profile preview --non-interactive --no-wait` (dry-run)
7. SAST mínimo (`npm audit --audit-level=high`) + `XLSX.read` sem `bookVBA` auditado

Nenhum step pode ser `continue-on-error`. Branch protection em `main` exige CI verde + 1 review. Ver `docs/ROADMAP.md:1.7` (sanitização + Excel anti-malware + prompt injection).

### 5.5 Especificidades por OS (obrigatório testar)

- **Android:** Testar em API 29, 33, 34, 35 (emulador `Pixel_2_API_33` já em `package.json:21`). SAF + `selectedFolderToSave` vazio → mostrar diálogo erro. Permissão granular API 33+. WatermelonDB JSI falha em `expo start` sem dev-client — sempre `expo run:android` / `dev-client`. Kotlin 1.9+ após bump.
- **iOS:** Testar `StorageAccessFramework` branch (deve cair para `FileSystem.documentDirectory` em iOS). `usesIcloudStorage` + `DocumentPicker` tipo `text/*`. Build via `expo run:ios` / `eas build -p ios`.
- **Expo Go incompatível:** WatermelonDB exige código nativo — nunca `expo start` puro; sempre `--dev-client`.

---

## 6. Workflow para Agentes

1. Leia `docs/DOSSIE.md` antes de qualquer mudança.
2. Para nova feature: crie teste falhando → implemente no context/hook → atualize `schemas` com migration se nova coluna → atualize `docs/DOSSIE.md` + este AGENTS.md § Regras.
3. Para bug (§ docs/DOSSIE.md 7): crie teste reproduzindo → fix → migration se schema.
4. Não alterar `app.json` `version/versionCode` sem bump semântico + changelog.
5. Commits: `feat(payments): ...`, `fix(lists): corrige desiredQuantity`, `chore(deps): bump expo 48→53`, `docs: ...`, `test: ...`.
6. Antes de PR: `npm run lint && npm run test:coverage && npx expo-doctor`.

---

## 7. Débitos Técnicos Registrados

- [ ] `itemsSchema desiredQuantity` mismatch
- [ ] SAF em iOS sem fallback
- [ ] `openai@3` deprecated
- [ ] `native-base` deprecated
- [ ] `AboutUs.js` 1150 linhas — fatiar
- [ ] `AsyncStorage` órfão `@onboarding`
- [ ] Sem `jest`/`eslint`/`tsconfig` configurados
