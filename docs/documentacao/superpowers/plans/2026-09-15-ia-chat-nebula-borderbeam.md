# IA Chat NebulaOrb + BorderBeam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir `IAPage` SafeArea/balões/keyboard + renderizar markdown listas/**bold** + integrar `NebulaOrb` roxo (highlight preto/branco) e `BorderBeam` textarea com select modelo + enviar, com layout agente full-width e usuário balão “Ver tudo”.

**Architecture:** Mantém `zustand` + `drizzle`. `Orb.tsx` vira wrapper `NebulaOrb` com `highlightColor` por `colorModeState`. `IAPage.js` usa `useSafeAreaInsets` + `KeyboardAvoidingView padding` + `BorderBeam` envolvendo textarea multiline + row modelo. Mensagens: `assistant` `Markdown` 100% + `user` `maxWidth 75%` com `numberOfLines 3` + toggle `expanded`. Fallback se Skia não pronto.

**Tech Stack:** Expo 57, React 19.2, react-native 0.86, NativeWind 4.1, @shopify/react-native-skia, react-native-reanimated, react-native-safe-area-context, react-native-markdown-display, reacticx nebula-orb + border-beam, zustand 5

---

## File Structure

**Create:**
- `app/src/components/ui/nebula-orb.tsx` (via `yarn dlx reacticx add nebula-orb`) + `conf.ts/types.ts` se gerados
- `app/src/components/ui/border-beam.tsx` (via `yarn dlx reacticx add border-beam`) + `conf.ts/types.ts/utils.ts`
- `app/__tests__/components/orb-nebula.test.tsx`
- `app/__tests__/pages/iapage-borderbeam.test.tsx`
- `app/__tests__/pages/iapage-layout.test.tsx`

**Modify:**
- `app/src/components/ui/Orb.tsx:1-115` — wrapper NebulaOrb com highlight adaptativo
- `app/src/pages/IAPage.js:1-376` — SafeArea insets, KeyboardAvoidingView offset, BorderBeam textarea + model select, layout mensagens + Markdown + expanded
- `app/package.json:12` — adicionar `react-native-markdown-display` se não existir

---

### Task 1: Instalar NebulaOrb

**Files:**
- Create: `app/src/components/ui/nebula-orb.tsx`
- Test: `app/__tests__/components/orb-nebula.test.tsx` (skeleton)

- [ ] **Step 1: Write the failing test**

```tsx
// app/__tests__/components/orb-nebula.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSettingsStore } from '../src/stores/settings';

jest.mock('@shopify/react-native-skia', () => ({ Canvas: ({children})=> children, Fill: ({children})=> children, Shader: ()=> null, Skia: { RuntimeEffect: { Make: ()=> null } }, vec: (a,b)=> [a,b] }));
jest.mock('react-native-reanimated', () => ({ useSharedValue: ()=>({value:0}), useDerivedValue: (fn)=>({value:fn()}), withRepeat: (v)=>v, withTiming: (v)=>v, Easing:{linear:(v)=>v}, cancelAnimation: jest.fn() }));

describe('Orb Nebula highlight', () => {
  test('renders NebulaOrb with purple color and white highlight in light', () => {
    useSettingsStore.setState({ colorModeState: 'light' });
    const Orb = require('../src/components/ui/Orb').default;
    const { getByTestId } = render(<Orb size="lg" testID="orb" />);
    expect(getByTestId('orb')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/components/orb-nebula.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: FAIL `Cannot find module './nebula-orb'` / `RacticxOrb not found`

- [ ] **Step 3: Write minimal implementation**

```bash
yarn dlx reacticx add nebula-orb 2>&1 | head -20
# se falhar offline, copiar manual de https://www.reacticx.com/components/nebula-orb
# garantir arquivo em app/src/components/ui/nebula-orb.tsx exportando NebulaOrb
ls app/src/components/ui/nebula-orb.tsx
```

Manual fallback: criar `app/src/components/ui/nebula-orb.tsx` copiando `component/nebula-orb.tsx` do site (index.tsx + conf.ts). Verificar `import { NebulaOrb } from './nebula-orb'` export.

- [ ] **Step 4: Run test to verify it fails differently (file exists)**

Run: `yarn --cwd app jest app/__tests__/components/orb-nebula.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: FAIL ainda pois `Orb.tsx` ainda não usa NebulaOrb

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ui/nebula-orb.tsx app/__tests__/components/orb-nebula.test.tsx
git commit -m "feat(orb): add nebula-orb component (reacticx)"
```

---

### Task 2: Wrapper Orb com highlight adaptativo

**Files:**
- Modify: `app/src/components/ui/Orb.tsx:34-115`
- Test: `app/__tests__/components/orb-nebula.test.tsx`

- [ ] **Step 1: Write the failing test (expand)**

```tsx
test('dark highlight black, light white', () => {
  useSettingsStore.setState({ colorModeState: 'dark' });
  const Orb = require('../src/components/ui/Orb').default;
  const { getByTestId, rerender } = render(<Orb size="lg" color="#9c44dc" testID="orb" />);
  expect(getByTestId('orb')).toBeTruthy();
  // after implementation, NebulaOrb receives highlightColor="#000000" in dark
  useSettingsStore.setState({ colorModeState: 'light' });
  rerender(<Orb size="lg" color="#9c44dc" testID="orb" />);
  expect(getByTestId('orb')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/components/orb-nebula.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: PASS mas sem assert de highlight (implementação ainda não usa)

- [ ] **Step 3: Write minimal implementation**

```tsx
// app/src/components/ui/Orb.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useSettingsStore } from '../stores/settings';
let NebulaOrb: any = null;
try { NebulaOrb = require('./nebula-orb').NebulaOrb ?? require('./nebula-orb').default; } catch {}
// ... sizeMap resolveSize
export default function Orb({ size='lg', color='#9c44dc', testID='orb', style }: any){
  const dim = resolveSize(size);
  const colorModeState = useSettingsStore((s)=> s.colorModeState);
  const highlight = colorModeState==='dark' ? '#000000' : '#ffffff';
  if(NebulaOrb){
    try { return <NebulaOrb size={dim} color={color} highlightColor={highlight} speed={1} testID={testID} style={style} />; } catch {}
  }
  // fallback gradient sphere (existente)
}
```

Preservar `LinearGradient` fallback dentro de `catch`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn --cwd app jest app/__tests__/components/orb-nebula.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: PASS 2/2

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ui/Orb.tsx app/__tests__/components/orb-nebula.test.tsx
git commit -m "feat(orb): NebulaOrb roxo highlight preto/branco por colorMode"
```

---

### Task 3: Instalar BorderBeam

**Files:**
- Create: `app/src/components/ui/border-beam.tsx`
- Test: `app/__tests__/pages/iapage-borderbeam.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/__tests__/pages/iapage-borderbeam.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
jest.mock('@shopify/react-native-skia', () => ({ Canvas: ({children})=> children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: ()=>({top:0,bottom:34,left:0,right:0}) }));
describe('BorderBeam input', () => {
  test('IAPage renders textarea inside BorderBeam', () => {
    const IAPage = require('../src/pages/IAPage').default;
    const { getByTestId } = render(<IAPage />);
    expect(getByTestId('input-ask')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-borderbeam.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: FAIL `Cannot find module './border-beam'` (ainda não instalado)

- [ ] **Step 3: Write minimal implementation**

```bash
yarn dlx reacticx add border-beam 2>&1 | head -20
ls app/src/components/ui/border-beam.tsx
```

Verificar export `BorderBeam`.

- [ ] **Step 4: Run test (still fail until IAPage uses it)**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-borderbeam.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: PASS shallow (IAPage ainda não usa BorderBeam mas teste não checa wrapper)

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ui/border-beam.tsx app/__tests__/pages/iapage-borderbeam.test.tsx
git commit -m "feat(ui): add border-beam component (reacticx)"
```

---

### Task 4: SafeArea + Keyboard + Markdown deps

**Files:**
- Modify: `app/src/pages/IAPage.js:1-10,238-268,322-354`
- Modify: `app/package.json:12`

- [ ] **Step 1: Write the failing test**

```tsx
// app/__tests__/pages/iapage-layout.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
jest.mock('react-native-markdown-display', () => ({ default: ({children})=> children }));
describe('IAPage layout', () => {
  test('assistant full-width markdown, user balloon ver tudo', () => {
    const { queryByText } = render(<IAPageWithData />);
  });
});
```

Simpler: test verifica `insets.bottom` usado.

```bash
grep -n "useSafeAreaInsets" app/src/pages/IAPage.js
# expected fail: no insets before task
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-layout.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: FAIL `useSafeAreaInsets not found`

- [ ] **Step 3: Write minimal implementation**

```bash
yarn --cwd app add react-native-markdown-display 2>&1 | tail -5
```

Em `app/src/pages/IAPage.js`:
```js
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
// top: const insets = useSafeAreaInsets();
```
Trocar `KeyboardAvoidingView keyboardVerticalOffset={80}` por `keyboardVerticalOffset={insets.top + 56}` e `behavior={Platform.OS==='ios'?'padding':'height'}`.
{% raw %}`ScrollView contentContainerStyle={{paddingBottom: insets.bottom + 120}}`{% endraw %}
Remover `position: absolute` fixo e usar `BorderBeam` com `marginBottom: insets.bottom+12` (próxima task).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-layout.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/IAPage.js app/package.json app/yarn.lock
git commit -m "fix(chat): SafeArea insets + Markdown dep + Keyboard offset"
```

---

### Task 5: Layout mensagens (agente full-width, usuário balão ver tudo)

**Files:**
- Modify: `app/src/pages/IAPage.js:296-321`
- Test: `app/__tests__/pages/iapage-layout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/__tests__/pages/iapage-layout.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IAPage from '../src/pages/IAPage';
import { useFinanceStore } from '../src/stores/finance';
describe('chat layout', () => {
  test('assistant renders Markdown full width, user balloon collapsed with Ver tudo', async () => {
    const longText = 'a'.repeat(200);
    const { getByText, queryByText } = render(<IAPage />);
    // after pushing data via store mock, check Ver tudo appears
    expect(queryByText('Ver tudo')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-layout.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: FAIL `Unable to find Ver tudo`

- [ ] **Step 3: Write minimal implementation**

{% raw %}
```tsx
// app/src/pages/IAPage.js dentro do data.map
const [expanded, setExpanded] = useState(new Set());
{data.map((m,i)=> m.type==='assistant' ? (
  <View key={i} style={{width:'100%', paddingHorizontal:16, paddingVertical:12}}>
    <Markdown style={{body:{color:text, fontSize:15, lineHeight:22}, strong:{fontWeight:'700', color: isDark?'#e9d5ff':'#581C87'}}}>{m.text}</Markdown>
  </View>
) : (
  <View key={i} style={{alignSelf:'flex-end', maxWidth:'75%', backgroundColor:'#a855f7', borderRadius:16, padding:12, marginRight:16, marginVertical:8}}>
    <Text numberOfLines={expanded.has(i)?undefined:3} style={{color:'white'}}>{m.text}</Text>
    {m.text.length>120 && (
      <Pressable onPress={()=>{ const n=new Set(expanded); n.has(i)?n.delete(i):n.add(i); setExpanded(n); }}>
        <Text style={{color:'rgba(255,255,255,0.9)', fontSize:12, marginTop:6, textDecorationLine:'underline'}}>{expanded.has(i)?'Ver menos':'Ver tudo'}</Text>
      </Pressable>
    )}
  </View>
))}
```
{% endraw %}

Preservar avatar `MaterialCommunityIcons` se desejado, mas assistant sem balão.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-layout.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/IAPage.js app/__tests__/pages/iapage-layout.test.tsx
git commit -m "feat(chat): agente full-width Markdown, usuário balão Ver tudo"
```

---

### Task 6: Input BorderBeam textarea + model select

**Files:**
- Modify: `app/src/pages/IAPage.js:322-354`
- Test: `app/__tests__/pages/iapage-borderbeam.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
test('BorderBeam wraps textarea and model select', () => {
  const { getByTestId, getByPlaceholderText } = render(<IAPage />);
  expect(getByPlaceholderText('Digite sua pergunta aqui...')).toBeTruthy();
  expect(getByTestId('border-beam')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-borderbeam.test.tsx --no-coverage 2>&1 | tail -n 30`
Expected: FAIL `Unable to find border-beam`

- [ ] **Step 3: Write minimal implementation**

{% raw %}
```tsx
import { BorderBeam } from '../components/ui/border-beam';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ...
const insets = useSafeAreaInsets();
// replace absolute View bottom with:
<BorderBeam testID="border-beam" borderRadius={16} borderWidth={1} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{marginHorizontal:16, marginBottom: insets.bottom + 12}}>
  <View style={{backgroundColor: isDark?'#27272a':'white', borderRadius:16, padding:12, gap:12}}>
    <TextInput testID="input-ask" multiline numberOfLines={4} maxHeight={120} placeholder="Digite sua pergunta aqui..." value={inputText} onChangeText={setInputText} style={{color:text, minHeight:48, textAlignVertical:'top'}} placeholderTextColor="#a1a1aa" />
    <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
      <Pressable testID="model-select" onPress={()=>navigation.navigate("AIProviders")} style={{flexDirection:'row', alignItems:'center', gap:6, backgroundColor: isDark?'#3f3f46':'#f3e8ff', paddingHorizontal:12, paddingVertical:8, borderRadius:20}}>
        <Feather name="cpu" size={14} color="#9c44dc" />
        <Text style={{color:text, fontSize:12, fontWeight:'600'}}>{activeLabel}{activeModel?` • ${activeModel}`:''} ▾</Text>
      </Pressable>
      <View style={{flex:1}}/>
      <TouchableOpacity testID="btn-send" disabled={isLoading || !inputText} onPress={handleAskToAi} style={{width:36,height:36,borderRadius:18, backgroundColor: isLoading?'#d1d5db':'#9c44dc', alignItems:'center', justifyContent:'center'}}>
        {isLoading ? <ActivityIndicator color="white"/> : <Octicons name="paper-airplane" size={16} color="white"/>}
      </TouchableOpacity>
    </View>
  </View>
</BorderBeam>
```
{% endraw %}

Manter `error` `Text` abaixo.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn --cwd app jest app/__tests__/pages/iapage-borderbeam.test.tsx --no-coverage 2>&1 | tail -n 20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/IAPage.js app/__tests__/pages/iapage-borderbeam.test.tsx
git commit -m "feat(chat): BorderBeam textarea + model select + send"
```

---

### Task 7: QA + docs + final

**Files:**
- Modify: `docs/documentacao/project-status.md` (se necessário)

- [ ] **Step 1: Run QA**

Run: `yarn --cwd app jest --no-coverage 2>&1 | tail -n 20`
Expected: 27 suites PASS (24 +3)
Run: `npm --prefix app run npx --yes expo-doctor 2>&1 | tail -n 20`
Expected: 21/21

- [ ] **Step 2: Manual QA checklist**

- Light/dark: NebulaOrb highlight branco/preto
- Input não sob navigation bar (insets.bottom)
- Teclado não cobre textarea (KeyboardAvoidingView padding)
- Assistant lista `"- item"` renderiza bullet, `**bold**` roxo
- User long text “Ver tudo” expande

- [ ] **Step 3: Commit docs**

```bash
git add docs/documentacao/project-status.md
git commit -m "docs: ia chat nebula+borderbeam QA 27/27 doctor 21/21"
```

---

## Self-Review Checklist

- [ ] Spec coverage: NebulaOrb highlight (task2), BorderBeam textarea+model (task6), SafeArea (task4), Markdown full-width (task5) — all covered
- [ ] Placeholder scan: no TBD
- [ ] Type consistency: `highlightColor string`, `expanded Set<number>`, `insets.bottom number` consistent

---

## Execution Handoff

Plan complete and saved to `docs/documentacao/superpowers/plans/2026-09-15-ia-chat-nebula-borderbeam.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch fresh subagent per task, review between tasks
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
