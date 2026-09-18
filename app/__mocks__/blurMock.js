import React from 'react';
import { View } from 'react-native';
export function BlurView({ children, style, intensity, tint, testID = 'blur-view' }) {
  return <View testID={testID} style={style}>{children}</View>;
}
export default BlurView;
