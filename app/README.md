<a href="https://github.com/filipeleonelbatista/minhas-financas-v2-ai/blob/main/app/README_EN.md" target="_blank">
  <img src="https://raw.githubusercontent.com/filipeleonelbatista/filipeleonelbatista/master/assets/usa_flag.png" width="28px" />
  Version in English
</a>
</br>
</br>

<img width="100%" src="../web/public/banner.png">

# Minhas Finanças — App Mobile (Expo)

> App Expo offline-first, fonte da verdade do monorepo. Stack: Expo SDK 57 • RN 0.86.3 • React 19.2 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, sem Context) • TypeScript strict.

> **Status 2026-10-13:** Fase 1 100% — `tsc` 0 errors, `eslint` 0 warnings, **35 suites / 191 testes PASS**. Versão **2.3.1 (versionCode 231)** em `app.json`. Tour spotlight e tela Reports dedicada removidos de escopo — Dashboard (painel Início) é a tela oficial de gráficos.

[Site online](https://minhasfinancas.vercel.app/)
[Link do Aplicativo na Google Play](https://play.google.com/store/apps/details?id=com.finances)

# Indice

- [Sobre](#-sobre)
- [Objetivo](#objetivo)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [API da OpenAI](#api-da-openai)
- [Estrutura e Scripts](#estrutura-e-scripts)
- [Docs](#docs)

## 🔖&nbsp; Sobre

Aplicativo para gerenciar as finanças da minha família. Com este app eu gerencio entradas e saídas das contas, controle de
estoque de produtos da casa e hodômetro do carro para acompanhar os custos de abastecimento. Na parte das contas tem uma
integração com a OpenAI para gerar análises baseadas nos dados inseridos pelo usuário.

Este é o app mobile do monorepo [Minhas Finanças v2 — AI](../README.md): 7 domínios offline — Dashboard Início, Finanças,
Mercado/Estoque, Listas 2 níveis, Corridas, Metas, Dízimo JFA e Config. O `web/` replica estas mesmas regras em PWA.

[Link do Site](https://minhasfinancas.vercel.app/)
[Link do Aplicativo na Google Play](https://play.google.com/store/apps/details?id=com.finances)

## Objetivo

Criei este app para ajudar minha família a gerenciar melhor as finanças pessoais. Baseado no DevFinances da Rocketseat usei os
conhecimentos adquiridos para desenvolver e ampliar meus conhecimentos com IA e Tailwind entre outras tecnologias usadas.
Tive um total de 100 Downloads na loja da Google Play e algo em torno de 10 usuários mensais.
O projeto segue em desenvolvimento para poder monetizar ele. Esta versão final para portfólio.

Falo mais [NESTE POST](https://www.linkedin.com/posts/filipeleonelbatista_ia-ai-inteligenciaartificial-activity-7085289369468571648-43Bp?utm_source=share&utm_medium=member_desktop) do meu LinkedIn.

---
## Tecnologias

Esse projeto foi desenvolvido com as seguintes principais tecnologias:

- [Expo SDK 57](https://expo.dev/) + [React Native 0.86.3](https://reactnative.dev/) + [React 19.2](https://react.dev/)
- [TypeScript 5.8 strict](https://www.typescriptlang.org/)
- [NativeWind 4.1](https://www.nativewind.dev/) + [TailwindCSS 3.4](https://tailwindcss.com/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [drizzle-orm](https://orm.drizzle.team/) + [drizzle-zod](https://orm.drizzle.team/docs/zod)
- [Zustand 5](https://zustand-demo.pmnd.rs/) (stores, sem Context)
- [Zod 3.23](https://zod.dev/) (`src/schemas/*`)
- [openai ^4.28.0](https://github.com/openai/openai-node) (via `src/utils/aiProviders.ts`, com fallbacks Gemini vivos)
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) + [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/documentpicker/) + [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) + [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) (SAF, CSV, chave IA, biometria)
- [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit) + [react-native-svg](https://github.com/software-mansion/react-native-svg) (gráficos do Dashboard)
- [Jest 29](https://jestjs.io/) + [Testing Library](https://testing-library.com/) (35 suites / 191 testes)
- [date-fns](https://date-fns.org/) (única lib de data na Fase 1; `dayjs` legado em remoção)

Regras de negócio (não violar sem RFC — ver `AGENTS.md` §2): `Total = entradas - saídas`, Dízimo 10% com prefixo, filtros em cascata, datas como timestamp + offset 12h, moeda `pt-BR BRL`, auto-lançamento de combustível, cascade delete de listas.

---
## Instalação

O projeto roda com [Node.js](https://nodejs.org/) v20+.

Instruções para instalar as dependências e iniciar o projeto.

### Mobile

```sh
cd app
npm install --legacy-peer-deps   # repo usa yarn.lock; npm precisa da flag (peer react 18 x 19)
npx expo prebuild --clean        # sincroniza android/ com app.json + plugins
npx expo run:android             # build nativo + emulador (requer JDK 17)
```

Alternativas:

```sh
npx expo start                   # Metro (Expo Go tem limitações: expo-sqlite/secure-store exigem dev-client)
yarn android                     # = expo run:android
yarn ios                         # = expo run:ios (requer Xcode 15+)
yarn build:apk                   # eas build -p android --profile preview (APK)
yarn build:store                 # eas build -p android --profile production (AAB)
```

> ⚠️ **Não use Expo Go.** `expo-sqlite`/`expo-secure-store` exigem código nativo → só via `dev-client` / `expo run:*`.
> **Primeiro run:** o Onboarding pede a **pasta de exportação** (SAF). Sem ela, Exportar/Importar CSV falha.

### Web (paridade)

Precisa acessar a pasta `web/` do monorepo ([ver README](../web/README.md)):

```sh
cd web
npm install
npm run dev
```

## API da OpenAI

Dentro do aplicativo mobile você precisará ter sua chave da API para colocar em Configurações e habilitar o botão da inteligência artificial.

Detalhes: chave digitada em `Configurações → Habilitar IA (Beta)` (`src/utils/aiProviders.ts`), validada e armazenada com `expo-secure-store`. Sem créditos, o app exibe `Não foi possível fazer a pesquisa`.

## Estrutura e Scripts

```
App.tsx → providers → rotas (Stack + bottom-tabs + market-stack) → pages/* → stores/* → repositories/* → db/schema.ts
src/db/ (expo-sqlite + drizzle, 8 tabelas + migrações via PRAGMA user_version)
src/schemas/* (zod) • src/stores/* (zustand) • src/repositories/* (prepared statements)
__tests__/ (unit/integration/security) • scripts/seed.ts
```

| Script | Comando | Descrição |
|---|---|---|
| `android` | `expo run:android` | Build + run nativo |
| `ios` | `expo run:ios` | Build + run iOS |
| `build:apk` | `eas build -p android --profile preview` | APK remoto |
| `build:store` | `eas build -p android --profile production` | AAB remoto |
| `lint` | `eslint --max-warnings 0` | Lint sem warnings |
| `typecheck` | `tsc --noEmit` | Typecheck strict |
| `test` / `test:coverage` | `jest` | Testes + coverage |
| `test:security` | `jest __tests__/security` | XSS/SQL/prompt/Excel |

## Docs

- Guia de agentes: `AGENTS.md` (regras, SOLID/TDD, quality gate `test:security`)
- Dossiê: `../docs/documentacao/DOSSIE.md` • Roadmap: `../docs/documentacao/ROADMAP.md`
- Status canônico: `../docs/documentacao/project-status.md`

---

<h3 align="center" >Vamos nos conectar 😉</h3>
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
    Desenvolvido 💜 por Filipe Batista
</p>
