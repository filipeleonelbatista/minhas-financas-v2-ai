import React, { useEffect, useMemo } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import type { INebulaOrb } from './types';

// Fallback types if not imported correctly
export interface NebulaOrbProps {
  size?: number;
  color?: string;
  highlightColor?: string;
  speed?: number;
  turbulence?: number;
  detail?: number;
  contrast?: number;
  edgeSoftness?: number;
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_SIZE = 96;
const DEFAULT_COLOR = '#9c44dc';
const DEFAULT_HIGHLIGHT_COLOR = '#ffffff';
const DEFAULT_SPEED = 0.55;
const DEFAULT_TURBULENCE = 1.6;
const DEFAULT_DETAIL = 1.15;
const DEFAULT_CONTRAST = 1.05;
const DEFAULT_EDGE_SOFTNESS = 0.12;
const FALLBACK_FRAME_MS = 16;

function toRgb<T extends string>(color: T): [number, number, number] {
  try {
    const { Skia } = require('@shopify/react-native-skia');
    const c = Skia.Color(color) as any;
    return [c[0], c[1], c[2]];
  } catch {
    // hex fallback
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [0.61, 0.27, 0.86];
    return [r, g, b];
  }
}

const NEBULA_ORB_SHADER = `
uniform float2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uTurbulence;
uniform float uContrast;
uniform float3 uColor;
uniform float3 uHighlight;
uniform float uEdgeSoftness;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1,311.7))) * 43758.5453123); }
float noise(float2 p){
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f*f*(3.0-2.0*f);
  float a = hash(i);
  float b = hash(i + float2(1.0,0.0));
  float c = hash(i + float2(0.0,1.0));
  float d = hash(i + float2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(float2 p){
  float v=0.0; float a=0.6; float2 q=p;
  for(int i=0;i<3;i++){ v+= a*noise(q); q*=2.0; a*=0.5; }
  return v;
}
half4 main(float2 fragCoord){
  float2 uv = fragCoord / uResolution;
  float2 guv = float2(uv.x, 1.0 - uv.y);
  float t = uTime * 0.22;
  float2 drift = float2(sin(t) + 0.6 * sin(t * 1.7 + 1.3), cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1));
  float2 p = float2(guv.x * 1.8, guv.y) * uScale + drift * 0.7;
  float2 q = float2(fbm(p + drift), fbm(p + float2(3.2, 1.5) - drift));
  float f = fbm(p + uTurbulence * q);
  float g = clamp(1.0 - guv.y, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, guv.y);
  float shade = clamp(g + (f - 0.5) * uContrast * anchor, 0.0, 1.0);
  float3 light = mix(uHighlight, uColor, 0.5);
  float3 col = uHighlight;
  col = mix(col, light, smoothstep(0.28, 0.52, shade));
  col = mix(col, uColor, smoothstep(0.58, 0.88, shade));
  float edge = smoothstep(0.5, 0.5 - uEdgeSoftness, distance(uv, float2(0.5)));
  return half4(half3(col) * half(edge), half(edge));
}
`;

export function NebulaOrb({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  highlightColor = DEFAULT_HIGHLIGHT_COLOR,
  speed = DEFAULT_SPEED,
  turbulence = DEFAULT_TURBULENCE,
  detail = DEFAULT_DETAIL,
  contrast = DEFAULT_CONTRAST,
  edgeSoftness = DEFAULT_EDGE_SOFTNESS,
  paused = false,
  style,
  testID = 'orb',
}: NebulaOrbProps) {
  // Try Skia rendering, fallback to gradient View if Skia not available or fails
  let SkiaCanvas: any = null;
  let SkiaFill: any = null;
  let SkiaShader: any = null;
  let SkiaRuntime: any = null;
  let skiaAvailable = false;
  try {
    const SkiaMod = require('@shopify/react-native-skia');
    SkiaCanvas = SkiaMod.Canvas;
    SkiaFill = SkiaMod.Fill;
    SkiaShader = SkiaMod.Shader;
    SkiaRuntime = SkiaMod.Skia?.RuntimeEffect;
    skiaAvailable = !!(SkiaCanvas && SkiaShader && SkiaRuntime);
  } catch {
    skiaAvailable = false;
  }

  const dim = typeof size === 'number' ? size : DEFAULT_SIZE;
  const colorRgb = useMemo(() => toRgb(color), [color]);
  const highlightRgb = useMemo(() => toRgb(highlightColor), [highlightColor]);

  // Reanimated time driver — slower + smoother (exemplo doc usa 100000/speed, nós usamos 120000 para menos repetitivo)
  const time = useSharedValue(0);
  useEffect(() => {
    if (paused) {
      try { cancelAnimation(time); } catch {}
      time.value = 0;
      return;
    }
    try {
      time.value = withRepeat(withTiming(100, { duration: 120000 / (speed || 0.55), easing: Easing.linear }), -1, false);
    } catch {}
    return () => { try { cancelAnimation(time); } catch {} };
  }, [speed, paused]);

  const uniformsDerived = useDerivedValue(() => ({
    uResolution: [dim, dim],
    uTime: time.value,
    uScale: detail * 2.2,
    uTurbulence: turbulence,
    uContrast: contrast,
    uColor: colorRgb,
    uHighlight: highlightRgb,
    uEdgeSoftness: edgeSoftness,
  }));

  // Try to create runtime effect
  let shaderSource: any = null;
  if (skiaAvailable && SkiaRuntime?.Make) {
    try {
      shaderSource = SkiaRuntime.Make(NEBULA_ORB_SHADER);
    } catch {
      shaderSource = null;
    }
  }

  if (skiaAvailable && shaderSource && SkiaCanvas && SkiaShader && SkiaFill) {
    try {
      // Pass derived value directly to Skia Shader for continuous animation (avoids reading .value during render)
      return (
        <View testID={testID} style={[{ width: dim, height: dim, borderRadius: dim / 2, overflow: 'hidden' }, style]}>
          <SkiaCanvas style={{ width: dim, height: dim }}>
            <SkiaFill>
              <SkiaShader source={shaderSource} uniforms={uniformsDerived} />
            </SkiaFill>
          </SkiaCanvas>
        </View>
      );
    } catch {
      // fall through to fallback
    }
  }

  // Fallback: gradient sphere (matches Orb.tsx fallback but simplified)
  let LinearGradient: any = View;
  try {
    LinearGradient = require('expo-linear-gradient').LinearGradient ?? View;
  } catch {
    LinearGradient = ({ children, colors, style: s, ...rest }: any) => (
      <View style={[{ backgroundColor: (colors && colors[0]) || color }, s]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View
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
          overflow: 'hidden',
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
            backgroundColor: highlightColor === '#000000' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)',
            position: 'absolute',
            top: dim * 0.18,
            left: dim * 0.22,
          }}
        />
      </LinearGradient>
    </View>
  );
}

export default NebulaOrb;
export { NEBULA_ORB_SHADER, toRgb };
export const CONF = {
  DEFAULT_SIZE,
  DEFAULT_COLOR,
  DEFAULT_CONTRAST,
  DEFAULT_DETAIL,
  DEFAULT_EDGE_SOFTNESS,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_SPEED,
  DEFAULT_TURBULENCE,
  FALLBACK_FRAME_MS,
};
