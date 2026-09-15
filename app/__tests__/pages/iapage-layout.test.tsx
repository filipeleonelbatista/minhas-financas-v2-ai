import fs from 'fs';
import path from 'path';

describe('IAPage layout SafeArea + Keyboard + Markdown', () => {
  const filePath = path.join(__dirname, '../../src/pages/IAPage.js');
  const src = fs.readFileSync(filePath, 'utf8');

  test('uses useSafeAreaInsets', () => {
    expect(src).toContain('useSafeAreaInsets');
  });

  test('imports react-native-markdown-display', () => {
    expect(src).toContain('react-native-markdown-display');
  });

  test('KeyboardAvoidingView uses insets.top + 56', () => {
    expect(src).toMatch(/keyboardVerticalOffset=\{insets\.top\s*\+\s*56\}/);
  });

  test('ScrollView contentContainerStyle uses insets.bottom + 120', () => {
    expect(src).toMatch(/paddingBottom:\s*insets\.bottom\s*\+\s*120/);
  });

  test('behavior padding/height', () => {
    expect(src).toMatch(/behavior=\{Platform\.OS\s*===\s*"ios"\s*\?\s*"padding"\s*:\s*"height"\}/);
  });
});

describe('IAPage chat layout mensagens (Task 5)', () => {
  const filePath2 = path.join(__dirname, '../../src/pages/IAPage.js');
  const src2 = fs.readFileSync(filePath2, 'utf8');

  test('assistant renders Markdown full width', () => {
    expect(src2).toContain('<Markdown');
    expect(src2).toMatch(/width:\s*["']100%["']/);
  });

  test('assistant Markdown strong has purple color', () => {
    expect(src2).toMatch(/strong:\s*\{[^}]*fontWeight:\s*["']700["']/);
    expect(src2).toMatch(/#581C87|#e9d5ff/);
  });

  test('user balloon collapsed with Ver tudo toggle', () => {
    expect(src2).toContain('Ver tudo');
    expect(src2).toContain('Ver menos');
    expect(src2).toMatch(/maxWidth:\s*["']75%["']/);
    expect(src2).toMatch(/numberOfLines/);
    expect(src2).toMatch(/expanded\.has/);
  });

  test('expanded is Set state', () => {
    expect(src2).toMatch(/useState\(new Set\(\)\)/);
    expect(src2).toContain('setExpanded');
  });

  test('user balloon bg #a855f7 and toggle length >120', () => {
    expect(src2).toContain('#a855f7');
    expect(src2).toMatch(/m\.text\.length\s*>\s*120/);
  });
});
