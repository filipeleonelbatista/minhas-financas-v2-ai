describe('secureStore migration', () => {
  test('no openai 3 Configuration import', () => {
    const fs = require('fs');
    const path = require('path');
    const candidates = ['app/package.json', 'package.json', path.join(__dirname, '../../package.json')];
    const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);
    expect(pkg.dependencies['openai']).not.toBe('^3.3.0');
    expect(pkg.dependencies['openai']).not.toBe('3.3.0');
    expect(content).not.toContain('Configuration');
  });
  test('AIProviders uses secureStore', () => {
    const fs = require('fs');
    const path = require('path');
    const candidates = ['app/src/pages/AIProviders.js', 'src/pages/AIProviders.js', path.join(__dirname, '../../src/pages/AIProviders.js')];
    const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    const c = fs.readFileSync(filePath, 'utf8');
    expect(c).toContain('getProviderKey');
  });
});
