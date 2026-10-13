<a href="https://github.com/filipeleonelbatista/minhas-financas-v2-ai/blob/main/README_EN.md" target="_blank">
  <img src="https://raw.githubusercontent.com/filipeleonelbatista/filipeleonelbatista/master/assets/usa_flag.png" width="28px" />
  Version in English
</a>
</br>
</br>

<img width="100%" src="web/public/banner.png">

# Minhas Finanças v2 — AI

> Monorepo: app Expo offline-first + web PWA em paridade total + docs com landing estática e APK. Stack: Expo SDK 57 • RN 0.86.3 • React 19 • NativeWind 4.1 • expo-sqlite + drizzle-orm • Zustand 5 (stores, sem Context) • TypeScript strict • Firebase (Fase 2).

> **Status 2026-10-13:** Fase 1 100% — `tsc` 0 errors, `eslint` 0 warnings, **35 suites / 191 testes PASS** (app). APK release **v2.3.1 (231)** em `docs/app/`. Tour spotlight e tela Reports dedicada removidos de escopo — Dashboard (painel Início) é a tela oficial de gráficos.

[Site online](https://minhasfinancas.vercel.app/) •
[Landing + APK](https://filipeleonelbatista.github.io/minhas-financas-v2-ai/) •
[App na Google Play](https://play.google.com/store/apps/details?id=com.finances)

# Indice

- [Sobre](#-sobre)
- [Objetivo](#objetivo)
- [Tecnologias](#tecnologias)
- [Estrutura](#estrutura)
- [Instalação](#instalação)
- [Gerar APK](#gerar-apk-eas)
- [GitHub Pages](#github-pages)
- [API de IA](#api-de-ia)
- [Docs](#docs)

## 🔖&nbsp; Sobre

Aplicativo para gerenciar as finanças da minha família. Com ele eu gerencio entradas e saídas das contas, controle de
estoque de produtos da casa e hodômetro do carro para acompanhar os custos de abastecimento. Na parte das contas tem uma
integração com IA para gerar análises baseadas nos dados inseridos pelo usuário.

Este repositório é o monorepo da **v2**: o `app/` (Expo mobile, fonte da verdade offline) e o `web/` (PWA React + Vite com
paridade total offline) compartilham as mesmas regras de negócio, e o `docs/` publica a landing estática, a central de
ajuda e o APK.

[Link do Site](https://minhasfinancas.vercel.app/)
[Link da Landing](https://filipeleonelbatista.github.io/minhas-financas-v2-ai/)
[Link do Aplicativo na Google Play](https://play.google.com/store/apps/details?id=com.finances)

## Objetivo

Criei este app para ajudar minha família a gerenciar melhor as finanças pessoais. Baseado no DevFinances da Rocketseat usei os
conhecimentos adquiridos para desenvolver e ampliar meus conhecimentos com IA e Tailwind entre outras tecnologias usadas.
Tive um total de 100 Downloads na loja da Google Play e algo em torno de 10 usuários mensais.
O projeto segue em desenvolvimento para poder monetizar ele. Esta versão final para portfólio.

Falo mais [NESTE POST](https://www.linkedin.com/posts/filipeleonelbatista_ia-ai-inteligenciaartificial-activity-7085289369468571648-43Bp?utm_source=share&utm_medium=member_desktop) do meu LinkedIn.

Na v2 o objetivo técnico é paridade total offline-first entre mobile e web, com IA multi-provider como única parte online.

---
## Tecnologias

Esse projeto foi desenvolvido com as seguintes principais tecnologias:

**App mobile (`app/`)**

- [Expo SDK 57](https://expo.dev/) + [React Native 0.86.3](https://reactnative.dev/) + [React 19.2](https://react.dev/)
- [NativeWind 4.1](https://www.nativewind.dev/) + [TailwindCSS 3.4](https://tailwindcss.com/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [drizzle-orm](https://orm.drizzle.team/) + [drizzle-zod](https://orm.drizzle.team/docs/zod)
- [Zustand 5](https://zustand-demo.pmnd.rs/) (stores, sem Context) + [Zod 3.23](https://zod.dev/)
- [TypeScript 5.8 strict](https://www.typescriptlang.org/) + [Jest 29](https://jestjs.io/) (35 suites / 191 testes)

**Web PWA (`web/`)**

- [React 18.3](https://react.dev/) + [Vite 6](https://vitejs.dev/) + [TypeScript 5.6](https://www.typescriptlang.org/)
- [TailwindCSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand 5](https://zustand-demo.pmnd.rs/) + persist (paridade com o app mobile)
- [Zod 3.23](https://zod.dev/) (schemas espelhando `app/src/schemas/*`) + [React Hook Form](https://react-hook-form.com/)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB com fallback localStorage)
- [vite-plugin-pwa 1.x](https://vite-pwa-org.netlify.app/) (PWA instalável + offline)
- [Apex Charts](https://apexcharts.com/docs/installation/) + [date-fns](https://date-fns.org/) + [Papaparse](https://www.papaparse.com/) + [Vitest](https://vitest.dev/)

**Docs / Distribuição (`docs/`)**

- GitHub Pages (landing `index.html` com Tailwind CDN + dark mode, `faq.html`, `ler.html`, `termos.html`, `privacidade.html`)
- EAS Build (`preview` APK) + Vercel (web)

Legado em migração no web: `formik+yup`, `dayjs`, `uuid` → `crypto.randomUUID()`, `Context` → stores zustand. Ver `web/AGENTS.md` e `web/ROADMAP_PARIDADE.md`.

## Estrutura

- `app/` — app Expo offline-first (ver `app/README.md`, `app/AGENTS.md`)
- `web/` — PWA React + Vite com paridade total offline (ver `web/AGENTS.md`, `web/ROADMAP_PARIDADE.md`) → https://minhasfinancas.vercel.app
- `docs/` — GitHub Pages → https://filipeleonelbatista.github.io/minhas-financas-v2-ai/
  - `index.html` — landing (Tailwind CDN, dark mode, download APK + usar online)
  - `faq.html` — central de ajuda com busca nas documentações • `ler.html` — visualizador de markdown
  - `termos.html`, `privacidade.html` — páginas legais usadas pelo app e pelo web
  - `app/financas-2.3.1-231.apk` — APK release (profile EAS `preview`)
  - `documentacao/` — Dossiê, Roadmap, project-status e specs/plans (consolidados de `app/docs/`)
  - `suporte.md`, `_config.yml` — Jekyll para as páginas restantes

## Instalação

O projeto roda com [Node.js](https://nodejs.org/) v20+.

Instruções para instalar as dependências e iniciar o projeto.

### App (Expo)

```sh
cd app
npm install --legacy-peer-deps   # repo usa yarn.lock; npm precisa da flag (peer react 18 x 19)
npx expo start                   # Metro (Expo Go tem limitações — ver app/README.md)
npx expo run:android             # build nativo + emulador (requer JDK 17)
```

### Web (PWA)

```sh
cd web
npm install
npm run dev                      # PWA em http://localhost:5173
```

## Gerar APK (EAS)

```bash
cd app
npx eas-cli build -p android --profile preview --non-interactive
# baixar o artefato para docs/app/financas-<versao>-<code>.apk (local, ignorado no git)
```

- Build v2.3.1 (231): https://expo.dev/accounts/filipeleonelbatista/projects/finances/builds/527529a2-f23f-418b-bb84-447ddb3651ec (artefato válido até 2026-11-12)
- O APK (~150 MB) **não vai para o git** (limite do GitHub é 100 MB; LFS quebraria o download no Pages). Para link permanente, anexe o APK em uma **GitHub Release** `v2.3.1` e troque os links de download (landing + footer web) pela URL do release.

## GitHub Pages

Ativado em **Settings → Pages → Source: `main` / `docs`**. Páginas: `/` (landing), `/faq.html` (central de ajuda), `/ler.html` (visualizador de docs), `/termos.html`, `/privacidade.html`, `/suporte`.

## API de IA

Dentro do aplicativo mobile você precisará ter sua chave de API para colocar em Configurações e habilitar o botão da inteligência artificial. No web (`/ai-providers`) são 5 providers suportados (openai/gemini/anthropic/openrouter/zen) — a IA é a única parte online e exige internet.

## Docs

- Dossiê: `docs/documentacao/DOSSIE.md`
- Roadmap: `docs/documentacao/ROADMAP.md`
- Spec Fase 1: `docs/documentacao/superpowers/specs/2026-08-28-fase1-redesign-offline-design.md`
- Plans: `docs/documentacao/superpowers/plans/`
- Status: `docs/documentacao/project-status.md` (fonte canônica)

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
