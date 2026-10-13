<a href="https://github.com/filipeleonelbatista/minhas-financas-v2-ai/blob/main/README.md" target="_blank">
  <img src="https://raw.githubusercontent.com/filipeleonelbatista/filipeleonelbatista/master/assets/brasil_bandeira.png" width="28px" />
  Version in Brazilian Portuguese
</a>
</br>
</br>

# Minhas Finanças v2 — AI

> Monorepo: offline-first Expo app + web PWA in full parity + docs with static landing and APK. Stack: Expo SDK 57 • RN 0.86.3 • React 19 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, no Context) • strict TypeScript • Firebase (Phase 2).

> **Status 2026-10-13:** Phase 1 100% — `tsc` 0 errors, `eslint` 0 warnings, **35 suites / 191 tests PASS** (app). Release APK **v2.3.1 (231)** under `docs/app/`. Spotlight tour and dedicated Reports screen removed from scope — Dashboard (Home panel) is the official charts screen.

[Live site](https://minhasfinancas.vercel.app/) •
[Landing + APK](https://filipeleonelbatista.github.io/minhas-financas-v2-ai/) •
[App on Google Play](https://play.google.com/store/apps/details?id=com.finances)

# Index

- [About](#-about)
- [Objective](#objective)
- [Technologies](#technologies)
- [Structure](#structure)
- [Installation](#installation)
- [Build APK](#build-apk-eas)
- [GitHub Pages](#github-pages)
- [AI API](#ai-api)
- [Docs](#docs)

## 🔖&nbsp; About

App to manage my family's finances. With it I track account inflows and outflows, household product stock, and car mileage
to monitor fuel costs. The accounts section has an AI integration that generates analyses based on user-entered data.

This repo is the **v2** monorepo: `app/` (Expo mobile, offline source of truth) and `web/` (React + Vite PWA with full
offline parity) share the same business rules, and `docs/` publishes the static landing, help center, and APK.

[Website Link](https://minhasfinancas.vercel.app/)
[Landing Link](https://filipeleonelbatista.github.io/minhas-financas-v2-ai/)
[Google Play App Link](https://play.google.com/store/apps/details?id=com.finances)

## Objective

I created this app to help my family better manage personal finances. Based on Rocketseat's DevFinances, I used the
acquired knowledge to develop and expand my skills with AI and Tailwind among other technologies used. I had a total of
100 downloads on the Google Play store and around 10 monthly users.
The project is still in development to be monetized. This is the final version for my portfolio.

I talk more about it [IN THIS POST](https://www.linkedin.com/posts/filipeleonelbatista_ia-ai-inteligenciaartificial-activity-7085289369468571648-43Bp?utm_source=share&utm_medium=member_desktop) on my LinkedIn.

In v2 the technical goal is full offline-first parity between mobile and web, with multi-provider AI as the only online part.

---
## Technologies

This project was developed with the following main technologies:

**Mobile app (`app/`)**

- [Expo SDK 57](https://expo.dev/) + [React Native 0.86.3](https://reactnative.dev/) + [React 19.2](https://react.dev/)
- [NativeWind 4.1](https://www.nativewind.dev/) + [TailwindCSS 3.4](https://tailwindcss.com/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [drizzle-orm](https://orm.drizzle.team/) + [drizzle-zod](https://orm.drizzle.team/docs/zod)
- [Zustand 5](https://zustand-demo.pmnd.rs/) (stores, no Context) + [Zod 3.23](https://zod.dev/)
- [TypeScript 5.8 strict](https://www.typescriptlang.org/) + [Jest 29](https://jestjs.io/) (35 suites / 191 tests)

**Web PWA (`web/`)**

- [React 18.3](https://react.dev/) + [Vite 6](https://vitejs.dev/) + [TypeScript 5.6](https://www.typescriptlang.org/)
- [TailwindCSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand 5](https://zustand-demo.pmnd.rs/) + persist (parity with the mobile app)
- [Zod 3.23](https://zod.dev/) (schemas mirroring `app/src/schemas/*`) + [React Hook Form](https://react-hook-form.com/)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB with localStorage fallback)
- [vite-plugin-pwa 1.x](https://vite-pwa-org.netlify.app/) (installable offline PWA)
- [Apex Charts](https://apexcharts.com/docs/installation/) + [date-fns](https://date-fns.org/) + [Papaparse](https://www.papaparse.com/) + [Vitest](https://vitest.dev/)

**Docs / Distribution (`docs/`)**

- GitHub Pages (landing `index.html` with Tailwind CDN + dark mode, `faq.html`, `ler.html`, `termos.html`, `privacidade.html`)
- EAS Build (`preview` APK) + Vercel (web)

Legacy under migration on web: `formik+yup`, `dayjs`, `uuid` → `crypto.randomUUID()`, `Context` → zustand stores. See `web/AGENTS.md` and `web/ROADMAP_PARIDADE.md`.

## Structure

- `app/` — offline-first Expo app (see `app/README.md`, `app/AGENTS.md`)
- `web/` — React + Vite PWA with full offline parity (see `web/AGENTS.md`, `web/ROADMAP_PARIDADE.md`) → https://minhasfinancas.vercel.app
- `docs/` — GitHub Pages → https://filipeleonelbatista.github.io/minhas-financas-v2-ai/
  - `index.html` — landing (Tailwind CDN, dark mode, APK download + use online)
  - `faq.html` — help center with docs search • `ler.html` — markdown viewer
  - `termos.html`, `privacidade.html` — legal pages used by app and web
  - `app/financas-2.3.1-231.apk` — release APK (EAS `preview` profile)
  - `documentacao/` — Dossier, Roadmap, project-status and specs/plans (consolidated from `app/docs/`)
  - `suporte.md`, `_config.yml` — Jekyll for the remaining pages

## Installation

The project runs with [Node.js](https://nodejs.org/) v20+.

Instructions to install dependencies and start the project.

### App (Expo)

```sh
cd app
npm install --legacy-peer-deps   # repo uses yarn.lock; npm needs the flag (peer react 18 x 19)
npx expo start                   # Metro (Expo Go has limitations — see app/README.md)
npx expo run:android             # native build + emulator (requires JDK 17)
```

### Web (PWA)

```sh
cd web
npm install
npm run dev                      # PWA at http://localhost:5173
```

## Build APK (EAS)

```bash
cd app
npx eas-cli build -p android --profile preview --non-interactive
# download the artifact to docs/app/financas-<version>-<code>.apk (local, git-ignored)
```

- Build v2.3.1 (231): https://expo.dev/accounts/filipeleonelbatista/projects/finances/builds/527529a2-f23f-418b-bb84-447ddb3651ec (artifact valid until 2026-11-12)
- The APK (~150 MB) **is not committed to git** (GitHub limit is 100 MB; LFS would break the Pages download). For a permanent link, attach the APK to a **GitHub Release** `v2.3.1` and point the download links (landing + web footer) to the release URL.

## GitHub Pages

Enabled at **Settings → Pages → Source: `main` / `docs`**. Pages: `/` (landing), `/faq.html` (help center), `/ler.html` (docs viewer), `/termos.html`, `/privacidade.html`, `/suporte`.

## AI API

Inside the mobile app you need your API key under Settings to enable the artificial intelligence button. On web (`/ai-providers`) 5 providers are supported (openai/gemini/anthropic/openrouter/zen) — AI is the only online part and requires internet.

## Docs

- Dossier: `docs/documentacao/DOSSIE.md`
- Roadmap: `docs/documentacao/ROADMAP.md`
- Phase 1 spec: `docs/documentacao/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plans: `docs/documentacao/superpowers/plans/`
- Status: `docs/documentacao/project-status.md` (canonical source)

---

<h3 align="center">Let's connect 😉</h3>
<p align="center">
  <a href="https://www.linkedin.com/in/filipeleonelbatista/">
    <img alt="LinkedIn" width="22px" src="https://github.com/filipeleonelbatista/filipeleonelbatista/blob/master/assets/052-linkedin.svg" />
  </a>&ensp;
  <a href="mailto:filipe.x2016@gmail.com">
    <img alt="Email" width="22px" src="https://github.com/filipeleonelbatista/filipeleonelbatista/blob/master/assets/gmail.svg" />
  </a>&ensp;
  <a href="https://instagram.com/filipeleonelbatista">
    <img alt="Instagram" width="22px" src="https://github.com/filipeleonelbatista/filipeleonelbatista/blob/master/assets/044-instagram.svg" />
  </a>
</p>
<br />
<p align="center">
    Developed with 💜 by Filipe Batista
</p>
