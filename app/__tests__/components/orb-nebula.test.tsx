import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useSettingsStore } from '../../src/stores/settings';

jest.mock('@shopify/react-native-skia', () => ({ Canvas: ({children}: any)=> children, Fill: ({children}: any)=> children, Shader: ()=> null, Skia: { RuntimeEffect: { Make: ()=> null } }, vec: (a:any,b:any)=> [a,b] }));
jest.mock('react-native-reanimated', () => ({ useSharedValue: ()=>({value:0}), useDerivedValue: (fn: any)=>({value:fn()}), withRepeat: (v:any)=>v, withTiming: (v:any)=>v, Easing:{linear:(v:any)=>v}, cancelAnimation: jest.fn() }));
jest.mock('../../src/components/ui/nebula-orb');

describe('Orb Nebula highlight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders NebulaOrb with purple color and white highlight in light', () => {
    useSettingsStore.setState({ colorModeState: 'light' });
    const Orb = require('../../src/components/ui/Orb').default;
    const { NebulaOrb } = require('../../src/components/ui/nebula-orb');
    const { getByTestId } = render(<Orb size="lg" color="#9c44dc" testID="orb" />);
    expect(getByTestId('orb')).toBeTruthy();
    expect(NebulaOrb).toHaveBeenCalled();
    const last = NebulaOrb.mock.calls[NebulaOrb.mock.calls.length - 1][0];
    expect(last.highlightColor).toBe('#ffffff');
    expect(last.color).toBe('#9c44dc');
  });

  test('dark highlight black, light white', () => {
    useSettingsStore.setState({ colorModeState: 'dark' });
    const Orb = require('../../src/components/ui/Orb').default;
    const { NebulaOrb } = require('../../src/components/ui/nebula-orb');
    const { getByTestId, rerender } = render(<Orb size="lg" color="#9c44dc" testID="orb" />);
    expect(getByTestId('orb')).toBeTruthy();
    let last = NebulaOrb.mock.calls[NebulaOrb.mock.calls.length - 1][0];
    expect(last.highlightColor).toBe('#000000');

    act(() => {
      useSettingsStore.setState({ colorModeState: 'light' });
    });
    rerender(<Orb size="lg" color="#9c44dc" testID="orb" />);
    expect(getByTestId('orb')).toBeTruthy();
    last = NebulaOrb.mock.calls[NebulaOrb.mock.calls.length - 1][0];
    expect(last.highlightColor).toBe('#ffffff');
  });
});
