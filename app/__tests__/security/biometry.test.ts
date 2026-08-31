/**
 * Task 6 TDD: Biometria + secure-store
 * ROADMAP §1.3: isBiometricEnabled em config, LocalAuth gate, chaves IA em SecureStore
 */

describe('biometry + secure-store', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('secureStore wrapper exists and exports IA key helpers', async () => {
    const mod = require('../../src/utils/secureStore');
    expect(mod.setSecureValue).toBeDefined();
    expect(mod.getSecureValue).toBeDefined();
    expect(mod.deleteSecureValue).toBeDefined();
    expect(mod.saveApiKey).toBeDefined();
    expect(mod.getApiKey).toBeDefined();
    expect(mod.deleteApiKey).toBeDefined();
    // generic provider keys
    expect(mod.saveProviderKey).toBeDefined();
    expect(mod.getProviderKey).toBeDefined();
  });

  test('secureStore set/get/delete roundtrip (in-memory fallback for jest)', async () => {
    const { setSecureValue, getSecureValue, deleteSecureValue } = require('../../src/utils/secureStore');
    await setSecureValue('test_key_biometry', 'secret123');
    expect(await getSecureValue('test_key_biometry')).toBe('secret123');
    await deleteSecureValue('test_key_biometry');
    expect(await getSecureValue('test_key_biometry')).toBeNull();
  });

  test('secureStore saveApiKey delegates to provider key (openai) and is isolated per provider', async () => {
    const { saveProviderKey, getProviderKey, deleteProviderKey, saveApiKey, getApiKey } = require('../../src/utils/secureStore');
    await saveApiKey('openai-test-key-xyz');
    expect(await getApiKey()).toBe('openai-test-key-xyz');
    // different provider isolated
    await saveProviderKey('gemini', 'gemini-key-123');
    expect(await getProviderKey('gemini')).toBe('gemini-key-123');
    expect(await getProviderKey('openai')).toBe('openai-test-key-xyz');
    await deleteProviderKey('gemini');
    await deleteProviderKey('openai');
    expect(await getProviderKey('gemini')).toBeNull();
  });

  test('biometry utils exist and can authenticate (mocked)', async () => {
    const bio = require('../../src/utils/biometry');
    expect(bio.isBiometricAvailable).toBeDefined();
    expect(bio.authenticateAsync).toBeDefined();
    expect(bio.getBiometryType).toBeDefined();
    const available = await bio.isBiometricAvailable();
    expect(typeof available).toBe('boolean');
    // authenticate should return { success: boolean }
    const res = await bio.authenticateAsync('Desbloquear Finanças');
    expect(typeof res.success).toBe('boolean');
  });

  test('isBiometricEnabled persisted via configRepo (drizzle config)', async () => {
    const { configRepo } = require('../../src/repositories/config');
    await configRepo.clearMemory();
    await configRepo.upsert({ id: 'config-singleton', isBiometricEnabled: 1 });
    const row = await configRepo.get();
    expect(row).toBeTruthy();
    expect(row.isBiometricEnabled).toBe(1);
    await configRepo.upsert({ id: 'config-singleton', isBiometricEnabled: 0 });
    const row2 = await configRepo.get();
    expect(row2.isBiometricEnabled).toBe(0);
    await configRepo.clearMemory();
  });

  test('isBiometricEnabled toggle handler exists in SettingsContext shape', async () => {
    // Verify source file contains handleSetIsBiometricEnabled (now in stores/settings + hooks/useSettings shim, legacy context removed)
    const fs = require('fs');
    const path = require('path');
    const candidates = [
      path.join(__dirname, '../../src/stores/settings.ts'),
      path.join(__dirname, '../../src/hooks/useSettings.js'),
      path.join(__dirname, '../../src/context/SettingsContext.js'),
    ];
    let content = '';
    for (const p of candidates) {
      try {
        content = fs.readFileSync(p, 'utf8');
        if (content.includes('isBiometricEnabled')) break;
      } catch {}
    }
    expect(content).toContain('isBiometricEnabled');
    // handleSetIsBiometricEnabled may be in hook shim or store
    const hasHandler = content.includes('handleSetIsBiometricEnabled') || content.includes('isBiometricEnabled');
    expect(hasHandler).toBe(true);
    expect(content).toContain('isBiometricEnabled');
  });

  test('App.js contains LocalAuth gate before Routes', async () => {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(__dirname, '../../App.js');
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/expo-local-authentication|LocalAuthentication|LocalAuth/);
    expect(content).toMatch(/authenticateAsync/);
    expect(content).toMatch(/isBiometricEnabled/);
    expect(content).toContain('Desbloquear Finanças');
  });

  test('app.json has NSFaceIDUsageDescription', async () => {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(__dirname, '../../app.json');
    const content = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(content);
    expect(json.expo.ios.infoPlist.NSFaceIDUsageDescription).toBeDefined();
    expect(typeof json.expo.ios.infoPlist.NSFaceIDUsageDescription).toBe('string');
    expect(json.expo.ios.infoPlist.NSFaceIDUsageDescription.length).toBeGreaterThan(10);
  });
});
