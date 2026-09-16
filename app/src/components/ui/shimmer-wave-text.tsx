import React, { useEffect, useRef } from 'react';
import { Text, View, Animated, Easing, StyleProp, ViewStyle, TextStyle } from 'react-native';

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
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: shimmerConfig?.duration ?? 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.3, duration: shimmerConfig?.duration ?? 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerConfig?.duration]);
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle, style]}>
      <Animated.Text style={[{ color: textColor, fontSize: 14, fontWeight: '600' }, textStyle, { opacity: opacityAnim }]}>{text}</Animated.Text>
    </View>
  );
}

export default ShimmerWaveText;
