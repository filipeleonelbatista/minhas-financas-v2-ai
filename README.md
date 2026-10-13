# Minhas Finanças v2 — AI

> Monorepo: app Expo offline-first + web PWA (paridade) + docs com landing estática e APK. Stack: Expo SDK 57 • RN 0.86.3 • React 19.2 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, sem Context) • TypeScript strict • Firebase (Fase 2).

> **Status 2026-10-13:** Fase 1 100% — `tsc` 0 errors, `eslint` 0 warnings, **35 suites / 191 testes PASS** (app). APK release **v2.3.1 (231)** em `docs/app/`. Tour spotlight e tela Reports dedicada removidos de escopo — Dashboard (painel Início) é a tela oficial de gráficos.

## Estrutura

- `app/` — app Expo (ver `app/README.md`, `app/AGENTS.md`)
- `web/` — PWA React + Vite com paridade total offline (ver `web/AGENTS.md`, `web/ROADMAP_PARIDADE.md`) → https://minhasfinancas.vercel.app
- `docs/` — GitHub Pages → https://filipeleonelbatista.github.io/minhas-financas-v2-ai/
  - `index.html` — landing (Tailwind CDN, dark mode, download APK + usar online)
  - `faq.html` — central de ajuda com busca nas documentações • `ler.html` — visualizador de markdown
  - `termos.html`, `privacidade.html` — páginas legais usadas pelo app e pelo web
  - `app/financas-2.3.1-231.apk` — APK release (profile EAS `preview`)
  - `documentacao/` — Dossiê, Roadmap, project-status e specs/plans (consolidados de `app/docs/`)
  - `suporte.md`, `faq` (via `faq.html`), `_config.yml` — Jekyll para as páginas restantes

## GitHub Pages

Ativado em **Settings → Pages → Source: `main` / `docs`**. Páginas: `/` (landing), `/faq.html` (central de ajuda), `/ler.html` (visualizador de docs), `/termos.html`, `/privacidade.html`, `/suporte`.

## Rodar local

```bash
cd app
npm install --legacy-peer-deps   # repo usa yarn.lock; npm precisa da flag (peer react 18 x 19)
npx expo start                   # Metro (Expo Go tem limitações — ver app/README.md)
npx expo run:android             # build nativo + emulador (requer JDK 17)
```

```bash
cd web
npm install && npm run dev      # PWA em http://localhost:5173
```

## Gerar APK (EAS)

```bash
cd app
npx eas-cli build -p android --profile preview --non-interactive
# baixar o artefato para docs/app/financas-<versao>-<code>.apk (local, ignorado no git)
```

- Build v2.3.1 (231): https://expo.dev/accounts/filipeleonelbatista/projects/finances/builds/527529a2-f23f-418b-bb84-447ddb3651ec (artefato válido até 2026-11-12)
- O APK (~150 MB) **não vai para o git** (limite do GitHub é 100 MB; LFS quebraria o download no Pages). Para link permanente, anexe o APK em uma **GitHub Release** `v2.3.1` e troque os links de download (landing + footer web) pela URL do release.

## Docs

- Dossiê: `docs/documentacao/DOSSIE.md`
- Roadmap: `docs/documentacao/ROADMAP.md` (A' Managed → Zustand Standard)
- Spec Fase 1: `docs/documentacao/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plans: `docs/documentacao/superpowers/plans/` (offline-redesign, zustand-standard, fase1-gaps, nebula-borderbeam, ts-migration)
- Status: `docs/documentacao/project-status.md` (fonte canônica)
