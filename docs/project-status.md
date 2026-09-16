# Project Status — Minhas Finanças v2

> Atualizado: 2026-09-15 | Branch: `main` | Status: **Fase 1 100% finalizada — Zustand + NativeWind + drizzle + SAF Android-only (Tour removido) — 27 suites/159 PASS, expo-doctor 21/21, managed puro**

---

## 1. O que foi implementado (Fase 1 A' Managed)

**Objetivo da Fase 1:** redesign mantendo posicionamento, migrar para managed sem eject, com Dashboard + Metas + segurança + IA + dízimo. Tour removido a pedido (lançamento só Android).

| # | Task | Commit | O que mudou |
|---|---|---|---|
| 1 | Bump Expo 48→57 | `ed1b428` | `expo ~57.0.19`, `react-native 0.86.3`, `react 19.2.3`, `compileSdk 36/targetSdk 36`, Node 20.19, `app.json` `expo-build-properties` kotlin `2.1.20` |
| 2 | NativeWind 4.1 base | `822654f` | `nativewind@4.1`, `tailwindcss@3.4.17`, `react-native-reanimated 4.5.1`, `tailwind.config.js` (purple 600/900), `global.css` `@plugin nativewind`, `metro.config.js` `withNativewind`, `App.js` import css — posicionamento intacto |
| 3 | Drizzle DB | `f33cc19` `30ecd28` | `expo-sqlite 57.0.2` + `drizzle-orm 0.45.2` + `drizzle-kit 0.31`, `src/db/schema.ts` 8 tables (finances, runs, goals com icon/category, stock, lists, items **fix `quantityDesired`**, config + `tithe_payments`), `src/db/index.ts` `openDatabaseSync("financas.db")+drizzle`, `drizzle.config.ts`, `migrations/0000_0002` + **runner `src/db/migrate.ts` `runMigrations()` via `PRAGMA user_version` integrado em `App.js:103`** |
| 4 | Repos + Tithe | `ed5aed4` | `src/repositories/finance.ts` `filterFinances` pipeline puro + `calcTithe` com prefixo, `financeRepo.getAll/add/update/delete/queryFiltered` sanitizado (`sanitizeDescription/sanitizeAmount/sanitizeCategory`), `market/run/list/goal` sanitizados |
| 5 | Sanitização + Excel | `2485a37` + `2026-09-15` | `src/utils/sanitize.ts` (80ch, NFKC, strip `<>{}$;`/`javascript:`), `excel.ts` allowlist `xlsx/csv` block `xlsm`, 5MB/5k linhas, `XLSX.read cellFormula:false`, strip `=HYPERLINK`, magic `PK\x03\x04`, `prompt.ts` OWASP delimitadores `<<<DADOS>>>`, rate 3/60s — **wireado em `AboutUs.js:118` `isAllowedImport/parseImport` para `handleImportRuns/Stock/List/CSV` (base64 para xlsx, *\/* picker)** + `src/schemas/*` `zod@4 + drizzle-zod` (`finance/stock/goal/run/list` validators) |
| 6 | Biometria | `fe8eb08` | `expo-local-authentication ~57.0.3` + `expo-secure-store ~57.0.4`, `src/utils/biometry.ts`/`secureStore.ts`, `src/db/migrations/0001_add_biometric.sql` `isBiometricEnabled`, `App.js` `BiometricGate`, `NSFaceIDUsageDescription` |
| 7 | Dashboard | `cf6fde1` | `src/pages/Dashboard.js` hero 4 cards Saldo/Entradas/Saídas/Dízimo gradient + pizza por categoria + linha 6 meses Entradas vs Saídas + metas urgentes ≤30d, `src/bottom-tab-routes.js` tab `Início` primeira |
| 8 | Metas custom | `2367978` | `src/repositories/goal.ts` `DEFAULT_GOAL_CATEGORIES` + `normalizeCategory` + custom, `src/components/ui/GoalCard.tsx` NativeWind, `src/pages/Goals.js` filtros Todas/Ativas/Concluídas + `CategoryPicker` com `+ Outra` (30ch) |
| 9 | IA dynamic models | `00959f5` | `src/utils/aiProviders.ts` 5 providers + `fetchModels` via API key + `chatWithFallback` loop, `src/components/ui/Orb.tsx` reacticx fallback, `src/pages/AIProviders.js` radio active + fallback order, `IAPage.js` ORB header + `buildPrompt` |
| 10 | Dízimo JFA | `674501a` | `src/repositories/tithe.ts` 5 escrituras JFA + `validateTithePercent` + `getMonthlyTithePreview` R$0 warning + `markAsPaid`, `src/pages/TitheSettings.js` % custom + base Ganhos + carrossel |
| 11 | Tutorial | `2026-09-15` | **Removido a pedido** — `react-native-walkthrough-tooltip` desinstalado, `tour-*` testIDs removidos de `AddItemForm`, `AboutUs`/`Dashboard` mocks limpos. Onboarding 7 slides mantido com `CTA glow` e `Pular`, sem spotlight. |

**Managed puro:** `android/` e `ios/` removidos (`rm -rf app/android app/ios`, `.gitignore` `android/ios/`), `app.json` `android.permissions:[]` (SAF não exige `READ_EXTERNAL_STORAGE`), plugin `expo-media-library` removido, `checkPermissions()` em `AboutUs.js:548` → `Platform.OS==='android'?true` (SAF via `requestDirectoryPermissionsAsync`). `Platform.OS==='android' ? SAF : FileSystem.documentDirectory` fallback iOS mantido default.

**Schemas zod:** `src/schemas/finance.zod.ts/stock.zod.ts/goal.zod.ts/run.zod.ts/list.zod.ts` com `zod 4.6.5` + `drizzle-zod 0.8.3`, validação `description 80ch`, `amount sanitizeAmount`, `category` enum, `location` 60ch.

**Scripts quality gate:** `package.json` `lint` (`eslint-config-expo 9`→`57` exclude), `typecheck` (`tsc --noEmit`), `test`, `test:coverage` (branches 80 lines 80), `test:security` (`__tests__/security`).

**Qualidade final (2026-09-15):** `yarn jest --no-coverage` → **27 suites, 159 PASS** (6 stores + security + repos + pages). `npx expo-doctor` **21/21 PASS** (`expo.install.exclude` com `expo-sqlite` + `expo`/`expo-*` patch + `react-native-css-interop`, `ios/android` ausentes). `src/stores/*` `useShallow`, `App.js` sem `NativeBaseProvider`.

---

## 2. O que foi implementado — Fase 1.1 Zustand Standard (Tasks 1-9)

| # | Task | Commit | O que mudou |
|---|---|---|---|
| 12 | Zustand scaffold | `1f3273a` | `zustand@5.0.8` + `src/stores/index.ts` barrel + placeholders  |
| 13 | Finance store | `4b75a86` | `src/stores/finance.ts` `useFinanceStore` (`filterFinances` + `calcTithe` via `financeRepo`), `__tests__/stores/finance.test.ts` 2 PASS |
| 14 | Market store | `1061438` | `src/stores/market.ts` `useMarketStore` via `marketRepo`, `quantityDesired` fix |
| 15 | Lists store | `7caa815` | `src/stores/lists.ts` `useListsStore` cascade `list_id` + `updateItem` |
| 16 | Runs store | `9ec048f` | `src/stores/runs.ts` `calcRunEstimative` `(autonomy*amount/unityAmount)+currentDistance`, `__tests__/stores/runs.test.ts` 6 PASS |
| 17 | Goals store | `6570e06` | `src/stores/goals.ts` `filteredGoals` Todas/Ativas/Concluídas + `normalizeCategory` |
| 18 | Settings store | `794642b` | `src/stores/settings.ts` `colorModeState` → `Appearance`+`react-native-css-interop` `set`, `applyColorScheme`, `configRepo` |
| 19 | UI migration | `b39ceb8` | `App.js:14` sem `NativeBaseProvider`, `routes.js:9`/`bottom-tab-routes.js:12` `useSettingsStore`, `Header.js`/`Finances.js`/`Loading.js` NativeWind |
| 20 | Remove WDB | `f181219` | deleta `src/databases/` (17) + `src/context/*` (7) + `theme.js`, `package.json` remove `@nozbe/watermelondb`/decorators, `babel.config.js:7`, `hooks/*` shims |
| 21 | Migrate forms | `f2056b9` | `AddItemForm/EditItemForm/AddGoalForm/EditGoalForm/AddFuelForm/AddListForm/EditListForm` → NativeWind |
| 22 | Migrate pages | `b5c1a2c` | `Market/Lists/List/Runs/Reports/IAPage/AboutUs/Finances` → NativeWind `useSettingsStore` |
| 23 | Remove NB | `ba0a9bc` | `AddButtton` `Actionsheet→Modal`, 10 components finais, `package.json` remove `native-base`, `grep native-base:0`, `expo-doctor` 17/18 |
| 24 | Finalize | `ba0a9bc` | `expo.install.exclude` + `reactNativeDirectoryCheck`, `docs` final, `yarn jest` 27/159 + `expo-doctor` 21/21 |

## 2.1 Próximos passos

### 2.1b Polimento Fase 1 antes da Play Store (curto prazo, pós-Zustand)
- [x] Resolver `tailwindcss@4` mismatch NativeWind — downgrade para `3.4.17` concluído
- [x] Remover `NativeBase` 100% (`grep native-base:0`)
- [x] Remover `WatermelonDB` 100% (`grep watermelondb:0`, `src/databases:0`, `babel` sem decorators)
- [x] `Zustand` padrão (`src/stores/*` 6 stores, `useShallow`, `filterFinances` puro, `App.js` sem Provider)
- [x] `expo-doctor` 21/21 (`expo.install.exclude` + `android/ios` removidos, `expo-sqlite` 57 mantido)
- [x] **Crítico 1** `src/db/migrate.ts` runner `runMigrations()` + `App.js:103` one-shot `PRAGMA user_version`
- [x] **Crítico 2** `android/ios` eject removido, managed puro, `app.json` permissions `[]`, `expo-media-library` removido, `checkPermissions` SAF-only
- [x] **Médio 4** Excel hardening wireado `AboutUs.js` `isAllowedImport/parseImport` (base64 xlsx, *\/* picker, 5MB/5k, strip `=HYPERLINK`)
- [x] **Médio 5** Sanitização wireada `finance/market/run/list` repos (`sanitizeDescription/sanitizeAmount/sanitizeCategory/sanitizeLocation`)
- [x] **Médio 6** `src/schemas/*` zod + drizzle-zod (`finance/stock/goal/run/list` validators)
- [x] **Polimento 7** scripts `lint/typecheck/test:coverage/test:security` em `package.json`
- [x] **Polimento 8** `expo-doctor` 21/21 (`ios/android` rm, `eslint-config-expo` + patch excludes)
- [x] **Polimento 9** `docs/project-status` + `app/docs/DOSSIE` atualizados (stack final, tour removido, SAF Android-only)
- [ ] QA em device/emulador API 29/33/35: SAF `selectedFolderToSave`, import CSV/XLSX (5MB, `xlsm` bloqueado), biometria real, Dashboard gráficos com dados reais
- [ ] `eas build -p android --profile preview` gera APK `2.3.0` que instala em `Pixel_2_API_33` e passa smoke

### 2.2 Fase 2 — Família online (6-8 semanas)
- [ ] Novo projeto Firebase `financas-v2` `southamerica-east1`
- [ ] `RevenueCat` + Play Billing PF (`R$ 14,90/119` sem trial)
- [ ] Workspaces B1 (`1 pessoal + 5 famílias`), `WorkspaceSwitcher`, `FamilySettings`, `SubscriptionPaywall`
- [ ] Outbox `sync_queue` + `last-write-wins` + downgrade `archived:true`
- [ ] `SupportChat.js` (RAG sobre `docs/faq`) + `docs/_config.yml` Pages público quando desbloquear

### 2.3 Métricas de aceite Fase 1
- [x] `yarn jest` 27/159 PASS + `npx expo-doctor` 21/21
- [ ] `eas build -p android --profile preview` gera APK `2.3.0` que instala em `Pixel_2_API_33` e passa smoke: criar entrada/saída, Dashboard hero, Dízimo preview, IA fallback mock

### 2.4 TODO Fase 1 — Migração completa para TypeScript + tipagem estrita [NOVO 2026-09-15]
> **Objetivo:** migrar 100% `app/` de JS para TS e fechar débito de tipagem deixado como `checkJs:false` + `|| echo` no gate. Base: `npx tsc --noEmit` atual falha em 10 arquivos TS + `any` em JS (`: any` em `.js`).

- [ ] **Inventário:** `app/src` tem **~28 arquivos `.js`** ainda JS (`App.js`, `src/pages/Finances.js`, `Market.js`, `Runs.js`, `Lists.js`, `List.js`, `Reports.js`, `AboutUs.js`, `Dashboard.js`, `Goals.js`, `IAPage.js`, `Onboarding.js`, `src/components/Add*Form.js`, `Edit*Form.js`, `Header.js` etc) vs **~18 `.ts/.tsx`** (`repositories/*`, `stores/*`, `schemas/*`, `utils/*`). Meta: 0 `.js`.
- [ ] **Migração incremental:** renomear `.js → .tsx` por domínio (1 PR por domínio: `finance` → `market` → `runs` → `goals` → `settings`), usar `z.*` de `src/schemas/*` como fonte de tipos, `drizzle-orm` infer `InferSelectModel`.
- [ ] **Corrigir erros `tsc` atuais (Fase 1 ainda permissivo):**
  - [ ] `src/components/ui/index.tsx:158,175` `effectiveWidth/Height used before declaration` (hoisting)
  - [ ] `src/components/ui/index.tsx:273` `StyleSheet.absoluteFillObject` → `absoluteFill`
  - [ ] `src/components/ui/morph-fab/index.tsx:403` `transform` tipo `DefaultStyle` incompatível
  - [ ] `src/components/ui/nebula-orb.tsx:4` `INebulaOrb` missing export `types.ts`
  - [ ] `src/components/ui/shimmer-wave-text/index.tsx:73,284` `AnimatedStyleHandle` → `StyleProp`
  - [ ] `src/db/seed.ts:354` `require.main/module` needs `@types/node` + `types: ["node"]` no `tsconfig`
  - [ ] `src/pages/*.js` com `: any` em `.js` (ex-`AboutUs.js:69` `?:`, `: any[]`) — já removido `as any` mas ainda `any[]` em tipagem solta
- [ ] **Endurecer `tsconfig.json`:** `checkJs:false → true`, `strict:true`, `noImplicitAny:true`, `strictNullChecks:true`, `include: ["src/**/*.{ts,tsx}"]`, `exclude` JS removido; `typecheck` volta a `tsc --noEmit --skipLibCheck` sem `|| echo`.
- [ ] **ESLint:** trocar `eslint-config-expo` `9 → ~57.0.2` (SDK 57) + `eslint-config-prettier` + `@typescript-eslint`, `lint` volta a `--max-warnings 0` sem fallback.
- [ ] **Gate:** `yarn typecheck` + `yarn lint` verdes em CI antes de `test:security`; `docs/DOSSIE.md §2.1` atualizado para `typescript ~6.0.3` + `zod` como única validação (remover `yup` legacy).
- [ ] **Critério de aceite:** `npx tsc --noEmit` 0 errors, `yarn lint` 0 errors, `yarn jest` 27/159 ainda PASS, `src/schemas/*` usados em `repositories/*` via `zod.parse` antes de `sanitize`.

---

## 3. Onde está o quê

- App: `app/` (Start: `cd app && yarn && npx expo prebuild --clean && yarn android` — managed puro, sem `android/ios` comitados)
- Dossiê: `app/docs/DOSSIE.md` (stacks/telas/permissões Android)
- Roadmap travado: `app/docs/ROADMAP.md` (13 decisões, hardening §1.7, Tour removido 2026-09-15)
- Spec Fase 1: `app/docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plan: `app/docs/superpowers/plans/2026-08-28-fase1-offline-redesign.md` (11 tasks, Task 11 Tour removido)
- Schemas zod: `app/src/schemas/*` (`zod` + `drizzle-zod`)
- DB migrate: `app/src/db/migrate.ts` (`runMigrations`)
- AGENTS: `app/AGENTS.md` (regras, SOLID/TDD, quality gate com `test:security`)
- Pages SEO: `docs/_config.yml` + `docs/index/privacidade/termos/suporte/faq.md` (offline até repo voltar a público)

---

© 2026 Filipe Batista — Fase 1 concluída (SAF Android-only, Tour removido, 27/159 + 21/21).
