<a href="https://github.com/filipeleonelbatista/finances-web/blob/master/README_EN.md" target="_blank">
  <img src="https://raw.githubusercontent.com/filipeleonelbatista/filipeleonelbatista/master/assets/usa_flag.png" width="28px" />
  Version in English
</a>
</br>
</br>


<img width="100%" src="public/banner.png">

# Indice

- [Sobre](#-sobre)
- [Tecnologias](#Tecnologias)
- [Instalação](#Instalação)

## 🔖&nbsp; Sobre

Aplicativo para gerenciar as finanças da minha família. Com este app eu gerencio entradas e saidas das contas, controle de 
estoque de produtos da casa e hodômetro do carro para acompanhar os custos de abastecimento. Na parte das contas tem uma
Integração com a OpenAi para gerar análises baseadas nos dados inseridos pelo usuário.

[Link do Site](https://minhasfinancas.vercel.app/)
[Link do Aplicativo na Google Play](https://play.google.com/store/apps/details?id=com.finances)

## Objetivo

Criei este app para ajudar minha família a gerenciar melhor as finanças pessoais. Baseado no DevFinances da Rocketseat usei os
conhecimentos adiquiridos para desenvolver e ampliar meus conhecimentos com IA e Tailwind entre outras tecnologias usadas.
Tive um total de 100 Downloads na loja da Google play e acessando este app mensalmente algo em torno de 10 usuários.
O Projeto segue em desenvolvimento para poder monetizar ele. Esta versão final para portfolio.

Falo mais [NESTE POST](https://www.linkedin.com/posts/filipeleonelbatista_ia-ai-inteligenciaartificial-activity-7085289369468571648-43Bp?utm_source=share&utm_medium=member_desktop) do meu Linkedin.
 
---
## Tecnologias

Esse projeto foi desenvolvido com as seguintes principais tecnologias:

- [React 19](https://react.dev/)
- [Vite 6](https://vitejs.dev/)
- [Typescript 5.6+](https://www.typescriptlang.org/)
- [TailwindCSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand 5](https://zustand-demo.pmnd.rs/) + persist (paridade com o app mobile)
- [Zod 3.23](https://zod.dev/) (schemas espelhando `app/src/schemas/*`)
- [React Hook Form](https://react-hook-form.com/) + `@hookform/resolvers`
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB com fallback localStorage)
- [vite-plugin-pwa 1.x](https://vite-pwa-org.netlify.app/) (PWA instalável + offline)
- [Apex Charts](https://apexcharts.com/docs/installation/)
- [date-fns 4](https://date-fns.org/) (única lib de data)
- [Papaparse](https://www.papaparse.com/) (CSV seguro)
- [Vitest](https://vitest.dev/) + Testing Library (testes)

Legado em migração: `formik+yup`, `dayjs`, `uuid` → `crypto.randomUUID()`, `Context` → stores zustand. Ver `AGENTS.md` e `ROADMAP_PARIDADE.md`.

## Paridade com o mobile

O `app/` (Expo 57 + SQLite/drizzle + zustand) é a fonte da verdade. O web replica os 7 domínios offline:

- Dashboard Início, Finanças, Mercado/Estoque, Listas 2 níveis, Corridas, Metas, Dízimo JFA, Config
- Mesmas regras: filtros cascata, `Total = entradas - saídas`, Dízimo 10% com prefixo, datas como timestamp + offset 12h, moeda `pt-BR BRL`
- Storage local versionado `mf-db-v1:*` (localStorage + IndexedDB), sem backend
- IA multi-provider (openai/gemini/anthropic/openrouter/zen) é a única parte online — exige internet

Plano completo em `docs/superpowers/plans/2026-10-13-web-paridade-total.md`.

## PWA Offline

- Instalável (manifest `pt-BR`, icons 192/512 + maskable, shortcuts, `ReloadPrompt` com `useRegisterSW`)
- Funciona sem internet após primeiro load (Workbox `navigateFallback` + `runtimeCaching`)
- Dados 100% locais. IA mostra banner offline.

---
## Instalação

O projeto roda com [Node.js](https://nodejs.org/) v20+.

Instruções para instalar as dependencias e inicie o projeto.

### Web

```sh
cd finances-web
npm i
npx run dev
```

### Mobile

Precisa acessar este projeto [REPOSITÓRIO](https://github.com/filipeleonelbatista/finances-app)

## API da OpenAI

Dentro do aplicativo mobile você precisará ter sua chave da api para colocar em configurações para habilitar o botão da inteligência artificial.

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
