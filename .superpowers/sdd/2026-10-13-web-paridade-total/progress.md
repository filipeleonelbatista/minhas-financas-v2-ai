# SDD ledger — plan: docs/superpowers/plans/2026-10-13-web-paridade-total.md

Ruling: trabalhar no checkout atual (main, dirty) sem worktree/branch — usuário escolheu "aqui mesmo"; commits serão scoped (`git add web/...` + docs) para não arrastar mudanças não relacionadas do `app/`. Custo se errado: commits misturados; mitigado por adds com path explícito.

Pre-flight: interfaces encadeadas Task2→(3,5,6,7) via `schemas/*` + `stores/*` + `lib/storage.ts`. Nomes conferem com o plano (finance/run/stock/list/goal/config). Task4 (PWA) e Task1 (base) independentes. Sem conflitos; ordem do plano mantida.

Task 1: Ruling: manter `react@^18` (bump patch → `^18.3.1`) e adiar React 19 para nova Task 8 — por quê: React 19 quebra peers de `react-day-picker@8`, Radix `1.0/2.0` e `react-apexcharts@1.4` (todos com peer `react ^16||^17||^18`), o que transformaria a Task 1 num yak-shave de migração de UI antes de qualquer valor de paridade; zustand 5/zod/PWA 1.x funcionam no React 18. Task 1 sobe só toolchain compatível: `vite 5→6`, `plugin-react 4→5`, `ts 5.2→5.6`, `pwa 0.19→1.x` + deps novas (vitest, zustand, zod, idb-keyval, RHF). AGENTS §3 e ROADMAP Fase 0 serão ajustados ao final da Task 1. Custo se errado: React 19 adiado; mitigado por Task 8 explícita.

- [x] Task 1: Modernizar base Vite/React/TS/Lint
- [x] Task 2: zustand + zod paridade

Task 2: complete (base 9f673c5, tests: `npx vitest run src/__tests__/stores-parity.test.ts src/__tests__/smoke.test.ts` → 13/13 pass)
Task 2: Ruling: teste literal do plano (`toThrow` p/ amount "abc") trocado por teste fiel ao mobile (sanitize → 0, sem throw) — plano testava comportamento que o mobile não tem; paridade manda. Custo se errado: divergência mobile; mitigado pelos demais asserts.
Task 2: note: adicionados `vitest.config.ts` (alias @ p/ vitest), `lib/goals.ts` + `lib/finance.ts` (puros portados de repositories/*) além dos Files do plano; flags finança boolean (AGENTS §2 r3); `filteredList/filteredGoals` eager em vez do patch de getState do mobile (evita loop de selector no React).
- [ ] Task 3: Storage offline robusto
- [ ] Task 4: PWA total
- [ ] Task 5: Features (Dashboard, Metas, Listas, Dízimo)
- [ ] Task 6: IA online
- [ ] Task 7: Forms RHF+zod + limpeza
