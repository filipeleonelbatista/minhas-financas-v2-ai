import fs from 'fs';
import path from 'path';

describe('AIProviders - alertas custom ao salvar/remover', () => {
  const candidates = [path.join(__dirname, '../../src/pages/AIProviders.tsx'), path.join(__dirname, '../../src/pages/AIProviders.js')];
  const filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  const src = fs.readFileSync(filePath, 'utf8');

  test('importa SolidAlert e ThemedAlert e não usa Alert.alert', () => {
    expect(src).toContain("from '../components/ui/SolidAlert'");
    expect(src).toContain("from '../components/ui/ThemedAlert'");
    expect(src).not.toMatch(/Alert\.alert/);
    expect(src).not.toMatch(/from\s*['"]react-native['"].*Alert/);
  });

  test('handleSaveProvider usa saveAlert com danger e success', () => {
    expect(src).toContain('saveAlert');
    expect(src).toContain("setSaveAlert({ variant: 'danger'");
    expect(src).toContain("setSaveAlert({ variant: 'success'");
    expect(src).toContain('Preencha a chave e selecione um modelo');
    expect(src).toMatch(/handleSaveProvider[\s\S]*?saveProviderKey/);
  });

  test('SolidAlert renderizado na lista e dentro do modal', () => {
    expect(src).toContain('testID="ai-provider-alert"');
    expect(src).toContain('testID="ai-provider-modal-alert"');
    expect(src).toMatch(/<SolidAlert[\s\S]*?variant=\{saveAlert\.variant\}/);
  });

  test('handleDeleteProvider usa ThemedAlert com deleteTarget', () => {
    expect(src).toContain('deleteTarget');
    expect(src).toContain('setDeleteTarget');
    expect(src).toContain('confirmDeleteProvider');
    expect(src).toContain('testID="confirm-delete-provider"');
    expect(src).toContain('confirm-delete-provider-confirm');
    expect(src).toContain('confirm-delete-provider-cancel');
  });

  test('ThemedAlert danger para remover provedor', () => {
    expect(src).toMatch(/ThemedAlert[\s\S]*?variant="danger"/);
    expect(src).toMatch(/title="Remover provedor"/);
    expect(src).toMatch(/confirmText="Remover"/);
  });

  test('feedback de remoção usa SolidAlert success/danger', () => {
    expect(src).toContain("removido");
    expect(src).toMatch(/confirmDeleteProvider[\s\S]*?setSaveAlert/);
  });
});
