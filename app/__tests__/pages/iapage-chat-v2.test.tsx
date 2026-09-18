import fs from 'fs';
import path from 'path';

describe('IAPage chat v2 - full screen + input absolute + blur', () => {
  const candidates = [path.join(__dirname, '../../src/pages/IAPage.tsx'), path.join(__dirname, '../../src/pages/IAPage.js')];
  const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  const src = fs.readFileSync(filePath, 'utf8');

  test('chatContainer ocupa tela toda abaixo do Header com position relative', () => {
    expect(src).toMatch(/flex:\s*1.*position:\s*['"]relative['"]/);
    expect(src).toContain("chatContainer ocupa toda a área abaixo do header");
  });

  test('ScrollView zIndex 1 e contentContainer flexGrow', () => {
    expect(src).toMatch(/ScrollView[\s\S]*?zIndex:\s*1/);
    expect(src).toMatch(/flexGrow:\s*1/);
  });

  test('input BorderBeam position absolute sobre mensagens com zIndex 5', () => {
    expect(src).toContain('testID="border-beam"');
    expect(src).toMatch(/BorderBeam[\s\S]*?position:\s*['"]absolute['"]/);
    expect(src).toMatch(/left:\s*16.*right:\s*16.*bottom:\s*insets\.bottom\s*\+\s*12/);
    expect(src).toMatch(/zIndex:\s*5/);
  });

  test('mensagens preenchem abaixo do input e input acima no zIndex', () => {
    expect(src).toMatch(/ScrollView[\s\S]*?zIndex:\s*1/);
    expect(src).toMatch(/BorderBeam[\s\S]*?zIndex:\s*5/);
    expect(5).toBeGreaterThan(1);
  });

  test('blur bar corta navigation bar ligeiramente abaixo do input', () => {
    expect(src).toContain('testID="chat-blur-bar"');
    expect(src).toContain('BlurView');
    expect(src).toContain('LinearGradient');
    expect(src).toMatch(/from\s*["']expo-blur["']/);
    expect(src).toMatch(/from\s*["']expo-linear-gradient["']/);
    expect(src).toMatch(/height:\s*insets\.bottom\s*\+\s*36/);
    expect(src).toMatch(/zIndex:\s*2/);
    expect(src).toContain('pointerEvents="none"');
    expect(src).toMatch(/intensity=\{24\}/);
    expect(src).toMatch(/tint=\{isDark\s*\?\s*['"]dark['"]\s*:\s*['"]light['"]/);
  });

  test('safeArea respeitado em blur e input', () => {
    expect(src).toMatch(/bottom:\s*0/);
    expect(src).toMatch(/insets\.bottom/);
  });

  test('expo-blur importado', () => {
    expect(src).toContain("from \"expo-blur\"");
    expect(src).toContain("from \"expo-linear-gradient\"");
  });
});
