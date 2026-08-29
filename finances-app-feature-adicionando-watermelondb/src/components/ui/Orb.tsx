import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

let LinearGradient: any = View;
try {
  // eslint-disable-next-line global-require
  LinearGradient = require('expo-linear-gradient').LinearGradient ?? View;
} catch {
  LinearGradient = ({ children, colors, style, ...rest }: any) => (
    <View style={[{ backgroundColor: (colors && colors[0]) || '#581C87' }, style]} {...rest}>
      {children}
    </View>
  );
}

// Try to load reacticx Orb, fallback to animated gradient sphere
let RacticxOrb: any = null;
try {
  // eslint-disable-next-line global-require
  const reacticx = require('reacticx');
  RacticxOrb = reacticx.Orb ?? reacticx.default?.Orb ?? null;
} catch {
  RacticxOrb = null;
}

// Attempt reanimated for pulse if available
let AnimatedView: any = View;
try {
  // eslint-disable-next-line global-require
  const Reanimated = require('react-native-reanimated');
  AnimatedView = Reanimated.default ? Reanimated.default.View : View;
} catch { AnimatedView = View; }

export interface OrbProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  style?: ViewStyle;
  testID?: string;
  pulse?: boolean;
}

const sizeMap: Record<string, number> = { sm: 48, md: 72, lg: 96, xl: 128 };

function resolveSize(size?: OrbProps['size']): number {
  if (typeof size === 'number') return size;
  if (!size) return sizeMap.lg;
  return sizeMap[size] ?? sizeMap.lg;
}

export default function Orb({ size = 'lg', color = '#9c44dc', style, testID = 'orb', pulse = true }: OrbProps) {
  const dim = resolveSize(size);

  if (RacticxOrb) {
    // Wrap reacticx Orb — preserve its props API
    // reacticx Orb expects size prop as 'sm'|'md'|'lg'|number and color
    try {
      return <RacticxOrb size={size} color={color} style={style} testID={testID} />;
    } catch {
      // fall through to fallback
    }
  }

  // Fallback: gradient sphere with subtle shadow / pulse placeholder
  const Wrapper: any = pulse ? AnimatedView : View;
  return (
    <Wrapper
      testID={testID}
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[color, '#581C87']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <View
          style={{
            width: dim * 0.38,
            height: dim * 0.38,
            borderRadius: (dim * 0.38) / 2,
            backgroundColor: 'rgba(255,255,255,0.22)',
            position: 'absolute',
            top: dim * 0.18,
            left: dim * 0.22,
          }}
        />
        <Text style={{ color: 'white', fontWeight: '700', fontSize: dim * 0.18 }}>IA</Text>
      </LinearGradient>
    </Wrapper>
  );
}

// Named export for convenience
export { Orb };
