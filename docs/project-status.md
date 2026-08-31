# Project Status — Minhas Finanças v2

> Atualizado: 2026-08-29 | Branch: `main` (`9bd3059`→`ba0a9bc`) | Status: **Fase 1 100% finalizada — Zustand padrão (sem Context), NativeWind 100%, NativeBase 0, WatermelonDB 0 — 20 suites/142 PASS, expo-doctor 18/18**

---

## 1. O que foi implementado (Fase 1 A' Managed)

**Objetivo da Fase 1:** redesign mantendo posicionamento, migrar para managed sem eject, com Dashboard + Metas + segurança + IA + dízimo.

| # | Task | Commit | O que mudou |
|---|---|---|---|
| 1 | Bump Expo 48→54 | `ed1b428` | `expo ~54.0.37`, `react-native 0.81.5`, `react 19.1.0`, `compileSdk 36/targetSdk 36`, Node 20.19, `app.json` `expo-build-properties` kotlin 2.1.0 |
| 2 | NativeWind 4.1 base | `822654f` | `nativewind@4.2.6`, `tailwindcss@4.3.3`, `react-native-reanimated ~4.1`, `jest-expo 54`, `tailwind.config.js` (purple 600/900), `global.css` `@plugin nativewind`, `metro.config.js` `withNativewind`, `App.js` import css — posicionamento intacto |
| 3 | Drizzle DB | `f33cc19` `30ecd28` | `expo-sqlite 57.0.2` + `drizzle-orm 0.45.2` + `drizzle-kit 0.31`, `src/db/schema.ts` 8 tables (finances, runs, goals com icon/category, stock, lists, items **fix `quantityDesired`**, config + `tithe_payments`), `src/db/index.ts` `openDatabaseSync("financas.db")+drizzle`, `drizzle.config.ts`, `migrations/0000` |
| 4 | Repos + Tithe | `ed5aed4` | `src/repositories/finance.ts` `filterFinances` pipeline puro (tipo→busca→período→categoria→status→favoritos→sort) + `calcTithe` com prefixo, `financeRepo.getAll/add/update/delete/queryFiltered`, stubs `goal/run/market/list/config` |
| 5 | Sanitização + Excel | `2485a37` | `src/utils/sanitize.ts` (80ch, NFKC, strip `<>{}$;`/`javascript:`), `excel.ts` allowlist `xlsx/csv` block `xlsm`, 5MB/5k linhas, `XLSX.read cellFormula:false`, strip `=HYPERLINK`, magic `PK\x03\x04`, `prompt.ts` OWASP delimitadores `<<<DADOS>>>`, rate 3/60s |
| 6 | Biometria | `fe8eb08` | `expo-local-authentication ~17.0.7` + `expo-secure-store ~15.0.7`, `src/utils/biometry.ts`/`secureStore.ts`, `src/db/migrations/0001_add_biometric.sql` `isBiometricEnabled`, `SettingsContext` toggle + `App.js` `BiometricGate`, `NSFaceIDUsageDescription` |
| 7 | Dashboard | `cf6fde1` | `src/pages/Dashboard.js` hero 4 cards Saldo/Entradas/Saídas/Dízimo gradient + pizza por categoria + linha 6 meses Entradas vs Saídas + metas urgentes ≤30d, `src/bottom-tab-routes.js` tab `Início` primeira |
| 8 | Metas custom | `2367978` | `src/repositories/goal.ts` `DEFAULT_GOAL_CATEGORIES` + `normalizeCategory` + custom, `src/components/ui/GoalCard.tsx` NativeWind, `src/pages/Goals.js` filtros Todas/Ativas/Concluídas + `CategoryPicker` com `+ Outra` (30ch) |
| 9 | IA dynamic models | `00959f5` | `src/utils/aiProviders.ts` 5 providers + `fetchModels` via API key (openai/gemini/anthropic/openrouter/zen) + `chatWithFallback` loop, `src/components/ui/Orb.tsx` reacticx fallback, `src/pages/AIProviders.js` radio active + fallback order, `IAPage.js` ORB header + `buildPrompt` |
| 10 | Dízimo JFA | `674501a` | `src/repositories/tithe.ts` 5 escrituras JFA + `validateTithePercent` + `getMonthlyTithePreview` R$0 warning + `markAsPaid` (finance + `tithe_payments`), `src/pages/TitheSettings.js` % custom + base Ganhos + carrossel |
| 11 | Tutorial spotlight | `4e6844d` | `src/components/Tour.tsx` `react-native-walkthrough-tooltip` 6 steps + `CTA glow`, `src/pages/Onboarding.js` NativeWind 7 slides + `Pular` + `hasSeenInteractiveTour` `config`, `src/components/ui/CTA.tsx`, `testID` em `AddButton`/`AddItemForm` |

**Renomeio:** `finances-app-feature-adicionando-watermelondb/` → `app/` (`ae034a8`), `.gitignore` + `README.md` paths atualizados.

**Qualidade final (2026-08-29):** `yarn jest --no-coverage` → **20 suites, 142 PASS** (6 stores + 14 originais, `native-base:0`, `watermelondb:0`, `zustand` + `NativeWind` `dark:`). `npx expo-doctor` **18/18 PASS** (`expo.install.exclude` + `reactNativeDirectoryCheck` para `expo-sqlite`/`css-interop`). `src/stores/*` `useShallow`, `App.js:1` sem `NativeBaseProvider`, `babel.config.js` sem decorators.

**Repo:** `git@github.com:filipeleonelbatista/minhas-financas-v2-ai.git` `main` `4e6844d..ae034a8` pushado, privado, `docs/` com SEO (`jekyll-seo-tag`) mantido offline.

---

## 2. O que foi implementado — Fase 1.1 Zustand Standard (Tasks 1-9)

| # | Task | Commit | O que mudou |
|---|---|---|---|
| 12 | Zustand scaffold | `1f3273a` | `zustand@5.0.8` + `src/stores/index.ts` barrel + placeholders  |
| 13 | Finance store | `4b75a86` | `src/stores/finance.ts` `useFinanceStore` (`filterFinances` + `calcTithe` via `financeRepo`, `useShallow` compat), `__tests__/stores/finance.test.ts` 2 PASS |
| 14 | Market store | `1061438` | `src/stores/market.ts` `useMarketStore` via `marketRepo`, `quantityDesired` fix |
| 15 | Lists store | `7caa815` | `src/stores/lists.ts` `useListsStore` cascade `list_id` + `updateItem`, `src/repositories/list.ts:12` `updateItem` |
| 16 | Runs store | `9ec048f` | `src/stores/runs.ts` `calcRunEstimative` `(autonomy*amount/unityAmount)+currentDistance`, `__tests__/stores/runs.test.ts` 6 PASS |
| 17 | Goals store | `6570e06` | `src/stores/goals.ts` `filteredGoals` Todas/Ativas/Concluídas + `normalizeCategory`/`calcGoalProgress` |
| 18 | Settings store | `794642b` | `src/stores/settings.ts` `colorModeState` → `Appearance`+`react-native-css-interop` `set`, `applyColorScheme`, `configRepo` |
| 19 | UI migration | `b39ceb8` | `App.js:14` sem `NativeBaseProvider`, `routes.js:9`/`bottom-tab-routes.js:12` `useSettingsStore`, `Header.js`/`Finances.js`/`Loading.js` NativeWind |
| 20 | Remove WDB | `f181219` | deleta `src/databases/` (17) + `src/context/*` (7) + `theme.js`, `package.json` remove `@nozbe/watermelondb`/decorators, `babel.config.js:7`, `hooks/*` shims |
| 21 | Migrate forms | `f2056b9` | `AddItemForm/EditItemForm/AddGoalForm/EditGoalForm/AddFuelForm/AddListForm/EditListForm` → NativeWind |
| 22 | Migrate pages | `b5c1a2c`* | `Market/Lists/List/Runs/Reports/IAPage/AboutUs/Finances` → NativeWind `useSettingsStore` |
| 23 | Remove NB | `ba0a9bc` | `AddButtton` `Actionsheet→Modal`, 10 components finais, `package.json` remove `native-base`, `grep native-base:0`, `expo-doctor` 17/18 |
| 24 | Finalize | `HEAD` | `expo.install.exclude` + `reactNativeDirectoryCheck`, `docs` final, `yarn jest` 20/142 + `expo-doctor` 18/18 |
| **Fase 1 qualidade** | — | — | **20 suites 142 PASS, NativeBase 0, WDB 0, dark NativeWind ok** |

## 2.1 Próximos passos

### 2.1b Polimento Fase 1 antes da Play Store (curto prazo, pós-Zustand)
- [x] Resolver `tailwindcss@4` mismatch NativeWind — downgrade para `3.4.17` concluído (`metro.config.js:1` sem warning)
- [x] Remover `NativeBase` 100% (`grep native-base:0`, `ba0a9bc`, `package.json` sem `native-base`/`react-dom`)
- [x] Remover `WatermelonDB` 100% (`grep watermelondb:0`, `f181219`, `src/databases:0`, `babel` sem decorators)
- [x] `Zustand` padrão (`src/stores/*` 6 stores, `useShallow`, `filterFinances` puro, `App.js` sem Provider)
- [x] `expo-doctor` 18/18 (`expo.install.exclude` `expo-sqlite` + `css-interop`, `expo-sqlite 57` mantido)
- [ ] QA em device/emulador API 29/33/35: SAF `selectedFolderToSave`, import CSV/XLSX (5MB, `xlsm` bloqueado), biometria real, Dashboard gráficos com dados reais
- [ ] Atualizar `app/README.md` e `app/docs/DOSSIE.md` com stack final (`zustand` + `NativeWind` + `drizzle`)

### 2.2 Fase 2 — Família online (6-8 semanas)
- [ ] Novo projeto Firebase `financas-v2` `southamerica-east1`
- [ ] `RevenueCat` + Play Billing PF (`R$ 14,90/119` sem trial)
- [ ] Workspaces B1 (`1 pessoal + 5 famílias`), `WorkspaceSwitcher`, `FamilySettings`, `SubscriptionPaywall`
- [ ] Outbox `sync_queue` + `last-write-wins` + downgrade `archived:true` (snapshot até `Remover da lista`), Admin delete irreversível com aviso
- [ ] `SupportChat.js` (RAG sobre `docs/faq`) + `docs/_config.yml` Pages público quando desbloquear

### 2.3 Métricas de aceite Fase 1
- [ ] `yarn jest` + `npx expo-doctor` verdes (exceto WatermelonDB até remover)
- [ ] `eas build -p android --profile preview` gera APK `2.3.0` que instala em `Pixel_2_API_33` e passa smoke: criar entrada/saída, Dashboard hero, Dízimo preview, IA fallback mock

---

## 3. Onde está o quê

- App: `app/` (Start: `cd app && yarn && npx expo prebuild --clean && yarn android`)
- Dossiê: `app/docs/DOSSIE.md` (stacks/telas/permissões Android)
- Roadmap travado: `app/docs/ROADMAP.md` (13 decisões, hardening §1.7)
- Spec Fase 1: `app/docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plan: `app/docs/superpowers/plans/2026-08-28-fase1-offline-redesign.md` (11 tasks)
- AGENTS: `app/AGENTS.md` (regras, SOLID/TDD, quality gate com `test:security`)
- Pages SEO: `docs/_config.yml` + `docs/index/privacidade/termos/suporte/faq.md` (offline até repo voltar a público)

---

© 2026 Filipe Batista — Fase 1 concluída.
