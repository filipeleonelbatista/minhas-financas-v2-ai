import React from 'react';
import { Text, View, StyleProp, ViewStyle, TextStyle } from 'react-native';

export interface ShimmerWaveTextProps {
  text?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  shimmerConfig?: { duration?: number; width?: number; colors?: string[] };
  floatConfig?: any;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ShimmerWaveText({ text = 'Gerando resposta...', textColor = '#000', textStyle, containerStyle, shimmerConfig, style, testID = 'shimmer-wave' }: ShimmerWaveTextProps) {
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle, style]}>
      <Text style={[{ color: textColor, fontSize: 14, fontWeight: '600' }, textStyle]}>{text}</Text>
    </View>
  );
}

export default ShimmerWaveText;
