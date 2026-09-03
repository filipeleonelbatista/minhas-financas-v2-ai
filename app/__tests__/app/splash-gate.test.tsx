import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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
  const fn = jest.fn((selector) => (typeof selector === 'function' ? selector(state) : state));
  fn.getState = () => state;
  return { useSettingsStore: fn };
});
jest.mock('../../src/stores/finance', () => ({ useFinanceStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/runs', () => ({ useRunsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/market', () => ({ useMarketStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/lists', () => ({ useListsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('../../src/stores/goals', () => ({ useGoalsStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));
import * as SplashScreen from 'expo-splash-screen';
describe('splash gate', () => {
  test('preventAutoHide called and hide after loads', async () => {
    const App = require('../../App').default;
    render(<App />);
    await waitFor(() => expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled());
    await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  });
});
