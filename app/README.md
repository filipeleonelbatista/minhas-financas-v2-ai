# Financas App v2.2.2 — WatermelonDB Edition

App React Native (Expo) offline-first para gestão de finanças familiares, estoque, combustível e metas, com import/export CSV e IA (OpenAI gpt-3.5-turbo). Este é o branch `feature/adicionando-watermelondb` (superconjunto da `main` 2.0.2 publicada na Play Store como `com.finances`).

> 📚 **Dossiê completo:** `docs/DOSSIE.md` (stacks, telas, schemas, permissões por versão Android, temas, bugs conhecidos)
> 🤖 **Guia para agentes/LLM:** `AGENTS.md` (regras de negócio, SOLID/TDD/coverage/quality gate)

---

## 1. Requisitos

- **Node** 20 LTS (testado em 20.x; Node 22 também funciona mas EAS usa 20) + `yarn` 1.22 ou `npm` 10
- **Java 17** (Gradle 7.4+ para `android/` ejectado) + **Android SDK** `platform-tools`, `build-tools 33`, `platforms android-33`
- **Xcode 15+** apenas para iOS (`expo run:ios`)
- **Expo CLI**: `npm i -g eas-cli` + `npx expo --version` (SDK 48)
- **Chave OpenAI** opcional (para IA): criar em https://platform.openai.com/account/api-keys

> ⚠️ **Não use Expo Go.** WatermelonDB exige código nativo → só via `dev-client` / `expo run:*`.

---

## 2. Como Rodar (hoje — Expo 48)

```bash
# 1. Clonar e entrar
cd finances-app-feature-adicionando-watermelondb

# 2. Instalar (use yarn pois há yarn.lock; npm também funciona)
yarn install
# ou
npm install

# 3. Prebuild (sincroniza android/ com app.json + plugins)
npx expo prebuild --clean
# alternativa
yarn prebuild  # script "prebuild": "expo prebuild"

# 4a. Rodar em emulador/dispositivo com dev-client (RECOMENDADO)
yarn android          # = expo run:android  (builda nativo + instala)
# ou
yarn ios              # = expo run:ios

# 4b. Dev-client via EAS (para testar em device físico sem Android Studio)
yarn build:dev        # eas build -p android --profile development
# instale o APK gerado, depois:
yarn start            # expo start --dev-client

# 4c. Web (limitado — WatermelonDB não funciona em web)
yarn web              # expo start --web

# 5. Outros scripts
yarn clean-android    # cd android && ./gradlew clean
yarn build:apk        # eas build -p android --profile preview (APK)
yarn build:store      # eas build -p android --profile production (AAB)
yarn start:emulator   # emulator -avd Pixel_2_API_33
```

**Primeiro run:** O Onboarding pedirá para escolher a **pasta de exportação** (SAF). Sem ela, Exportar/Importar CSV falhará. Aceite e crie uma pasta (ex: `Financas/exports`).

---

## 3. Modernização — Atualizando Expo / React / Libs

Este app está em **Expo 48 (RN 0.71.8, React 18.2, Kotlin 1.6.0)** — EOL. A Play Store exige `targetSdk 35` a partir de ago/2025. Siga este roteiro incremental (nunca pule majors).

### 3.1 Roteiro Recomendado (1 major por PR, com testes verdes)

```
Expo 48 → 49 → 50 → 51 → 52 → 53 (atual LTS 2025)
RN   0.71 → 0.72 → 0.73 → 0.74 → 0.76 → 0.77
React 18.2 → 18.3 → 19 (só em Expo 53+)
Kotlin 1.6 → 1.8 → 1.9
WatermelonDB 0.26 → 0.28+ (suporte RN 0.76+)
openai 3.3 → 5.x
native-base 3.4 → gluestack-ui 2.x (breaking)
```

### 3.2 Passo-a-passo por upgrade

```bash
# 0. Travar baseline: commit limpo + backup branch
git checkout -b chore/expo-48-to-49

# 1. Usar ferramenta oficial Expo (faz 90% do trabalho)
npx expo install expo@^49.0.0 --fix
npx expo-doctor              # corrige o que quebrar

# Alternativa moderna (Expo 52+):
npx expo install expo@latest --fix
# ou
npm install expo@^53

# 2. Conferir breaking changes do SDK
# https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
# Exemplos:
# - Expo 49: expo@49 exige metro@0.76, reanimated@3.3, react-native@0.72
# - Expo 50: requer Node 18+, dropa expo-media-library legado
# - Expo 52: New Architecture opcional, Kotlin 1.9
# - Expo 53: React 19 opt-in

# 3. Atualizar WatermelonDB decorator plugin
# babel.config.js: trocar "@babel/plugin-proposal-decorators" -> "@babel/plugin-transform-decorators" em Expo 51+

# 4. Prebuild limpo
npx expo prebuild --clean
cd android && ./gradlew clean && cd ..

# 5. Testar
yarn android   # ou yarn ios
# Verificar: Finanças, Estoque, Listas, Import/Export CSV (com SAF), IA (chave OpenAI)

# 6. Subir PR, CI verde (lint + test:coverage + expo-doctor), merge, repetir para próximo major
```

### 3.3 Libs que exigem atenção manual

| Lib | De | Para | Como migrar |
|---|---|---|---|
| `native-base` | 3.4.28 (arquivado) | `gluestack-ui` ou `nativewind` | Seguir https://gluestack.io/docs/migration/nativebase — componentes `Box/VStack/HStack/Text/Button` mudam import. Fazer em PR isolado. |
| `openai` | 3.3.0 (`Configuration`, `OpenAIApi`) | 5.x (`new OpenAI()`) | `src/hooks/useOpenAi.js:13` e `src/pages/IAPage.js:64` trocar para `import OpenAI from 'openai'` + `new OpenAI({apiKey, dangerouslyAllowBrowser:true})` + `openai.chat.completions.create({model:'gpt-3.5-turbo'})` |
| `expo-media-library` + `expo-file-system` + `expo-document-picker` | SAF legado | Expo 53 `expo-file-system/next` | Em 33+ `WRITE_EXTERNAL_STORAGE` não funciona; manter SAF mas remover `WRITE_EXTERNAL_STORAGE` de `app.json:30` quando `targetSdk 34+` |
| `@react-native-community/datetimepicker` | 6.7.3 | 8.x | API `DateTimePickerAndroid.open` virou `DateTimePickerAndroid.open` com `value` obrigatório — testado |
| `react-native-chart-kit` | 6.12 | 6.12 (ok) | Verificar compat RN 0.76 (requer `react-native-svg` 15+) |

### 3.4 Checklist pós-upgrade

- [ ] `npx expo-doctor` sem erros
- [ ] `yarn android` e `yarn ios` buildam sem `gradle` error
- [ ] Onboarding escolhe pasta SAF e Exportar/Importar CSV funciona (testar API 29, 33, 34)
- [ ] WatermelonDB CRUD em cada domínio (Finanças, Combustível, Estoque, Listas, Goals) persiste após reload
- [ ] IA chat responde com chave válida
- [ ] `docs/DOSSIE.md` §2.1 e `app.json` version bump atualizados

---

## 4. Variáveis & Configuração

- **OpenAI API Key:** digitada em `Configurações → Habilitar IA (Beta) → Chave de API` (`AboutUs.js:632`). Validada com `createChatCompletion Olá mundo` (`useOpenAi.js:19`). Armazenada em `config.apiKey` (WatermelonDB). Sem créditos, `openaiErrorHandler` mostra `Não foi possível fazer a pesquisa`.
- **Pasta de exportação:** `config.selectedFolderToSave` (URI SAF). Alterável em `Configurações → Alterar pasta de exportação` ou no Onboarding.
- **EAS:** `eas.json` profiles `development` (internal, dev-client), `preview` (APK), `production` (AAB). `projectId` já configurado.

---

## 5. Scripts (package.json:4)

| Script | Comando | Descrição |
|---|---|---|
| `prebuild` | `expo prebuild` | Regenera `android/`/`ios/` |
| `clean-android` | `cd android && ./gradlew clean` | Limpa build |
| `android:build:apk` | `./gradlew assembleRelease` | APK local |
| `android:build:aab` | `./gradlew bundleRelease` | AAB local |
| `start` | `expo start --dev-client` | Metro para dev-client |
| `android` | `expo run:android` | Build + run nativo |
| `ios` | `expo run:ios` | Build + run iOS |
| `build:dev` | `eas build -p android --profile development` | Build dev-client remoto |
| `build:apk` | `eas build -p android --profile preview` | APK remoto |
| `build:store` | `eas build -p android --profile production` | AAB remoto |

---

## 6. Estrutura Resumida

```
App.js → NativeBaseProvider → Pages/Settings/Payments/Runs/Lists/Market/Goals → Routes
src/routes.js (Stack) + src/bottom-tab-routes.js (Tabs) + src/market-stack-routes.js (Stock→Lists→List)
src/databases/ (WatermelonDB 7 tabelas, version 25)
src/context/* (Repositories) + src/hooks/* (facades)
src/pages/* (8 telas) + src/components/* (20+ forms/cards)
docs/DOSSIE.md (dossiê) + AGENTS.md (regras/SOLID/TDD)
```

---

## 7. Troubleshooting

- **Metro: `Plugin proposal-decorators not found`** → `yarn add -D @babel/plugin-proposal-decorators@^7.22.7` (ou `transform-decorators` em Expo 51+)
- **Android: `Could not find WatermelonDB`** → `npx expo prebuild --clean` + `yarn android`. Nunca `expo start` puro.
- **Export falha silenciosamente** → Verifique se `selectedFolderToSave` não está vazio (Onboarding). Em Android 13+ conceda `Allow access to media` quando pedir.
- **iOS: `StorageAccessFramework is not available`** → Bug conhecido (docs/DOSSIE.md 7.2). Export em iOS precisa fallback para `FileSystem.documentDirectory` (usar `Platform.OS` guard).
- **`openai.createChatCompletion is not a function`** → Você atualizou `openai` para 4+ sem migrar `useOpenAi.js` — veja §3.3.

---

## 8. Próximos Passos Sugeridos

1. Configurar `jest` + `eslint` + `typecheck` (ver `AGENTS.md:5.4` Quality Gate)
2. Corrigir `itemsSchema desiredQuantity` mismatch (migration 26)
3. Migrar `openai` 3→5 e `native-base` → `gluestack-ui` em PRs separados
4. Subir Expo 48→53 incremental (§3.2)

PRs bem-vindos — siga `AGENTS.md:6` workflow + conventional commits.
