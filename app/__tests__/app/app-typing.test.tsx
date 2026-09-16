import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@expo/vector-icons', () => ({
  Feather: () => null,
  MaterialCommunityIcons: () => null,
  FontAwesome: () => null,
  Fontisto: () => null,
  Ionicons: () => null,
  Octicons: () => null,
}), { virtual: true });
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo-google-fonts/poppins', () => ({
  Poppins_400Regular: 'Poppins_400Regular',
  Poppins_600SemiBold: 'Poppins_600SemiBold',
  useFonts: () => [true],
}));
jest.mock('react-native-gesture-handler', () => {
  const ReactMod = require('react');
  const { View } = require('react-native');
  return { GestureHandlerRootView: ({ children, onLayout, style }: any) => { if (onLayout) setTimeout(() => onLayout(), 0); return ReactMod.createElement(View, { style, testID: 'gesture-root', onLayout }, children); } };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactMod = require('react');
  const { View } = require('react-native');
  return { SafeAreaProvider: ({ children }: any) => ReactMod.createElement(View, null, children), SafeAreaView: ({ children }: any) => ReactMod.createElement(View, null, children) };
});
jest.mock('../../src/routes', () => ({
  __esModule: true,
  default: () => { const ReactMod = require('react'); const { View, Text } = require('react-native'); return ReactMod.createElement(View, { testID: 'routes-mock' }, ReactMod.createElement(Text, null, 'Routes')); },
}));
jest.mock('../../src/components/Loading', () => ({
  __esModule: true,
  default: () => { const ReactMod = require('react'); const { View, Text } = require('react-native'); return ReactMod.createElement(View, { testID: 'loading-mock' }, ReactMod.createElement(Text, null, 'Loading')); },
}));
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('../../src/stores/settings', () => {
  const mockLoad = jest.fn().mockResolvedValue(undefined);
  const state = { load: mockLoad, isBiometricEnabled: 0, colorModeState: 'light' };
  const fn: any = jest.fn((selector: any) => (typeof selector === 'function' ? selector(state) : state));
  fn.getState = () => state;
  return { useSettingsStore: fn };
});
jest.mock('../../src/stores/finance', () => ({ useFinanceStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/runs', () => ({ useRunsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/market', () => ({ useMarketStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/lists', () => ({ useListsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/goals', () => ({ useGoalsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));

describe('App.tsx typing (Task 3)', () => {
  test('App is TS and exports default function', async () => {
    const App = require('../../App').default;
    expect(typeof App).toBe('function');
  });

  test('App.tsx exists and App.js removed (TS migration)', () => {
    const appTsx = path.resolve(__dirname, '../../App.tsx');
    const appJs = path.resolve(__dirname, '../../App.js');
    expect(fs.existsSync(appTsx)).toBe(true);
    expect(fs.existsSync(appJs)).toBe(false);
  });

  test('useSettingsStore is typed with SettingsState', () => {
    const fs2 = require('fs');
    const p = require('path');
    const appPath = p.resolve(__dirname, '../../App.tsx');
    // if App.tsx not yet exists, fallback to App.js for error message
    const content = fs2.existsSync(appPath)
      ? fs2.readFileSync(appPath, 'utf8')
      : fs2.readFileSync(p.resolve(__dirname, '../../App.js'), 'utf8');
    // must have SettingsState typing and biometricLocked typed boolean | null
    expect(content).toMatch(/SettingsState/);
    expect(content).toMatch(/biometricLocked/);
    // must keep runMigrations and SplashScreen logic
    expect(content).toMatch(/runMigrations/);
    expect(content).toMatch(/SplashScreen/);
  });
});
