import React from "react";
import { View } from "react-native";
import { G, Path, Svg, Rect, Text as SvgText } from "react-native-svg";
import Pie from "paths-js/pie"; // eslint-disable-line @typescript-eslint/no-explicit-any

const DEFAULT_R = 0;

type PieDatumGeneric = {
  name: string;
  population: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
  [key: string]: unknown;
};

type InteractivePieChartProps = {
  data?: PieDatumGeneric[];
  width?: number;
  height?: number;
  accessor?: string;
  backgroundColor?: string;
  paddingLeft?: number;
  selectedIndex?: number | null | undefined;
  onSelect?: (idx: number) => void;
  chartConfig?: Record<string, unknown>;
  style?: Record<string, unknown>;
  center?: [number, number];
  borderRadius?: number;
  testID?: string;
};

export default function InteractivePieChart({
  data = [],
  width,
  height,
  accessor = "population",
  backgroundColor = "transparent",
  paddingLeft = 0,
  selectedIndex = null,
  onSelect,
  chartConfig = {},
  style = {},
  center,
  borderRadius = 0,
  testID,
}: InteractivePieChartProps) {
  if (!data || data.length === 0 || !width || !height) {
    return <View style={{ width, height }} testID={testID} />;
  }

  const R = height / 2.5;

  let chart: any;
  try {
    chart = Pie({
      center: center || [0, 0],
      r: DEFAULT_R,
      R,
      data,
      accessor: (x: any) => (x as any)[accessor],
    });
  } catch {
    return <View style={{ width, height }} testID={testID} />;
  }

  const total = data.reduce((sum, item) => sum + (Number((item as any)[accessor]) || 0), 0);
  const hasSelection = selectedIndex !== null && selectedIndex !== undefined;

  const slices = (chart as any).curves.map((c: any, i: number) => {
    const isSelected = selectedIndex === i;
    const isDimmed = hasSelection && !isSelected;
    const fill = c.item.color || "#9c44dc";
    // destacar: stroke branco + opacidade + leve explosão
    const stroke = isSelected ? "#ffffff" : "transparent";
    const strokeWidth = isSelected ? 3 : 0;
    const opacity = isDimmed ? 0.35 : 1;
    // offset para fatia selecionada (explode)
    const centroid = c.sector.centroid || [0, 0];
    const angle = Math.atan2(centroid[1], centroid[0]);
    const offset = isSelected ? 8 : 0;
    const tx = Math.cos(angle) * offset;
    const ty = Math.sin(angle) * offset;

    return (
      <G key={`slice-${i}`} opacity={opacity} x={tx} y={ty} onPress={() => onSelect && onSelect(i)}>
        <Path
          d={c.sector.path.print()}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onPress={() => onSelect && onSelect(i)}
        />
        {isSelected ? (
          <SvgText
            x={centroid[0]}
            y={centroid[1]}
            fill="white"
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle"
            stroke="#581c87"
            strokeWidth={0.3}
            onPress={() => onSelect && onSelect(i)}
          >
            {String(c.item.name).length > 10 ? String(c.item.name).slice(0, 10) + "…" : c.item.name}
          </SvgText>
        ) : null}
      </G>
    );
  });

  // centro: se paddingLeft=0 (legenda externa) centraliza, senão mantém offset legado para legenda interna
  const gX = paddingLeft ? width / 2 / 2 + Number(paddingLeft) : width / 2;
  const gY = height / 2;

  return (
    <View style={{ width, height, padding: 0, ...style }} testID={testID}>
      <Svg width={width} height={height}>
        <G>
          {/* background rect */}
          <Rect width="100%" height={height} rx={borderRadius} ry={borderRadius} fill={backgroundColor} />
        </G>
        <G x={gX} y={gY}>
          {slices}
        </G>
      </Svg>
    </View>
  );
}
