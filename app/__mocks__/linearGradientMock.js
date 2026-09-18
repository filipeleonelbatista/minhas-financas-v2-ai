import React from 'react';
import { View } from 'react-native';
export function LinearGradient({ children, style, colors }) {
  return <View testID="linear-gradient" style={style}>{children}</View>;
}
export default LinearGradient;
