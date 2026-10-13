<a href="https://github.com/filipeleonelbatista/minhas-financas-v2-ai/blob/main/app/README.md" target="_blank">
  <img src="https://raw.githubusercontent.com/filipeleonelbatista/filipeleonelbatista/master/assets/brasil_bandeira.png" width="28px" />
  Version in Brazilian Portuguese
</a>
</br>
</br>

<img width="100%" src="../web/public/banner.png">

# Minhas Finanças — Mobile App (Expo)

> Offline-first Expo app, source of truth of the monorepo. Stack: Expo SDK 57 • RN 0.86.3 • React 19.2 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, no Context) • strict TypeScript.

> **Status 2026-10-13:** Phase 1 100% — `tsc` 0 errors, `eslint` 0 warnings, **35 suites / 191 tests PASS**. Version **2.3.1 (versionCode 231)** in `app.json`. Spotlight tour and dedicated Reports screen removed from scope — Dashboard (Home panel) is the official charts screen.

[Live site](https://minhasfinancas.vercel.app/)
[Google Play App Link](https://play.google.com/store/apps/details?id=com.finances)

# Index

- [About](#-about)
- [Objective](#objective)
- [Technologies](#technologies)
- [Installation](#installation)
- [OpenAI API](#openai-api)
- [Structure and Scripts](#structure-and-scripts)
- [Docs](#docs)

## 🔖&nbsp; About

Application to manage my family's finances. With this app, I manage account inflows and outflows, control household product
inventory, and track car mileage to monitor fuel costs. For accounts, there's an integration with OpenAI to generate analyses
based on user-entered data.

This is the mobile app of the [Minhas Finanças v2 — AI](../README_EN.md) monorepo: 7 offline domains — Home Dashboard, Finances,
Market/Stock, 2-level Lists, Runs, Goals, JFA Tithe, and Settings. `web/` replicates the same rules as a PWA.

[Website Link](https://minhasfinancas.vercel.app/)
[Google Play App Link](https://play.google.com/store/apps/details?id=com.finances)

## Objective

I created this app to help my family better manage personal finances. Based on Rocketseat's DevFinances, I used the acquired
knowledge to develop and expand my skills with AI and Tailwind among other technologies used. I had a total of 100 downloads
on the Google Play store and around 10 monthly users.
The project is still in development to be monetized. This is the final version for my portfolio.

I talk more about it [IN THIS POST](https://www.linkedin.com/posts/filipeleonelbatista_ia-ai-inteligenciaartificial-activity-7085289369468571648-43Bp?utm_source=share&utm_medium=member_desktop) on my LinkedIn.

---
## Technologies

This project was developed with the following main technologies:

- [Expo SDK 57](https://expo.dev/) + [React Native 0.86.3](https://reactnative.dev/) + [React 19.2](https://react.dev/)
- [TypeScript 5.8 strict](https://www.typescriptlang.org/)
- [NativeWind 4.1](https://www.nativewind.dev/) + [TailwindCSS 3.4](https://tailwindcss.com/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [drizzle-orm](https://orm.drizzle.team/) + [drizzle-zod](https://orm.drizzle.team/docs/zod)
- [Zustand 5](https://zustand-demo.pmnd.rs/) (stores, no Context)
- [Zod 3.23](https://zod.dev/) (`src/schemas/*`)
- [openai ^4.28.0](https://github.com/openai/openai-node) (via `src/utils/aiProviders.ts`, with live Gemini fallbacks)
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) + [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/documentpicker/) + [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) + [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) (SAF, CSV, AI key, biometrics)
- [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit) + [react-native-svg](https://github.com/software-mansion/react-native-svg) (Dashboard charts)
- [Jest 29](https://jestjs.io/) + [Testing Library](https://testing-library.com/) (35 suites / 191 tests)
- [date-fns](https://date-fns.org/) (single date lib in Phase 1; legacy `dayjs` being removed)

Business rules (do not violate without RFC — see `AGENTS.md` §2): `Total = inflows - outflows`, 10% tithe with prefix, cascade filters, dates as timestamp + 12h offset, `pt-BR BRL` currency, fuel auto-posting, lists cascade delete.

---
## Installation

The project runs with [Node.js](https://nodejs.org/) v20+.

Instructions to install dependencies and start the project.

### Mobile

```sh
cd app
npm install --legacy-peer-deps   # repo uses yarn.lock; npm needs the flag (peer react 18 x 19)
npx expo prebuild --clean        # sync android/ with app.json + plugins
npx expo run:android             # native build + emulator (requires JDK 17)
```

Alternatives:

```sh
npx expo start                   # Metro (Expo Go has limitations: expo-sqlite/secure-store require dev-client)
yarn android                     # = expo run:android
yarn ios                         # = expo run:ios (requires Xcode 15+)
yarn build:apk                   # eas build -p android --profile preview (APK)
yarn build:store                 # eas build -p android --profile production (AAB)
```

> ⚠️ **Do not use Expo Go.** `expo-sqlite`/`expo-secure-store` require native code → only via `dev-client` / `expo run:*`.
> **First run:** Onboarding asks for the **export folder** (SAF). Without it, CSV export/import fails.

### Web (parity)

See the monorepo `web/` folder ([README](../web/README.md)):

```sh
cd web
npm install
npm run dev
```

## OpenAI API

Within the mobile app, you will need your API key to enter in Settings to enable the artificial intelligence button.

Details: key entered under `Settings → Enable AI (Beta)` (`src/utils/aiProviders.ts`), validated and stored with `expo-secure-store`. Without credits, the app shows `Não foi possível fazer a pesquisa`.

## Structure and Scripts

```
App.tsx → providers → routes (Stack + bottom-tabs + market-stack) → pages/* → stores/* → repositories/* → db/schema.ts
src/db/ (expo-sqlite + drizzle, 8 tables + migrations via PRAGMA user_version)
src/schemas/* (zod) • src/stores/* (zustand) • src/repositories/* (prepared statements)
__tests__/ (unit/integration/security) • scripts/seed.ts
```

| Script | Command | Description |
|---|---|---|
| `android` | `expo run:android` | Native build + run |
| `ios` | `expo run:ios` | iOS build + run |
| `build:apk` | `eas build -p android --profile preview` | Remote APK |
| `build:store` | `eas build -p android --profile production` | Remote AAB |
| `lint` | `eslint --max-warnings 0` | Zero-warning lint |
| `typecheck` | `tsc --noEmit` | Strict typecheck |
| `test` / `test:coverage` | `jest` | Tests + coverage |
| `test:security` | `jest __tests__/security` | XSS/SQL/prompt/Excel |

## Docs

- Agent guide: `AGENTS.md` (rules, SOLID/TDD, `test:security` quality gate)
- Dossier: `../docs/documentacao/DOSSIE.md` • Roadmap: `../docs/documentacao/ROADMAP.md`
- Canonical status: `../docs/documentacao/project-status.md`

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
