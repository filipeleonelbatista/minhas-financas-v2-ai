---
layout: default
title: Minhas Finanças v2 — Gestão Financeira Familiar Offline-First
description: App Expo/React Native offline-first para famílias gerenciarem finanças, estoque, combustível e metas. Com IA (OpenAI, Gemini, Claude), cálculo de dízimo com escrituras JFA, e compartilhamento familiar via Firebase. 100% privado e sem rastreamento.
image: /minhas-financas-v2-ai/assets/og-image.png
keywords: [finanças pessoais, controle financeiro, familia, offline-first, expo, react native, dízimo, metas financeiras, combustível, estoque, IA financeira]
---

# Minhas Finanças v2 — Gestão Financeira Familiar

> **Offline-first, privado e feito para famílias.** Controle finanças, estoque de casa, combustível e metas — com IA para insights e cálculo de dízimo. Só sincroniza se você quiser (Fase 2, Firebase `southamerica-east1`).

![Finanças App](https://raw.githubusercontent.com/filipeleonelbatista/finances-app/main/.github/3.png)

## Por que usar?

- **100% offline** (`expo-sqlite` + `drizzle-orm`) — seus dados ficam no seu celular. Exporte/importe CSV quando quiser (SAF, pasta à sua escolha).
- **Família compartilhada (Fase 2, opt-in pago R$ 14,90/mês / R$ 119/ano)** — até 5 workspaces `Família` + 1 `Pessoal` por pessoa, papéis `Admin/Editor/Viewer`, sync seguro via Firestore. Sem login = sem nuvem.
- **IA multi-provider** — use sua chave Gemini, OpenAI, Anthropic, OpenRouter ou Zen (uma ativa + fallback automático). Insights sobre gastos sem enviar dados sem consentir.
- **Dízimo com propósito** — menu habilitável, % custom (padrão 10%), seleção de `Ganhos` que entram, card mensal e escrituras **João Ferreira de Almeida** (Malaquias 3:8-10, Viúva etc.).
- **Seguro** — biometria (`expo-local-authentication`), chaves em `expo-secure-store`, sanitização anti-XSS/SQL/prompt injection e Excel anti-malware.

## Funcionalidades

- **Finanças:** entradas/saídas, 14 categorias, filtros por período/tipo/status/favoritos, busca, Saldo/Tithe.
- **Mercado/Estoque:** quantidade desejada vs atual, listas de compras (estoque → lista).
- **Combustível:** hodômetro, autonomia, estimativa `Km = (autonomia*valor/preço)+km`.
- **Metas:** viagem, carro, computador, investimento — progress bar + `Restam X dias`.
- **Relatórios & Dashboard (Fase 1):** Saúde financeira, pizza por categoria, linha 6 meses, metas urgentes.
- **Tutorial interativo:** 7 slides + spotlight guiando o happy path (adicionar entrada/saída).

## Stack

Expo **SDK 54** • React Native **0.81** • React **19.1** • NativeWind **4.1** • ReacticX (CTAs/ORB) • expo-sqlite + drizzle-orm • reanimated/moti • RevenueCat + Play Billing

Veja o **dossiê técnico** em `finances-app-feature-adicionando-watermelondb/docs/DOSSIE.md` e o **roadmap** em `finances-app-feature-adicionando-watermelondb/docs/ROADMAP.md`.

## Privacidade e Termos

- [Política de Privacidade](./privacidade.html) — offline-first, LGPD, downgrade arquivado
- [Termos de Uso](./termos.html)
- [Suporte](./suporte.html)
- [FAQ](./faq.html)

Contato: [filipe.x2016@gmail.com](mailto:filipe.x2016@gmail.com) • [LinkedIn](https://www.linkedin.com/in/filipeleonelbatista/) • [Sobre o dev](https://filipeleonelbatista.vercel.app/)

---

<p style="font-size:0.9em;color:#666">© 2026 Filipe Batista — Minhas Finanças v2 • Built with Expo + NativeWind • <a href="https://github.com/filipeleonelbatista/minhas-financas-v2-ai">GitHub</a></p>
