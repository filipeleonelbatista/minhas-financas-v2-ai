describe('SAF iOS fallback', () => {
  test('AboutUs export uses SAF only on android', async () => {
    const fs = require('fs');
    const path = require('path');
    const candidates = ['app/src/pages/AboutUs.tsx', 'app/src/pages/AboutUs.js', 'src/pages/AboutUs.tsx', 'src/pages/AboutUs.js', path.join(__dirname, '../../src/pages/AboutUs.tsx'), path.join(__dirname, '../../src/pages/AboutUs.js')];
    const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("Platform.OS === 'android'");
    expect(content).toContain('documentDirectory');
  });
  test('Onboarding SAF branch', () => {
    const fs = require('fs');
    const path = require('path');
    const candidates = ['app/src/pages/Onboarding.tsx', 'app/src/pages/Onboarding.js', 'src/pages/Onboarding.tsx', 'src/pages/Onboarding.js', path.join(__dirname, '../../src/pages/Onboarding.tsx'), path.join(__dirname, '../../src/pages/Onboarding.js')];
    const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("Platform.OS");
  });
});
