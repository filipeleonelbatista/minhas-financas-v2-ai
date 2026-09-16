import React from 'react';
import { View } from 'react-native';
export function BorderBeam({ children, testID = 'border-beam', style }) {
  return <View testID={testID} style={style}>{children}</View>;
}
export default BorderBeam;
