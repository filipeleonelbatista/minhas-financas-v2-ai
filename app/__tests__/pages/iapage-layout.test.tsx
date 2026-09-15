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
