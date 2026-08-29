import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';

let RacticxCTA: any = null;
try {
  // eslint-disable-next-line global-require
  const m = require('reacticx');
  RacticxCTA = m.CTAButton ?? m.CTA ?? m.default?.CTAButton ?? null;
} catch {
  RacticxCTA = null;
}

export interface CTAProps {
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
  variant?: 'glow' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export default function CTA({ onPress, children, testID, variant = 'glow', style, disabled, accessibilityLabel }: CTAProps) {
  if (RacticxCTA) {
    try {
      return (
        <RacticxCTA testID={testID} variant={variant} onPress={onPress} style={style} disabled={disabled} accessibilityLabel={accessibilityLabel}>
          {children}
        </RacticxCTA>
      );
    } catch {
      // fall through
    }
  }
  const isGlow = variant === 'glow';
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={isGlow ? 'bg-purple-600 active:bg-purple-900 rounded-full items-center justify-center' : 'bg-purple-600 rounded-full items-center justify-center'}
      style={[
        {
          backgroundColor: '#9c44dc',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: isGlow ? '#581C87' : undefined,
          shadowOpacity: isGlow ? 0.3 : 0,
          shadowRadius: isGlow ? 12 : 0,
          elevation: isGlow ? 4 : 0,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text className="text-white font-bold text-base" style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export { CTA };
