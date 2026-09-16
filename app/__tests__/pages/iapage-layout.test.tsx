import fs from 'fs';
import path from 'path';

describe('IAPage layout SafeArea + Keyboard + Markdown', () => {
  const candidates = [path.join(__dirname, '../../src/pages/IAPage.tsx'), path.join(__dirname, '../../src/pages/IAPage.js')];
  const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  const src = fs.readFileSync(filePath, 'utf8');

  test('uses useSafeAreaInsets', () => {
    expect(src).toContain('useSafeAreaInsets');
  });

  test('imports react-native-markdown-display', () => {
    expect(src).toContain('react-native-markdown-display');
  });

  test('KeyboardAvoidingView uses insets.top (iOS only)', () => {
    expect(src).toMatch(/keyboardVerticalOffset=\{Platform\.OS.*insets\.top/);
  });

  test('ScrollView contentContainerStyle uses insets.bottom + 120', () => {
    expect(src).toMatch(/paddingBottom:\s*insets\.bottom\s*\+\s*120/);
  });

  test('behavior padding/height', () => {
    expect(src).toMatch(/behavior=\{Platform\.OS\s*===\s*"ios"\s*\?\s*"padding"\s*:\s*"height"\}/);
  });
});

describe('IAPage chat layout mensagens (Task 5)', () => {
  const candidates2 = [path.join(__dirname, '../../src/pages/IAPage.tsx'), path.join(__dirname, '../../src/pages/IAPage.js')];
  const filePath2 = candidates2.find((p) => fs.existsSync(p)) || candidates2[0];
  const src2 = fs.readFileSync(filePath2, 'utf8');

  test('assistant renders Markdown full width', () => {
    expect(src2).toContain('<Markdown');
    expect(src2).toMatch(/width:\s*["']100%["']/);
  });

  test('assistant Markdown strong has purple color', () => {
    expect(src2).toMatch(/strong:\s*\{[^}]*fontWeight:\s*["']700["']/);
    expect(src2).toMatch(/#581C87|#e9d5ff/);
  });

  test('user balloon without limit (sem Ver tudo)', () => {
    expect(src2).toMatch(/maxWidth:\s*["']75%["']/);
    expect(src2).toContain('#a855f7');
    expect(src2).not.toMatch(/numberOfLines=\{expanded/);
    expect(src2).not.toContain('Ver tudo');
  });

  test('mensagem exibe hora e tokens com divider', () => {
    expect(src2).toMatch(/ts.*tokens|tokens.*ts/);
    expect(src2).toMatch(/height:\s*1.*backgroundColor/);
    expect(src2).toMatch(/toLocaleTimeString/);
  });

  test('shimmer soft com texto Pensando', () => {
    expect(src2).toContain('Pensando na sua solicitação');
    expect(src2).toMatch(/duration:\s*2600/);
  });
});
