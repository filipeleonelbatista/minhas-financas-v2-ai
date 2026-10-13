# AGENTS.md — Minhas Finanças Web — Guia para Agentes & Humanos

> Fonte de verdade do `web/`. Espelha o `app/` mobile (Expo SDK 57 + SQLite/drizzle) para paridade total offline, com PWA instalável e IA como única parte online. Stack web: React 19 + Vite 6 + Tailwind 3.4 + shadcn + zustand 5 + zod + IndexedDB/localStorage.

## 1. Propósito & Features (paridade com mobile)

| Domínio | Rota web | Arquivos-chave | Resumo / Regra |
|---|---|---|---|
| **Dashboard Início** | `/` | `src/pages/Dashboard.tsx`, `src/stores/finance.ts`, `src/stores/goals.ts` | Hero Saldo/Entradas/Saídas/Dízimo + saúde finanças + pizza categoria + linha 6 meses + metas urgentes ≤30d + estoque em falta. Espelha `app/src/pages/Dashboard.tsx`. |
| **Finanças** | `/` (ou `/financas`) | `src/stores/finance.ts`, `src/schemas/finance.zod.ts`, `src/pages/Financas.tsx` | CRUD `description/amount/category/date/paymentDate/paymentStatus/isEnabled/isFavorited`. 15 cats + Todos. Filtros cascata tipo→busca→período→categoria→status→favoritos→sort Vencimento/Pagamento desc. Derivados `Incomings/Expenses/Total/Saldo/Tithe`. |
| **Relatórios** | `/reports` | `src/pages/Reports.tsx` | Mesmos filtros + ApexCharts. Mantido do legado. |
| **Mercado/Estoque** | `/stock` | `src/stores/market.ts`, `src/schemas/stock.zod.ts` | `description/category/amount/quantity/quantityDesired`. Stepper, badge Em estoque/Em falta, total `amount*quantity`. Gera `finances` Mercado + `lists`. |
| **Listas Compras** | `/lists`, `/lists/:id` | `src/stores/lists.ts`, `src/schemas/list.zod.ts` | 2 níveis: `lists` + `items(list_id FK lógica)`. CRUD 2 níveis, cascade delete manual, gerar a partir do estoque Todos/Só em falta. |
| **Corridas** | `/runs` | `src/stores/runs.ts`, `src/schemas/run.zod.ts` | `location/currentDistance/unityAmount/amount/type/date`. Cards Km Estimado `(autonomia*amount/unityAmount)+currentDistance`, Autonomia, Km Atual. Auto-lança em Finanças se `willAddFuelToTransactionList`. |
| **Metas** | `/goals` | `src/stores/goals.ts`, `src/schemas/goal.zod.ts` | `description/amount/currentAmount/date/icon/category`. Progress bar, `Restam X dias` ≤30d, filtros Todas/Ativas/Concluídas, deposit/withdraw. |
| **Dízimo** | `/tithe` | `src/pages/TitheSettings.tsx`, `src/stores/settings.ts` | `percent` 1-100 passo 0.5 default 10, base Ganhos/Investimentos, prefixo removível, histórico `tithe_payments`, `markAsPaid` cria saída `Dízimo - MM/AAAA`. |
| **IA (online)** | `/ia`, `/ai-providers` | `src/utils/aiProviders.ts`, `src/utils/prompt.ts`, `src/pages/IAPage.tsx` | Gate `isAiEnabled` + chave. 5 providers openai\|gemini\|anthropic\|openrouter\|zen, fallback order, `chatWithFallback`. Prompts injetam CSVs (80/30/60/30/20 rows), limite 1000 chars, hardening anti-injection, rate-limit 3/60s. Exige internet, banner offline. |
| **Config** | `/settings` | `src/stores/settings.ts`, `src/schemas/config.zod.ts` | Singleton 20 campos: tema, IA, cards, prefixo, simples finanças/mercado, auto-add combustível, veículo + autonomia, pasta (web: download), biometria (web: WebAuthn futuro, hoje só PIN/local). `clearAll` + export/import CSV seguro. |

Navegação: `src/App.tsx` BrowserRouter + `src/components/header.tsx` (Finanças/Relatórios/Estoque/Corridas/Metas/Listas/Dízimo/Config). `NotFound` em `*`.

## 2. Regras de Negócio (não violar sem RFC)

1. Totais: `Total = Σ entradas - Σ saídas`. `Tithe = 10%` (ou `tithePercent`) sobre entradas menos saídas com prefixo se `willUsePrefixToRemoveTihteSum`. Cards condicionais.
2. Filtros em cascata com `date-fns` (`isSameOrAfter/isSameOrBefore` equivalentes). Período default mês atual.
3. Favoritar inverte `isFavorited` bool (mobile usa 0/1, web usa bool — adaptar na borda import/export).
4. Datas como `number` timestamp + `+43200000` offset. Leitura `new Date(n).toLocaleDateString('pt-BR')`.
5. Moeda `toLocaleString('pt-BR',{style:'currency',currency:'BRL'})`.
6. Combustível auto-lançamento cria `Abastecimento - location` cat Transporte `isEnabled=true paymentStatus=true`.
7. Km estimado `(autonomia * amount / unityAmount) + currentDistance` do último registro.
8. Mercado gerar lista: Só em falta (`quantity < quantityDesired`) ou Todos. Recalcular totais.
9. Listas cascade delete apaga header + items.
10. IA dados via CSVs memoizados + `<<<DADOS_FINANCEIROS_JSON>>>12000` + `<<<PERGUNTA_USUARIO>>>`, cap 13000, resposta max 1000 chars.
11. Storage keys versionadas `mf-db-v1:*` (`mf-finance-v1`, `mf-runs-v1`, etc). `JSON.parse` sempre com try/catch + fallback `[]`.
12. CSV seguro: bloquear `=,+,-,@,HYPERLINK,WEBSERVICE,CMD,DDE,IMPORTXML,EXEC`, limite 5MB/5000 rows/20 cols.

## 3. Stack (fixa)

- `react@^18.3.1` (19 adiado p/ Task 8 do plano — peers de day-picker/Radix/apexcharts travam o bump), `vite@^6`, `@vitejs/plugin-react@^5`, `typescript@^5.6`, `tailwindcss@^3.4`, `shadcn` (new-york/zinc), `react-router-dom@^6`, `zustand@^5` + persist, `zod@^3.23`, `react-hook-form` + `@hookform/resolvers`, `idb-keyval`, `vite-plugin-pwa@^1`, `apexcharts@3.45.2` (pin exato) + `react-apexcharts@1.4.1` (pin exato), `papaparse@^5.4`, `date-fns@^3` (unificar p/ v4 na Task 7), `lucide-react`, `react-icons@5.0.1` (pin exato), `vitest@^2`.
- **Proibido:** `formik+yup` (legado, migrar), `dayjs` duplicado, `uuid` (usar `crypto.randomUUID()`), `tsc-silent --suppress`, `@vitejs/plugin-basic-ssl` em prod, Redux/ORM novo sem RFC.

## 4. Persistência & Schemas

- `src/schemas/*.zod.ts` espelham `app/src/schemas/*` + `app/src/db/schema.ts` (8 tabelas: finances, runs, goals, stock, lists, items, config, tithe_payments).
- `src/stores/*.ts` zustand + persist (localStorage primeiro, `idb-keyval` para blobs). UI consome stores, nunca `localStorage` direto.
- `src/lib/storage.ts` abstrai get/set com versionamento, validação zod, `storage` event + `BroadcastChannel('mf-sync')` para multi-aba.
- `src/utils/csv.ts` + `src/utils/excel.ts` para import/export seguro. Arquivos `nome-DD-MM-YYYY_HH-mm.csv`.
- Chaves IA em `finances_secure_ai_provider_*` (localStorage, com aviso — web não tem SecureStore). Modelos/order/active em `mf-ai-*` (chaves `ai_activeProvider`, `ai_fallbackOrder`, `ai_model_*`).

## 5. PWA Offline

- `vite.config.ts` `VitePWA({ registerType:'prompt', workbox:{ clientsClaim, skipWaiting, cleanupOutdatedCaches, navigateFallback:'index.html', runtimeCaching CacheFirst fonts/images }, manifest:{ id:'/', lang:'pt-BR', icons 192/512 maskable+any, shortcuts, screenshots } })`.
- `index.html` `lang="pt-BR"`, `apple-touch-icon 180`, `mobile-web-app-capable`, `theme-color #9333ea`.
- `src/components/ReloadPrompt.tsx` com `useRegisterSW` — obrigatório, usuário precisa ver update.
- Offline: tudo local funciona sem rede. IA mostra banner `Você está offline`.
- Icons obrigatórios em `public/`: `192.png`, `512.png`, `512-maskable.png`, `180-apple.png`.

## 6. Qualidade — TDD / Coverage / Gate

- Framework: `vitest` + `@testing-library/react` + `jsdom`. Estrutura `src/__tests__/*.test.ts` espelhando stores/schemas/utils.
- Regra: sem teste, sem merge. Ciclo: teste falhando → implementa → passa → commit.
- Gate: `branches 80% lines 80%` em `src/stores/**`, `src/schemas/**`, `src/utils/**`. `npm run test:coverage` no CI.
- CI `.github/workflows/web-ci.yml`: `lint (eslint --max-warnings 0)` → `typecheck (tsc -b)` → `test:coverage` → `build` → `audit high`. Nenhum step `continue-on-error`.
- Sem `console.log` prod, sem `TODO` sem ticket, sem `dangerouslySetInnerHTML`.

## 7. Workflow para Agentes

1. Leia este AGENTS.md + `ROADMAP_PARIDADE.md` + `docs/superpowers/plans/2026-10-13-web-paridade-total.md` antes de mudar.
2. Nova feature: teste falhando → schema → store → página → header/rota → docs.
3. Bug: teste reproduzindo → fix → schema/migration localStorage (bump `mf-db-v1` → `v2` com migrador).
4. Não altere regras §2 sem RFC. Não introduza backend sem aprovação (web é local-first).
5. Commits: `feat(web): ...`, `fix(web): ...`, `chore(web): bump ...`, `docs(web): ...`, `test(web): ...`.
6. Antes de PR: `npm run lint && npm run test:coverage && npm run build`.

## 8. Débitos / Roadmap

Ver `ROADMAP_PARIDADE.md` (8 fases: base → zustand+zod → storage → PWA → features → IA → forms → qualidade). Legado a remover: `src/context/*` (deprecar após stores), `formik/yup`, `dayjs`, `uuid`, `tsc-silent`.
