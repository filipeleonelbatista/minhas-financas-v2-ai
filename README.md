# Minhas Finanças v2 — AI

> Monorepo: app Expo offline-first + docs GitHub Pages (Jekyll SEO). Stack: Expo SDK 54 • RN 0.81 • React 19.1 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, sem Context) • ReacticX • Firebase (Fase 2).

## Estrutura

- `app/` — app Expo (ver `app/README.md`, `app/docs/DOSSIE.md`, `app/docs/ROADMAP.md`, `app/docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`)
- `docs/` — GitHub Pages (Jekyll + `jekyll-seo-tag` + `jekyll-sitemap`) → https://filipeleonelbatista.github.io/minhas-financas-v2-ai/

## GitHub Pages

Ativado em **Settings → Pages → Source: `main` / `docs`**. SEO via `_config.yml` (title, description, `jekyll-seo-tag`). Páginas: `/` , `/privacidade` , `/termos` , `/suporte` , `/faq`.

## Rodar local (Fase 1)

```bash
cd app
yarn && npx expo prebuild --clean && yarn android
```

## Docs

- Dossiê: `app/docs/DOSSIE.md`
- Roadmap: `app/docs/ROADMAP.md` (A' Managed → Zustand Standard 2026-08-29)
- Spec Fase 1: `app/docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plans: `app/docs/superpowers/plans/2026-08-28-fase1-offline-redesign.md` (11 tasks) + `2026-08-29-zustand-standard.md` (10 tasks, Zustand sem Context)
- Status: `docs/project-status.md` (Fase 1.1 em execução)
