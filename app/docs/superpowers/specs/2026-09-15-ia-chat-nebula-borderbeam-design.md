# Spec — IA Chat NebulaOrb + BorderBeam + SafeArea + Markdown

> Data: 2026-09-15 | Base: `app/src/pages/IAPage.js:238` + `app/src/components/ui/Orb.tsx:17` | Gate B | Reports/Tour descoped | SAF API 29+ em `2026-09-15-fase1-saf-api29-design.md`

## 1. Objetivo

Corrigir `IAPage` ("Conversa") que hoje corta conteúdo sob `navigation bar`, balões limitados e sem formatação, e integrar `reacticx` `NebulaOrb` (roxo + highlight adaptativo) e `BorderBeam` (textarea + select modelo + enviar) com layout agente full-width e usuário balão “Ver tudo”.

## 2. Arquitetura

- **Deps**: `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-safe-area-context` já instalados (`package.json`). Instalar via `yarn dlx reacticx add nebula-orb` e `yarn dlx reacticx add border-beam` → gera `app/src/components/ui/nebula-orb.tsx` + `border-beam.tsx` (+ conf/types). Fallback se Skia não pronto: `Orb` gradient atual (`Orb.tsx:63`).
- **Orb**: `app/src/components/ui/Orb.tsx:50` wrapper detecta `colorModeState` (`useSettingsStore`) → `NebulaOrb size={dim} color="#9c44dc" highlightColor={isDark?'#000000':'#ffffff'} speed={1} turbulence={1}`. `color` roxo destaque fixo, `highlight` preto dark / branco light. Uso em `IAPage.js:251` `Orb size="lg"` e modal `size="md"` sem mudança de props.
- **Input**: `app/src/pages/IAPage.js:322` substituir `View absolute bottom` por `BorderBeam borderRadius={16} borderWidth={1} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{marginHorizontal:16, marginBottom: insets.bottom+12}}` envolvendo textarea + row modelo/enviar.
- **SafeArea/Keyboard**: `App.js` já `SafeAreaProvider`; em `IAPage.js` usar `const insets = useSafeAreaInsets()` + `KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={insets.top+56}`. `ScrollView contentContainerStyle paddingBottom: insets.bottom+120` (não 120 fixo). `useIsKeyboardOpen` mantido só para `paddingBottom` alternativo.
- **Mensagens**: `ScrollView` lista `data` (`useShallow` já estável). `assistant` full-width `Markdown`, `user` balão 75% com `numberOfLines` + “Ver tudo”.

## 3. Componentes

| Componente | Responsabilidade | Interface |
|---|---|---|
| `app/src/components/ui/Orb.tsx` | Wrapper NebulaOrb adaptativo | `Orb({size, color?, testID?})` → `highlightColor` por `colorModeState` |
| `app/src/components/ui/nebula-orb.tsx` | Skia orb roxo | `NebulaOrb({size, color, highlightColor, speed})` |
| `app/src/components/ui/border-beam.tsx` | Beam ao redor input | `BorderBeam({borderRadius, colors, duration, glow, style, children})` |
| `app/src/pages/IAPage.js:238` | Chat SafeArea + Markdown + layout | `IAPage()` + `expanded:Set<number>` para “Ver tudo” |
| `app/src/hooks/useIsKeyboardOpen.ts` | Detecta teclado | `useIsKeyboardOpen(): boolean` |

## 4. Fluxos

- **Orb**: `isDark ? '#000' : '#fff'` computado a cada render; `sizeMap lg 96` (`Orb.tsx:42`) → `NebulaOrb size={96}`.
- **Input textarea**: `TextInput multiline numberOfLines={4} maxHeight={120} value={inputText}` dentro de `BorderBeam`. Row abaixo: `Pressable` modelo `-> navigation.navigate("AIProviders")` exibindo `activeLabel • activeModel ▾` (`getActiveProvider`/`getProviderModel` `IAPage.js:56`), spacer, `TouchableOpacity btn-send` desabilitado se `!inputText || isLoading`. `onSubmitEditing` mantém `handleAskToAi`.
- **Assistant full-width**: `m.type==='assistant'` → `View width:"100%" padding 16` + `<Markdown>{m.text}</Markdown>` com `strong` roxo `581C87`/`e9d5ff`, `bullet_list` indentada, `code_inline` `bgCard`. Sem `elevation`/`borderRadius`.
- **User balão**: `m.type==='user'` → `View alignSelf:'flex-end' maxWidth:"75%" bg "#a855f7" borderRadius 16 padding 12` + `<Text numberOfLines={isExp?undefined:3}>` + se `m.text.length>120` exibe `Pressable "Ver tudo"/"Ver menos"` que toggla `expanded` Set. Avatar `MaterialCommunityIcons` mantido.
- **SafeArea**: `insets.bottom` garante input nunca sob `navigation bar` (API 29-36 gesture). `ScrollView` auto `scrollToEnd` (`IAPage.js:105`) mantém após `Markdown` render.

## 5. Tela por tela

- **IAPage header**: `Header isShort` + `Orb lg` (`testID orb-header`) + `Ativo/Fallback` + `btn-manage-providers` inalterados.
- **Scroll**: `data.length===0` quick prompts (`btn-financial-tips` etc.) mantidos; quando `data` existe, lista mensagens com novo layout.
- **Modal apiKey**: `Orb md` dentro usa mesmo NebulaOrb adaptativo.

## 6. Segurança/Performance

- `buildPrompt` delimitadores `<<<DADOS>>>` + `canSendPrompt 3/60s` (`IAPage.js:175`) mantidos. `Markdown` renderiza só `Text` (não `WebView`), auto-escapa XSS. `Skia` fallback se `RuntimeEffect` falhar.

## 7. Testes

- `__tests__/components/orb-nebula.test.tsx`: `highlightColor` preto em dark, branco em light, `color="#9c44dc"` fixo.
- `__tests__/pages/iapage-borderbeam.test.tsx`: `BorderBeam` envolve textarea, `btn-send` desabilitado se vazio, `Pressable` modelo navega `AIProviders`.
- `__tests__/pages/iapage-layout.test.tsx`: `assistant` full-width sem `width 75%`, `user` balão `numberOfLines 3` + “Ver tudo” toggle, `Markdown` renderiza `**bold**` e `"- item"` lista.
- `yarn --cwd app jest --no-coverage` → 27 suites PASS (24 atuais + 3 novos). `npm --prefix app run npx --yes expo-doctor` 21/21.

## 8. Quality Gate

- `lint` + `test:security` (prompt/sanitize) + `expo-doctor`. Sem `coverageThreshold` extra para este patch.

## 9. Fora de escopo

- Fase 1 SAF API 29+ (`2026-09-15-fase1-saf-api29-design.md` separado), Reports/Tour descoped, RevenueCat Fase 2.

## 10. Commit

- `app/src/components/ui/Orb.tsx`, `app/src/components/ui/nebula-orb.tsx`, `border-beam.tsx`, `app/src/pages/IAPage.js`, testes + spec
