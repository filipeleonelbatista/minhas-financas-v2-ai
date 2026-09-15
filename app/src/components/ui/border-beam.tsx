import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';

export interface BorderBeamProps {
  children?: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  colors?: string[];
  duration?: number;
  glow?: number;
  intensity?: number;
  ambient?: number;
  beamLength?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Minimal functional BorderBeam fallback.
 * Wraps children with beam style, props borderRadius, borderWidth, colors, duration, glow, style, testID.
 * When Skia/Reanimated available, could animate border, but fallback renders styled View.
 */
export function BorderBeam({
  children,
  borderRadius = 16,
  borderWidth = 1,
  colors = ['#9c44dc', '#581C87', '#9c44dc'],
  duration = 3,
  glow = 6,
  intensity,
  ambient,
  beamLength,
  style,
  testID = 'border-beam',
}: BorderBeamProps) {
  // Attempt Skia rendering if available, fallback to View
  // For now minimal: bordered View with glow shadow
  const color = colors && colors[0] ? colors[0] : '#9c44dc';
  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius,
          borderWidth,
          borderColor: color,
          overflow: 'hidden',
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: glow ?? 6,
          elevation: glow ?? 6,
        } as ViewStyle,
        style,
      ]}
    >
      <View style={{ borderRadius: Math.max(0, borderRadius - (borderWidth ?? 0)), overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

export default BorderBeam;

// Re-export config for compatibility if needed
export const CONF = {
  DEFAULT_BORDER_RADIUS: 16,
  DEFAULT_BORDER_WIDTH: 1,
  DEFAULT_DURATION: 3,
  DEFAULT_GLOW: 6,
};
