import React from 'react';
import { TouchableOpacity, Pressable, Text, ViewStyle, TextStyle, View } from 'react-native';

let RacticxCTA: any = null;
try {
  // eslint-disable-next-line global-require
  const m = require('reacticx');
  RacticxCTA = m.CTAButton ?? m.CTA ?? m.default?.CTAButton ?? null;
} catch {
  RacticxCTA = null;
}

let ChromaRing: any = null;
try {
  // eslint-disable-next-line global-require
  ChromaRing = require('./ChromaRing').ChromaRing ?? require('./ChromaRing').default ?? null;
} catch {
  ChromaRing = null;
}
if (!ChromaRing) {
  try {
    // eslint-disable-next-line global-require
    const rx = require('reacticx');
    ChromaRing = rx.ChromaRing ?? rx.default?.ChromaRing ?? null;
  } catch {}
}

export interface CTAProps {
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
  variant?: 'glow' | 'default' | 'chroma';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  width?: number;
  height?: number;
}

export default function CTA({ onPress, children, testID, variant = 'chroma', style, disabled, accessibilityLabel, width = 220, height = 52 }: CTAProps) {
  // reacticx legacy CTAButton compat (if still present)
  if (RacticxCTA && variant !== 'chroma') {
    try {
      return (
        <RacticxCTA testID={testID} variant={variant} onPress={onPress} style={style} disabled={disabled} accessibilityLabel={accessibilityLabel}>
          {children}
        </RacticxCTA>
      );
    } catch {}
  }

  const isChroma = variant === 'chroma' || variant === 'glow';
  if (isChroma && ChromaRing) {
    // Extract width/height from style if provided, else use defaults
    const styleWidth = (style as any)?.width ?? width;
    const styleHeight = (style as any)?.height ?? height;
    const w = typeof styleWidth === 'number' ? styleWidth : width;
    const h = typeof styleHeight === 'number' ? styleHeight : height;
    // Verify Skia availability via try to avoid transparent fallback
    let skiaAvailable = true;
    try {
      const skia = require('@shopify/react-native-skia');
      if (!skia || !skia.Skia || !skia.Canvas) skiaAvailable = false;
    } catch { skiaAvailable = false; }
    if (skiaAvailable) {
      return (
        <Pressable testID={testID} onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}>
          <ChromaRing width={w} height={h} borderWidth={2} speed={1.0} base="#581C87" glow="#9c44dc" background={disabled ? '#6b7280' : '#9c44dc'} style={{ width: w, height: h, borderRadius: h / 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
              {typeof children === 'string' ? (
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>{children}</Text>
              ) : (
                children
              )}
            </View>
          </ChromaRing>
        </Pressable>
      );
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
          backgroundColor: disabled ? '#6b7280' : '#9c44dc',
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
