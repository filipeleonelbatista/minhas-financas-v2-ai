# Spec — Fase 1 SAF API 29+ — Permissão moderna sem WRITE_EXTERNAL_STORAGE

> Data: 2026-09-15 | Base: `docs/DOSSIE.md:268` + `AGENTS.md:2` regra 10 + `ROADMAP.md:1.7` | Gate B (Play Store + regras offline intactas) | Reports/Tour descoped (Dashboard hero)

## 1. Objetivo

Remover `WRITE_EXTERNAL_STORAGE` (legado, rejeitado Play `targetSdk 36`) mantendo export/import vital de `Configurações` 100% funcional em **API 29-36**, via `StorageAccessFramework` (SAF) já existente em `app/src/pages/AboutUs.js:251`. Cobertura exigida: `Pixel_2_API_29`, `33`, `35` (`docs/project-status.md:58`).

## 2. Arquitetura

- **Manifest `app/app.json:30`**: remover 2 ocorrências `WRITE_EXTERNAL_STORAGE` / `android.permission.WRITE_EXTERNAL_STORAGE`. Manter `READ_EXTERNAL_STORAGE` com `maxSdkVersion: 32` (cobre 29-32 onde `READ_MEDIA_*` não existe). Manter `READ_MEDIA_IMAGES/VIDEO/AUDIO` + `READ_MEDIA_VISUAL_USER_SELECTED` + `ACCESS_MEDIA_LOCATION` para 33-36. `expo-media-library` plugin mapeia granular automático em 33+ (DOSSIE §6.3).
- **Export**: já `Platform.OS === 'android' ? StorageAccessFramework.createFileAsync/writeAsStringAsync : FileSystem.documentDirectory + fileName` (`AboutUs.js:257,260,507,510` + `Onboarding.js:84`). Não depende de `WRITE`; depende só de `selectedFolderToSave` (URI SAF). Nenhuma mudança de lógica, só manifest.
- **Import**: `DocumentPicker.getDocumentAsync({type:"text/*"}) + readAsStringAsync` — não escreve, não precisa `WRITE`. Gate `checkPermissions()` (`AboutUs.js:193`) continua checando `MediaLibrary.getPermissionsAsync` (usa `READ_*` conforme API).
- **Compat**: `android` pasta ejectada (`app/android/`) regenerada via `npx expo prebuild --clean` após manifest change; `compileSdk 36/targetSdk 36` + `kotlin 2.1.20` já em `app.json:36` mantidos.

## 3. Componentes

| Componente | Responsabilidade | Interface |
|---|---|---|
| `app/app.json:30` | Declara permissões Play | `expo.android.permissions[]` + plugins `expo-media-library` |
| `app/src/pages/AboutUs.js:193,251,500,739` | Gate permissão + export SAF + branch iOS | `checkPermissions(): Promise<boolean>`, `exportSomeData(data,filePrefix)` |
| `app/src/pages/Onboarding.js:84` | Solicita pasta SAF inicial | `requestDirectoryPermissionsAsync() -> directoryUri` |
| `app/src/utils/sanitize.ts`, `excel.ts` | Hardening import (allowlist `xlsx/csv`, block `xlsm`, 5MB/5k) | `parseImport(file): Row[]` |

## 4. Fluxos

- **Onboarding (primeira abertura)**: `requestDirectoryPermissionsAsync()` → salva `config.selectedFolderToSave` → todos exports usam URI. Sem URI → `Alert "Selecione pasta em Configurações → Alterar pasta de exportação"` (já em `AboutUs.js:251`).
- **Export Finanças/Estoque/Listas/Corridas**: `checkPermissions() -> requestPermissionsAsync` se negado → `Alert` + abort. Se `Platform.OS === 'android' && !directoryUri` → `Alert`. Senão `createFileAsync(directoryUri,fileName,"text/*") -> writeAsStringAsync`. iOS → `documentDirectory + fileName -> writeAsStringAsync -> Alert path`.
- **Import**: `getDocumentAsync` → `readAsStringAsync` → `readString` → `handleCSVtoArrayFormat` com `sanitize` + `excel.ts` magic `PK\x03\x04` → `repo.bulkInsert`.

## 5. Tela por tela

- **AboutUs (Configurações)**: seção `Geral → Alterar pasta de exportação` mantém `requestDirectoryPermissionsAsync`. Exports `Exportar finanças/estoque/corridas/listas` exibem `ToastAndroid "Exportação realizada"` ou `Alert` se falha. `Privacidade → biometria` (`biometry-switch`) inalterado.
- **Onboarding**: 7 slides + obrigatoriedade `directoryUri` em Android; iOS pula SAF (`Platform.OS !== 'android'`).

## 6. Segurança

- `sanitize.ts` 80ch/NFKC/strip `<>{}$;`/`javascript:` + `excel.ts` `cellFormula:false, cellHTML:false, WTF:false, bookVBA:false` + strip `=HYPERLINK/=WEBSERVICE/=CMD|/=DDE` + `Platform` guard iOS já validado em `__tests__/security/saf-ios.test.ts:19`.
- `fileName` sanitizado `replace(/[^\w\-_.]/g,"")` antes de `createFileAsync`.

## 7. Testes (TDD)

- `__tests__/security/permissions.test.ts` (novo): verifica `app.json` sem `WRITE_EXTERNAL_STORAGE`, com `READ_MEDIA_*` e `maxSdkVersion 32` quando `READ_EXTERNAL_STORAGE` presente.
- `__tests__/security/saf-ios.test.ts:19` já PASS — manter.
- `yarn --cwd app jest --no-coverage` → 25 suites PASS (24 atuais + 1 novo).
- QA manual: `Pixel_2_API_29` (export/import CSV), `API_33` granular, `API_35` targetSdk 36. `npx --prefix app expo-doctor` 21/21. `npx expo prebuild --clean && yarn android` smoke.

## 8. Quality Gate

- `lint` + `test:security` + `expo-doctor 21/21` + `audit --audit-level=high`. `coverageThreshold` não exigido para este patch (gate B), mas `test:coverage` deve manter 80% em `repositories/**`.

## 9. Fora de escopo

- Reports (`Reports.js`) e Tour (`Tour.tsx`) — descoped propositalmente, consolidados em `Dashboard.js:49` hero/pizza/linha.
- CI `.github/workflows` e `DOSSIE.md` reescrita completa — fica para follow-up.

## 10. Commit

- `app/app.json:30` + `app/docs/superpowers/specs/2026-09-15-fase1-saf-api29-design.md` + teste `permissions.test.ts`
