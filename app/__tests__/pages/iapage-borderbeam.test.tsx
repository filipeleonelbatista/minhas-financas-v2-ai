import React from 'react';
import { render } from '@testing-library/react-native';
jest.mock('@shopify/react-native-skia', () => ({ Canvas: ({children}: any)=> children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: ()=>({top:0,bottom:34,left:0,right:0}) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: ()=>({ navigate: jest.fn(), goBack: jest.fn() }), useIsFocused: ()=> true, useFocusEffect: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Feather: ()=>'Feather', MaterialCommunityIcons: ()=>'MCI', Octicons: ()=>'Oct' }));
jest.mock('react-native-loading-dots', () => ()=>'LoadingDots');
jest.mock('../../src/components/Header', () => ({ __esModule: true, default: ()=>'Header' }));
jest.mock('../../src/components/ui/Orb', () => ({ __esModule: true, default: ()=>'Orb' }));
jest.mock('../../src/hooks/useIsKeyboardOpen', () => ({ useIsKeyboardOpen: ()=> false }));
describe('BorderBeam input', () => {
  test('IAPage renders textarea inside BorderBeam', () => {
    const IAPage = require('../../src/pages/IAPage').default;
    const { getByTestId } = render(<IAPage />);
    expect(getByTestId('input-ask')).toBeTruthy();
  });
});
