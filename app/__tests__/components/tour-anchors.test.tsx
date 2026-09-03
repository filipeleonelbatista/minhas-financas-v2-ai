import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-walkthrough-tooltip', () => {
  const ReactMod = require('react');
  const { View: RNView } = require('react-native');
  const MockTooltip = ({ isVisible, content, children, testID }: any) =>
    ReactMod.createElement(RNView, { testID: testID ?? 'tooltip-mock' }, children, isVisible ? ReactMod.createElement(RNView, { testID: 'tooltip-content-mock' }, content) : null);
  return { __esModule: true, default: MockTooltip, Tooltip: MockTooltip };
});
jest.mock('../../src/repositories/config', () => {
  let mem: any = {};
  return {
    configRepo: {
      get: jest.fn(async () => (Object.keys(mem).length ? mem : null)),
      upsert: jest.fn(async (dto: any) => { mem = { ...mem, ...dto }; return dto; }),
    },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => mockReact.createElement(mockRN.View, null, children),
    SafeAreaView: ({ children }: any) => mockReact.createElement(mockRN.View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('../../src/hooks/useIsKeyboardOpen', () => ({
  useIsKeyboardOpen: () => false,
}));
jest.mock('../../src/components/nativewindui/Sheet', () => {
  const mockReact2 = require('react');
  const mockRN2 = require('react-native');
  const MockSheet = mockReact2.forwardRef((props: any, ref: any) => {
    mockReact2.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn(), close: jest.fn() }));
    return mockReact2.createElement(mockRN2.View, { testID: 'mock-sheet' }, props.children);
  });
  return {
    Sheet: MockSheet,
    useSheetRef: () => ({ current: { present: jest.fn(), dismiss: jest.fn() } }),
  };
});

import AddButton from '../../src/components/AddButtton';
import { TOUR_STEPS } from '../../src/components/Tour';

describe('tour anchors', () => {
  test('AddButton has anchor testID', () => {
    const { getByTestId } = render(<AddButton />);
    expect(getByTestId('add-button-fab')).toBeTruthy();
  });
  test('TOUR_STEPS anchors exist', () => {
    TOUR_STEPS.forEach(s => expect(s.anchorTestID).toBeTruthy());
  });
});
