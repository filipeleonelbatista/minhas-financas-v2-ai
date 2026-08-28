---
layout: default
title: Política de Privacidade — Minhas Finanças v2
description: Como o Minhas Finanças v2 trata seus dados. Offline-first, só sincroniza se você assinar Família (Firebase southamerica-east1). LGPD, direitos e exclusão.
image: /minhas-financas-v2-ai/assets/og-image.png
---

# Política de Privacidade

> Última atualização: 2026-08-28 | Controlador: Filipe Leonel Batista | Contato: [filipe.x2016@gmail.com](mailto:filipe.x2016@gmail.com) | DPO: mesmo contato

## 1. Resumo

Este app é **primariamente offline** (`expo-sqlite` local). Dados de finanças, estoque, combustível e metas ficam no seu dispositivo. Export CSV via `StorageAccessFramework` fica na pasta que você escolheu (`selectedFolderToSave`). **Sem login, nenhum dado é enviado a servidor.** Só ao optar pelo recurso **Família** (login + assinatura R$ 14,90/119) seus dados de workspaces `Família` são sincronizados via Firebase `financas-v2` em `southamerica-east1`.

## 2. Dados coletados

**Offline (sempre):** tudo fica local — não coletamos.

**Online opt-in Família:**
- e-mail, UID Firebase, workspaces e transações dos workspaces `Família`, status de assinatura (`RevenueCat` → `subscriptions/{uid}`), invites.
- Base legal LGPD art. 7: execução de contrato (Família paga) e consentimento (tela login).

## 3. Compartilhamento

Com **Google Firebase** e **RevenueCat** apenas para auth/sync/billing, conforme políticas deles. Não vendemos dados.

## 4. Retenção e downgrade

Dados `Família` até você sair da família ou excluir conta. Sair/cancelar → snapshot **arquivado offline** (badge “Sincronização pausada”) até `Remover da lista`. Re-convite sobrescreve. Admin sair = exclusão irreversível com aviso.

## 5. Seus direitos (LGPD)

Acesso, correção, exclusão, portabilidade (export CSV), revogação. Use **Configurações → Excluir minha conta** (apaga `users/{uid}` + workspaces Pessoais) ou e-mail acima. Retenção de logs fiscais conforme lei.

## 6. Segurança

Chaves IA em `expo-secure-store` (hardware), biometria via `expo-local-authentication`, Firestore rules por `role` (`admin/editor/viewer`), sanitização anti-XSS/SQL/prompt injection, Excel anti-malware, rate limit IA.

## 7. Crianças

Não coletamos de menores sem consentimento do responsável.

---

Dúvidas: [Suporte](./suporte.html) | [Termos](./termos.html) | [FAQ](./faq.html)
