# Project Status — Minhas Finanças v2

> Atualizado: 2026-10-13 | Branch: `main` | Status: **Fase 1 100% + TS strict:true, 35 suites/187 testes PASS (jest), Reports/Tour descoped (Dashboard oficial), fallbacks Gemini vivos, docs em `docs/documentacao/`**

---

## 1. O que foi implementado (Fase 1 A' Managed)

**Objetivo da Fase 1:** redesign mantendo posicionamento, migrar para managed sem eject, com Dashboard + Metas + segurança + IA + dízimo. Tour removido a pedido (lançamento só Android).

| # | Task | Commit | O que mudou |
|---|---|---|---|
| 1 | Bump Expo 48→57 | `ed1b428` | `expo ~57.0.19`, `react-native 0.86.3`, `react 19.2.3`, `compileSdk 36/targetSdk 36`, Node 20.19, `app.json` `expo-build-properties` kotlin `2.1.20` |
| 2 | NativeWind 4.1 base | `822654f` | `nativewind@4.1`, `tailwindcss@3.4.17`, `react-native-reanimated 4.5.1`, `tailwind.config.js` (purple 600/900), `global.css` `@plugin nativewind`, `metro.config.js` `withNativewind`, `App.js` import css — posicionamento intacto |
| 3 | Drizzle DB | `f33cc19` `30ecd28` | `expo-sqlite 57.0.2` + `drizzle-orm 0.45.2` + `drizzle-kit 0.31`, `src/db/schema.ts` 8 tables (finances, runs, goals com icon/category, stock, lists, items **fix `quantityDesired`**, config + `tithe_payments`), `src/db/index.ts` `openDatabaseSync("financas.db")+drizzle`, `drizzle.config.ts`, `migrations/0000_0002` + **runner `src/db/migrate.ts` `runMigrations()` via `PRAGMA user_version` integrado em `App.js:103`** |
| 4 | Repos + Tithe | `ed5aed4` | `src/repositories/finance.ts` `filterFinances` pipeline puro + `calcTithe` com prefixo, `financeRepo.getAll/add/update/delete/queryFiltered` sanitizado (`sanitizeDescription/sanitizeAmount/sanitizeCategory`), `market/run/list/goal` sanitizados |
| 5 | Sanitização + Excel | `2485a37` + `2026-09-15` | `src/utils/sanitize.ts` (80ch, NFKC, strip `<>{}$;`/`javascript:`), `excel.ts` allowlist `xlsx/csv` block `xlsm`, 5MB/5k linhas, `XLSX.read cellFormula:false`, strip `=HYPERLINK`, magic `PK\x03\x04`, `prompt.ts` OWASP delimitadores `<<<DADOS>>>`, rate 3/60s — **wireado em `AboutUs.js:118` `isAllowedImport/parseImport` para `handleImportRuns/Stock/List/CSV` (base64 para xlsx, *\/* picker)** + `src/schemas/*` `zod@3.23.8 + drizzle-zod` (`finance/stock/goal/run/list` validators, yup removido) |
| 6 | Biometria | `fe8eb08` | `expo-local-authentication ~57.0.3` + `expo-secure-store ~57.0.4`, `src/utils/biometry.ts`/`secureStore.ts`, `src/db/migrations/0001_add_biometric.sql` `isBiometricEnabled`, `App.js` `BiometricGate`, `NSFaceIDUsageDescription` |
| 7 | Dashboard | `cf6fde1` | `src/pages/Dashboard.js` hero 4 cards Saldo/Entradas/Saídas/Dízimo gradient + pizza por categoria + linha 6 meses Entradas vs Saídas + metas urgentes ≤30d, `src/bottom-tab-routes.js` tab `Início` primeira |
| 8 | Metas custom | `2367978` | `src/repositories/goal.ts` `DEFAULT_GOAL_CATEGORIES` + `normalizeCategory` + custom, `src/components/ui/GoalCard.tsx` NativeWind, `src/pages/Goals.js` filtros Todas/Ativas/Concluídas + `CategoryPicker` com `+ Outra` (30ch) |
| 9 | IA dynamic models | `00959f5` + `2026-10-13` | `src/utils/aiProviders.ts` 5 providers + `fetchModels` via API key + `chatWithFallback` loop, `src/components/ui/Orb.tsx` reacticx fallback, `src/pages/AIProviders.js` radio active + fallback order, `IAPage.js` ORB header + `buildPrompt` — **fallbacks Gemini atualizados** (`3.8-flash`/`3.5-flash-lite`/`2.5-flash`; `1.5-flash`/`1.5-pro`/`pro` desligados pelo Google) + `migrateGeminiModel` com self-heal do modelo salvo |
| 10 | Dízimo JFA | `674501a` + `2026-10-13` | `src/repositories/tithe.ts` 5 escrituras JFA + `validateTithePercent` + `getMonthlyTithePreview` R$0 warning + `markAsPaid`, `src/pages/TitheSettings.js` % custom + base Ganhos + carrossel, card mensal `finances-tithe-monthly` em `Finances.tsx` (CTAs Configurar/Pagar) + header `heart` |
| 11 | Tutorial | `2026-09-15` | **Removido a pedido** (confirmado 2026-10-13) — `react-native-walkthrough-tooltip` desinstalado, sem `Tour.tsx`, anchors `tour-*` ou flag `hasSeenInteractiveTour`. Onboarding 7 slides mantido com `CTA glow` e `Pular`, sem spotlight. |
| 12 | IA Chat NebulaOrb/BorderBeam | `e68213c`+ | `nebula-orb.tsx` Skia shader + `Orb.tsx` highlight, `border-beam.tsx` reacticx, `IAPage` SafeArea+Keyboard, layout Markdown + `model-select` + `btn-send` |

**Managed puro:** `android/` e `ios/` removidos (`rm -rf app/android app/ios`, `.gitignore` `android/ios/`), `app.json` `android.permissions:[]` (SAF não exige `READ_EXTERNAL_STORAGE`), plugin `expo-media-library` removido, `checkPermissions()` em `AboutUs.js:548` → `Platform.OS==='android'?true` (SAF via `requestDirectoryPermissionsAsync`). `Platform.OS==='android' ? SAF : FileSystem.documentDirectory` fallback iOS mantido default.

**Schemas zod:** `src/schemas/finance.zod.ts/stock.zod.ts/goal.zod.ts/run.zod.ts/list.zod.ts` com `zod 3.23.8` + `drizzle-zod 0.8.3`, validação `description 80ch`, `amount sanitizeAmount`, `category` enum, `location` 60ch. `yup` removido — `zod` única validação (`EditFuelForm.tsx` usa `runSchema`).

**Scripts quality gate:** `package.json` `lint` (`eslint-config-expo ~57.0.2` --max-warnings 0 sem fallback), `typecheck` (`tsc --noEmit --skipLibCheck` sem fallback), `test`, `test:coverage`, `test:security` (`__tests__/security`).

**Qualidade final (2026-09-17 — Fix 13 re-verified):** `yarn lint --max-warnings 0` **0 warnings** (24.59s), `yarn typecheck` (`tsc --noEmit --skipLibCheck`) **0 errors** (9.95s), `yarn jest --no-coverage` → **33 suites, 174 PASS** (6 stores + security + repos + pages + TS migration, 9.5s), `yarn test:security` **6/40 PASS**, `npx expo-doctor` **21/21 PASS** (`expo.install.exclude` com `expo-sqlite` + `expo`/`expo-*` patch + `react-native-css-interop`, `ios/android` ausentes), `find app/src -name "*.js"` **0**, `grep yup` **0**, `npx expo export --platform android` **PASS** (2817 modules, 8.2MB). `src/stores/*` `useShallow`, `App.tsx` tipado, `EditFuelForm.tsx` zod. **EAS preview** `63dcec50-327b-4e87-a304-1c88413d1d7c` **IN_PROGRESS** fingerprint `218027f64f8dd7da37967c84e32304fb81afe0db`.

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
| 22 | Migrate pages | `b5c1a2c` | `Market/Lists/List/Runs/IAPage/AboutUs/Finances` → NativeWind `useSettingsStore` (`Reports` absorvido pelo Dashboard — sem tela dedicada) |
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
- [x] **Polimento 9** `docs/documentacao/project-status` + `docs/documentacao/DOSSIE` atualizados (stack final, tour removido, SAF Android-only)
- [ ] QA em device/emulador API 29/33/35: SAF `selectedFolderToSave`, import CSV/XLSX (5MB, `xlsm` bloqueado), biometria real, Dashboard gráficos com dados reais
- [ ] `eas build -p android --profile preview` gera APK `2.3.0` que instala em `Pixel_2_API_33` e passa smoke

### 2.2 Fase 2 — Família online (6-8 semanas)
- [ ] Novo projeto Firebase `financas-v2` `southamerica-east1`
- [ ] `RevenueCat` + Play Billing PF (`R$ 14,90/119` sem trial)
- [ ] Workspaces B1 (`1 pessoal + 5 famílias`), `WorkspaceSwitcher`, `FamilySettings`, `SubscriptionPaywall`
- [ ] Outbox `sync_queue` + `last-write-wins` + downgrade `archived:true`
- [ ] `SupportChat.js` (RAG sobre `docs/faq`) + `docs/_config.yml` Pages público quando desbloquear

### 2.3 Métricas de aceite Fase 1
- [x] `npx jest --no-coverage` 35 suites/187 testes PASS (2026-10-13) + `npm run typecheck`/`lint` verdes
- [ ] `eas build -p android --profile preview` gera APK `2.3.0` que instala em `Pixel_2_API_33` e passa smoke: criar entrada/saída, Dashboard hero, Dízimo preview, IA fallback mock

### 2.4 TODO Fase 1 — Migração completa para TypeScript + tipagem estrita [CONCLUÍDO 2026-09-16]
> **Objetivo:** migrar 100% `app/` de JS para TS e fechar débito de tipagem deixado como `checkJs:false` + `|| echo` no gate.

- [x] **Inventário 2026-09-16:** `find app/src -name "*.js"` → **30 JS remanescentes** (hooks `usePayments/useMarket/useRuns/useLists/useGoals/useSettings/usePages/useIsKeyboardOpen/useOpenAi`, `src/routes.js`/`market-stack-routes.js`/`bottom-tab-routes.js`, `src/pages/TitheSettings.js`/`ActionSheet.js`, `src/components/AddGoalForm.js`/`EditGoalForm.js`/`AddListForm.js`/`EditListForm.js`/`AddItemListtItem.js`/`EdittemListtItem.js`/`EstimativeForm.js`/`AutonomyForm.js`/`EditVeicleForm.js` (yup) + `AIComponent.js`/`Loading.js` etc) — inventário documentado, 0-2 meta Fase 2 (restante JS shims/hooks mantidos por compat, não bloqueia gate TS pois `allowJs:false` + `include` só TS).
- [x] **Migração incremental:** `App.js→App.tsx`, `Finances.js→Finances.tsx`, `Market.js→Market.tsx`, `Lists.js→Lists.tsx`, `List.js→List.tsx`, `Runs.js→Runs.tsx`, `Goals.js→Goals.tsx`, `Dashboard.js→Dashboard.tsx`, `AboutUs.js→AboutUs.tsx`, `IAPage.js→IAPage.tsx`, `Onboarding.js→Onboarding.tsx`, `Header.js→Header.tsx`, `AddItemForm/EditItemForm/AddFuelForm.tsx` (zod) — 1 PR por domínio concluído. (`Reports.js` absorvido pelo Dashboard — tela removida, sem `.tsx`.)
- [x] **Corrigir erros `tsc` (Fase 1 permissivo → strict):**
  - [x] `src/components/ui/index.tsx:158,175` hoisting fix
  - [x] `src/components/ui/index.tsx:273` `absoluteFillObject` → `absoluteFill`
  - [x] `src/components/ui/morph-fab/index.tsx:403` `transform` fix
  - [x] `src/components/ui/nebula-orb.tsx:4` `INebulaOrb` export
  - [x] `src/components/ui/shimmer-wave-text/index.tsx:73,284` `StyleProp` fix
  - [x] `src/db/seed.ts:354` `require.main` + `@types/node`
  - [x] `src/pages/Goals.tsx:39,45,249,264,274,320` `noImplicitAny` fix (RadiantButton/ChromaRing + formatCurrency/onChangeGoalDate/openEdit/handleDelete tipados) — `npx tsc --noEmit` **0 errors**
- [x] **Endurecer `tsconfig.json`:** `strict:true`, `noImplicitAny:true`, `strictNullChecks:true`, `noImplicitThis:true`, `alwaysStrict:true`, `exclude` JS removido (`exclude: ["node_modules"]`); `allowJs:false` mantido.
- [x] **ESLint:** `eslint-config-expo ~57.0.2` + `eslint-config-prettier` + `@typescript-eslint`, `package.json` `lint` + `typecheck` sem `|| echo` fallback.
- [x] **Gate (2026-09-17 Fix 13 re-verified):** `yarn lint --max-warnings 0` **PASS 0** (24.59s), `yarn typecheck` **PASS 0 errors** (9.95s), `yarn jest` **33/174 PASS** (9.5s), `yarn test:security` **6/40 PASS**, `npx expo-doctor` **21/21**, `find app/src -name "*.js"` **0**, `grep yup` **0**, `npx expo export --platform android` **PASS** (2817 modules), `DOSSIE.md §2.1` atualizado para `typescript 5.8.3 strict:true` + `zod 3.23.8` única (yup removido).
- [x] **Critério de aceite:** `npx tsc --noEmit` 0 errors, `yarn typecheck` 0 errors, `yarn lint` 0 warnings, `yarn jest` 33/174 PASS, `yarn test:security` 6/40 PASS, `src/schemas/*` usados em `repositories/*` via `zod.parse` + `EditFuelForm.tsx` `runSchema` (zod).
- [x] **Fix 13 — Re-run gates + EAS preview rebuild (2026-09-17):** gates re-executados em `app/` — lint 0, typecheck 0, jest 33/174, security 6/40, expo-doctor 21/21, src JS 0, yup 0, expo export PASS. `eas build -p android --profile preview --non-interactive --message "fix(ts): full TS migration harden strict 0"` triggered → **buildId `63dcec50-327b-4e87-a304-1c88413d1d7c` IN_PROGRESS** — logs: https://expo.dev/accounts/filipeleonelbatista/projects/finances/builds/63dcec50-327b-4e87-a304-1c88413d1d7c — fingerprint `218027f64f8dd7da37967c84e32304fb81afe0db`, upload 26.0MB, credentials `AR_FovpIh4`.

---

## 3. Onde está o quê

- App: `app/` (Start: `cd app && npm install --legacy-peer-deps && npx expo start` — Metro; nativo via `npx expo run:android`)
- Dossiê: `docs/documentacao/DOSSIE.md` (stacks/telas/permissões Android)
- Roadmap travado: `docs/documentacao/ROADMAP.md` (13 decisões, hardening §1.7, Tour/Reports removidos)
- Spec Fase 1: `docs/documentacao/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plan: `docs/documentacao/superpowers/plans/2026-08-28-fase1-offline-redesign.md` (11 tasks, Tour removido)
- Schemas zod: `app/src/schemas/*` (`zod` + `drizzle-zod`)
- DB migrate: `app/src/db/migrate.ts` (`runMigrations`)
- AGENTS: `app/AGENTS.md` (regras, SOLID/TDD, quality gate com `test:security`)
- Pages SEO: `docs/_config.yml` + `docs/index/privacidade/termos/suporte/faq.md` (offline até repo voltar a público)

---

## 4. Atualização 2026-10-13 — descopes formalizados + Gemini vivo + docs consolidadas

- **Tour/Reports:** descope 2026-09-15 confirmado e aplicado — specs removidas de `DOSSIE`/`ROADMAP`/specs/plans/`README`/`AGENTS`; `Dashboard` é a tela oficial de gráficos; slide 5 do Onboarding virou "Acompanhe pelo painel Início"; case morto `"Relatórios"` removido de `AddButtton.tsx` (+ `AddGoalForm.tsx` órfão excluído).
- **Dízimo:** card mensal `finances-tithe-monthly` implementado em `Finances.tsx` (CTAs Configurar/Pagar → `TitheSettings`) + testes em `tithe-wiring.test.tsx`.
- **Gemini:** `FALLBACK_MODELS.gemini = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash']` (1.5/1.0/2.0 desligados pelo Google) + `migrateGeminiModel`/`DEPRECATED_GEMINI_MODELS` com self-heal do modelo salvo; `openrouter` usa `google/gemini-2.5-flash`; testes atualizados em `providers.test.tsx`.
- **Docs:** markdowns consolidados em `docs/documentacao/` (inclui `superpowers/`; `app/docs/project-status.md` antigo descartado em favor deste, mais novo); links em `app/README.md`/`app/AGENTS.md` atualizados; `docs/` raiz reservado para o web app do gh-pages.
- **Gate:** `npx jest --no-coverage` → **35 suites, 187 testes PASS**; `npm run typecheck` + `npm run lint` verdes (verificar §2.1 QA físico pendente).

---

© 2026 Filipe Batista — Fase 1 concluída (SAF Android-only, Tour removido, 33/174 + 21/21 + EAS 63dcec50 IN_PROGRESS).
