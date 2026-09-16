import React, { useEffect } from 'react';
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
  const [opacityAnim] = React.useState(() => {
    try { const { Animated } = require('react-native'); return new Animated.Value(0.6); } catch { return { interpolate: () => 0.6 } as any; }
  });
  useEffect(() => {
    try {
      const { Animated, Easing } = require('react-native');
      Animated.loop(Animated.sequence([Animated.timing(opacityAnim as any, { toValue: 1, duration: shimmerConfig?.duration ?? 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(opacityAnim as any, { toValue: 0.6, duration: shimmerConfig?.duration ?? 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])).start();
    } catch {}
  }, [shimmerConfig?.duration]);
  let AnimatedText: any = Text;
  try { const { Animated } = require('react-native'); AnimatedText = Animated.Text ?? Text; } catch {}
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle, style]}>
      <AnimatedText style={[{ color: textColor, fontSize: 14, fontWeight: '600' }, textStyle, { opacity: opacityAnim as any }]}>{text}</AnimatedText>
    </View>
  );
}

export default ShimmerWaveText;
