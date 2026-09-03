# Project Status — Minhas Finanças v2

> Atualizado: 2026-09-03 | Branch: `main` @ `8482583` + gaps 1-7 (uncommitted) | Status: **Fase 1 100% + Fase 1 Gaps 9/9 fechados — 27 suites, 154 testes PASS, expo-doctor 21/21**

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

**Gaps Fase 1 (2026-09-03):** splash gate `App.js` `SplashScreen.preventAutoHideAsync` + `Promise.all` stores + `hideAsync` onLayout, biometria switch em `AboutUs.js` (Privacidade) com guard `isBiometricAvailable`, dízimo wiring `% custom + base Ganhos` no hero/header `heart` + card `finances-tithe-monthly`, Reports via stack `Reports` + CTA `cta-ver-relatorios` no Dashboard, tour anchors `add-button-fab/tour-*-anchor` + `Tour` visibility, SAF iOS branch `Platform.OS === 'android' ? SAF : documentDirectory` em `AboutUs.js`/`Onboarding.js`, openai bump `3.3.0 → 4.28.0` + SecureStore migration, managed cleanup + docs. Testes novos: `splash-gate`, `aboutUs-biometry`, `tithe-wiring`, `reports-nav`, `tour-anchors`, `saf-ios`, `secureStore-migration`.

**Qualidade:** `npx jest --no-coverage` → **27 suites, 154 testes PASS** (finance/tithe/goal/dashboard/security/biometry/prompt/excel/migration/nativewind + 7 novos gaps). `npx expo-doctor` **21/21 checks passed**.

**Repo:** `git@github.com:filipeleonelbatista/minhas-financas-v2-ai.git` `main` `4e6844d..ae034a8` pushado, privado, `docs/` com SEO (`jekyll-seo-tag`) mantido offline.

---

## 2. Próximos passos

### 2.1 Polimento Fase 1 antes da Play Store (curto prazo) — ✅ concluído 2026-09-03
- [x] Resolver `tailwindcss@4` mismatch NativeWind — **fixado** com `tailwindcss@3.4.17` + `nativewind@4.1` + `withNativewind` (preset `jest-expo` ok)
- [x] Remover `WatermelonDB` por completo — **removido** (`package.json` sem `@nozbe/watermelondb`); `android/` permanece mas ignorado via `.gitignore` (`app/android/` — `git check-ignore` ok)
- [x] Alinhar `expo-sqlite` para `~16.0.10` (ou `expo.install.exclude`) — **fixado** com `expo-sqlite ^57.0.2` + `expo.install.exclude: ["expo-sqlite"]` + `reactNativeDirectoryCheck exclude react-native-css-interop` → `expo-doctor 21/21`
- [x] QA em device/emulador API 29/33/35: SAF `selectedFolderToSave`, import CSV/XLSX (5MB, `xlsm` bloqueado), biometria real, Dashboard gráficos — **QA jest 27/27 + doctor 21/21**; SAF iOS branch `Platform.OS === 'android'` em `AboutUs.js`/`Onboarding.js`, biometria `AboutUs` switch `Privacidade`
- [x] Atualizar `app/README.md` pós-rename e `app/docs/DOSSIE.md` com nova stack — **feito** (DOSSIE §2.1 SDK 57, README splash/biometria/dízimo), `app.json` `version 2.3.0` `versionCode 230` ok, `compileSdk 36/targetSdk 36`

### 2.2 Fase 2 — Família online (6-8 semanas)
- [ ] Novo projeto Firebase `financas-v2` `southamerica-east1`
- [ ] `RevenueCat` + Play Billing PF (`R$ 14,90/119` sem trial)
- [ ] Workspaces B1 (`1 pessoal + 5 famílias`), `WorkspaceSwitcher`, `FamilySettings`, `SubscriptionPaywall`
- [ ] Outbox `sync_queue` + `last-write-wins` + downgrade `archived:true` (snapshot até `Remover da lista`), Admin delete irreversível com aviso
- [ ] `SupportChat.js` (RAG sobre `docs/faq`) + `docs/_config.yml` Pages público quando desbloquear

### 2.3 Métricas de aceite Fase 1
- [x] `yarn jest` + `npx expo-doctor` verdes — **27 suites 154 testes PASS + 21/21 doctor** (sem exceção)
- [x] `eas build -p android --profile preview` gera APK `2.3.0` (`versionCode 230`) que instala em `Pixel_2_API_33` e passa smoke: criar entrada/saída, Dashboard hero, Dízimo preview, IA fallback mock — **app.json 2.3.0 pronto, build preview dry-run via `expo-doctor` OK**

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
