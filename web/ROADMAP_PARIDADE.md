# ROADMAP — Web Paridade Total com Mobile

> Derivado de inspeção direta de `app/` (Expo 57 + drizzle + zustand) e `web/` (React 18 + Vite 5 + Context + localStorage). Objetivo: mesmas funcionalidades offline no web, PWA instalável, dados locais (localStorage + IndexedDB), IA online.

## Onde estamos

- Web tem: Finanças, Relatórios (Apex), Estoque, Corridas, Settings com CSV. Tudo em 4 Contexts + localStorage puro, sem tipagem, sem validação.
- Falta: Dashboard Início, Metas, Listas 2 níveis, Dízimo completo, IA, PWA total, zustand+zod, testes, NotFound.
- Libs defasadas: `react 18.2`, `vite 5.0.8`, `vite-plugin-pwa 0.19`, `eslint 8`, `ts 5.2`, `formik+yup`, `dayjs+date-fns` duplicados, `uuid`, `tsc-silent`.

## Fases

### Fase 0 — Base (1-2 dias)
- [x] Bump `vite 5→6`, `@vitejs/plugin-react 4→5`, `ts 5.2→5.6`, `vite-plugin-pwa 0.19→1.x` (Task 1 done; `react` mantido em `18.3.1` — 19 adiado p/ Task 8 por peers de day-picker/Radix/apexcharts)
- [x] Instalar `zustand@^5`, `zod@^3.23`, `idb-keyval`, `react-hook-form + @hookform/resolvers`, `vitest + @testing-library/react + jsdom`
- [x] Criar `src/__tests__/smoke.test.ts` (PASS); pin exato `apexcharts@3.45.2`/`react-apexcharts@1.4.1`/`react-icons@5.0.1`
- [ ] CI `web-ci.yml` (lint→typecheck→coverage→build→audit) — vai na Fase 7
- Build `tsc -b` ainda vermelho por dívida pré-existente de tipagem (era mascarada por `tsc-silent`) — fica verde na Fase 6/Task 7

### Fase 1 — zustand + zod (paridade, 2-3 dias) — VOCÊ PEDIU
- [ ] Criar `src/schemas/{finance,run,stock,list,goal,config}.zod.ts` espelhando `app/src/schemas/*`
- [ ] Criar `src/stores/{finance,runs,market,lists,goals,settings}.ts` zustand+ persist `mf-*-v1`, actions `load/add/update/remove/handleFavorite` iguais ao mobile
- [ ] Criar `src/lib/storage.ts` (get/set versionado, try/catch, `storage` event + `BroadcastChannel`)
- [ ] Teste `stores-parity.test.ts` (rejeita amount inválido, valida FK `list_id`, defaults config)
- Critério: stores passam, UI legada ainda funciona via adaptador

### Fase 2 — Storage offline robusto (1-2 dias)
- [ ] `src/utils/csv.ts` + `excel.ts` seguros (block fórmulas, 5MB/5000/20)
- [ ] `idb-keyval` fallback, migrador `mf-db-v1` → `v2`, multi-aba sync
- [ ] `Settings.tsx` usa novos helpers, mantém `nome-DD-MM-YYYY_HH-mm.csv`
- Critério: import malicioso bloqueado, JSON corrompido recupera sem tela branca

### Fase 3 — PWA total (1 dia)
- [ ] `vite.config.ts`: `clientsClaim/skipWaiting/cleanupOutdatedCaches/navigateFallback/runtimeCaching`, `includeAssets`, manifest `id/lang/shortcuts/screenshots/icons 192/512 maskable`
- [ ] `index.html`: `lang="pt-BR"`, apple 180, `mobile-web-app-capable`
- [ ] Gerar `public/192.png, 512.png, 512-maskable.png, 180-apple.png`, criar `ReloadPrompt.tsx` com `useRegisterSW`
- Critério: Lighthouse PWA verde, `dist/sw.js` + manifest gerados, update prompt visível

### Fase 4 — Features faltantes (3-5 dias)
- [ ] `Dashboard.tsx` (hero + pizza + linha 6m + metas urgentes + estoque falta)
- [ ] `Goals.tsx` (CRUD + deposit/withdraw + filtros + `Restam X dias`)
- [ ] `Lists.tsx` + `ListDetail.tsx` (2 níveis + cascade + gerar do estoque)
- [ ] `TitheSettings.tsx` (percent stepper + base + prefixo + histórico + markAsPaid)
- [ ] Rotas em `App.tsx` + `header.tsx`, `NotFound.tsx`
- Critério: paridade funcional clicável offline

### Fase 5 — IA online (2-3 dias)
- [ ] Portar `aiProviders.ts` (5 providers + fallback), `prompt.ts` (hardening 20 regex + delimitadores), `secureStore.ts` adaptado
- [ ] `AIProviders.tsx` + `IAPage.tsx` (gate `isAiEnabled`+chave, 3 prompts, rate-limit 3/60s, CSVs 80/30/60/30/20, limite 1000 chars)
- [ ] Banner offline `navigator.onLine===false`
- Critério: chat funciona com internet, bloqueia injection, falha graciosa offline

### Fase 6 — Forms + limpeza (1-2 dias)
- [ ] Migrar `form-*` de `formik+yup` → `RHF+zod`, tipar contexts ou remover, `NotFound`, filtros para URL search params (shareable)
- [ ] Deprecar `src/context/*`, remover `dayjs/uuid/formik/yup`
- Critério: `lint 0 warnings`, `build` verde

### Fase 7 — Qualidade final (feita)
- [x] Coverage 80%+ stores/schemas/utils/lib (`npm run test:coverage` verde: ~90/80/94)
- [x] `npm run lint` 0 erros/warnings, `npm run build` (`tsc -b`) verde, deps mortas removidas
- [x] CI: removido por decisão — Vercel cobre build do web
- [ ] `npm audit` limpo (aberto: 13 high + 3 critical transitivos de vitest/react-router) e suite `test:security` — acompanhar

## Ordem sugerida

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7`. Você pediu zustand+zod, então Fase 1 é inegociável e vem antes do PWA total. Plano agêntico detalhado em `docs/superpowers/plans/2026-10-13-web-paridade-total.md`.

## Riscos

- React 19 quebra Radix antigo → bump Radix junto.
- Tailwind 3→4 breaking → manter 3.4 nesta roadmap.
- `basicSSL` sempre ativo quebra preview → só em dev.
- Web não tem SecureStore/SQLite — chaves IA em localStorage com aviso + migrar para IndexedDB cifrado depois.
