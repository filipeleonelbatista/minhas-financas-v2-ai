import React, { memo, useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";

const SHADER_SOURCE = `
uniform vec2 iResolution;
uniform float iTime;
uniform float borderWidth;
uniform float borderRadius;
uniform float speed;
uniform vec3 baseColor;
uniform vec3 glowColor;

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 pos = fragCoord;
  vec2 size = iResolution;
  float bw = borderWidth;
  float br = borderRadius;
  float time = iTime * 0.001 * speed * 0.5;
  vec2 center = size * 0.5;
  float angle = atan(pos.y - center.y, pos.x - center.x) + time * 2.0;
  float glow = 0.5 + 0.5 * sin(angle * 3.0 + time * 2.0);
  vec3 color = mix(baseColor, glowColor, glow);
  // border mask: distance to rounded rect
  float dist = length(max(abs(pos - center) - (size * 0.5 - vec2(br)), 0.0)) - br;
  float border = smoothstep(bw, 0.0, abs(dist));
  // inner rounded rect
  float innerDist = length(max(abs(pos - center) - (size * 0.5 - vec2(bw)), 0.0)) - (br - bw);
  float inside = step(innerDist, 0.0);
  float alpha = border * (1.0 - inside * 0.3);
  return vec4(color * alpha, alpha);
}
`;

const LIQUID_METAL_BORDER_SHADER = Skia.RuntimeEffect.Make(SHADER_SOURCE) as any;

function hexToRgb(hex: string): number[] {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return [(bigint >> 16 & 255)/255, (bigint >> 8 & 255)/255, (bigint & 255)/255];
}

export type ChromaRingProps = {
  width?: number;
  height?: number;
  borderRadius?: number;
  borderWidth?: number;
  speed?: number;
  base?: string;
  glow?: string;
  background?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export const ChromaRing: React.FC<ChromaRingProps> = memo(({
  width = 220,
  height = 52,
  borderRadius: customBorderRadius,
  borderWidth = 2,
  speed = 1.0,
  base = "#581C87",
  glow = "#9c44dc",
  background = "#9c44dc",
  children,
  style,
}) => {
  const borderRadius = customBorderRadius ?? height / 2;
  const baseColorRgb = hexToRgb(base) as any;
  const glowColorRgb = hexToRgb(glow) as any;
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(withTiming(Math.PI * 200, { duration: 200000, easing: Easing.linear }), -1, false);
  }, [time]);

  const uniforms = useDerivedValue(() => ({
    iResolution: [width, height],
    iTime: time.value,
    borderWidth,
    borderRadius,
    speed,
    baseColor: baseColorRgb,
    glowColor: glowColorRgb,
  }));

  // Fallback if Skia shader failed to compile
  if (!LIQUID_METAL_BORDER_SHADER) {
    return (
      <View style={[{ width, height, borderRadius, backgroundColor: background, alignItems:'center', justifyContent:'center', overflow:'hidden' }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Canvas style={[StyleSheet.absoluteFill, { borderRadius }] as any}>
        <Fill>
          <Shader source={LIQUID_METAL_BORDER_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>
      <View style={[styles.innerBackground, { backgroundColor: background, borderRadius: Math.max(0, borderRadius - borderWidth), margin: borderWidth }]} />
      <View style={[styles.contentContainer, { borderRadius }]}>
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  innerBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  contentContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
});

export default ChromaRing;
