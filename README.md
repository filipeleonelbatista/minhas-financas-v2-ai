# Minhas Finanças v2 — AI

> Monorepo: app Expo offline-first + docs GitHub Pages (Jekyll SEO). Stack: Expo SDK 54 • RN 0.81 • React 19.1 • NativeWind 4.1 • expo-sqlite + drizzle-orm • ReacticX • Firebase (Fase 2).

## Estrutura

- `finances-app-feature-adicionando-watermelondb/` — app (ver seu `README.md`, `docs/DOSSIE.md`, `docs/ROADMAP.md`, `docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`)
- `docs/` — GitHub Pages (Jekyll + `jekyll-seo-tag` + `jekyll-sitemap`) → https://filipeleonelbatista.github.io/minhas-financas-v2-ai/

## GitHub Pages

Ativado em **Settings → Pages → Source: `main` / `docs`**. SEO via `_config.yml` (title, description, `jekyll-seo-tag`). Páginas: `/` , `/privacidade` , `/termos` , `/suporte` , `/faq`.

## Rodar local (Fase 1)

```bash
cd finances-app-feature-adicionando-watermelondb
yarn && npx expo prebuild --clean && yarn android
```

## Docs

- Dossiê: `finances-app-feature-adicionando-watermelondb/docs/DOSSIE.md`
- Roadmap: `finances-app-feature-adicionando-watermelondb/docs/ROADMAP.md` (A' Managed, 13 decisões, hardening Excel/prompt)
- Spec Fase 1: `finances-app-feature-adicionando-watermelondb/docs/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
