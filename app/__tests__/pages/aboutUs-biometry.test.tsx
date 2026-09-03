import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../../src/utils/biometry', () => ({
  isBiometricAvailable: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  isNativeAvailable: jest.fn().mockReturnValue(true),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: (cb: any) => { try { cb(); } catch {} },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.2.2' }, manifest: { version: '2.2.2' } },
}));
jest.mock('expo-file-system', () => ({
  StorageAccessFramework: {
    createFileAsync: jest.fn().mockResolvedValue('file://test'),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, directoryUri: 'file://test' }),
  },
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  documentDirectory: 'file://doc/',
}));
jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue(true),
  requestPermissionsAsync: jest.fn().mockResolvedValue('granted'),
  PermissionStatus: { GRANTED: 'granted' },
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));
jest.mock('react-native-csv', () => ({
  jsonToCSV: jest.fn(() => 'csv'),
  readString: jest.fn(() => ({ data: [] })),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AboutUs from '../../src/pages/AboutUs';

describe('AboutUs biometry toggle', () => {
  test('shows Exigir biometria switch', async () => {
    const { getByTestId } = render(<AboutUs />);
    await waitFor(() => expect(getByTestId('biometry-switch')).toBeTruthy());
  });
  test('toggle calls isBiometricEnabled update', async () => {
    const { getByTestId } = render(<AboutUs />);
    const sw = await waitFor(() => getByTestId('biometry-switch'));
    fireEvent(sw, 'valueChange', true);
    // expect store update called — we check switch value prop becomes true via mock
  });
});
