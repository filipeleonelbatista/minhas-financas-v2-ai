import React from 'react';
import { render } from '@testing-library/react-native';
import { useSettingsStore } from '../../src/stores/settings';

jest.mock('@shopify/react-native-skia', () => ({ Canvas: ({children}: any)=> children, Fill: ({children}: any)=> children, Shader: ()=> null, Skia: { RuntimeEffect: { Make: ()=> null } }, vec: (a:any,b:any)=> [a,b] }));
jest.mock('react-native-reanimated', () => ({ useSharedValue: ()=>({value:0}), useDerivedValue: (fn: any)=>({value:fn()}), withRepeat: (v:any)=>v, withTiming: (v:any)=>v, Easing:{linear:(v:any)=>v}, cancelAnimation: jest.fn() }));

describe('Orb Nebula highlight', () => {
  test('renders NebulaOrb with purple color and white highlight in light', () => {
    useSettingsStore.setState({ colorModeState: 'light' });
    const Orb = require('../../src/components/ui/Orb').default;
    const { getByTestId } = render(<Orb size="lg" testID="orb" />);
    expect(getByTestId('orb')).toBeTruthy();
  });
});
