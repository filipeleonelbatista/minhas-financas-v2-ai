import React from "react";
import { View } from "react-native";
import { G, Path, Svg, Rect } from "react-native-svg";
import Pie from "paths-js/pie";

const DEFAULT_R = 0;

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
}) {
  if (!data || data.length === 0 || !width || !height) {
    return <View style={{ width, height }} testID={testID} />;
  }

  const R = height / 2.5;

  let chart;
  try {
    chart = Pie({
      center: center || [0, 0],
      r: DEFAULT_R,
      R,
      data,
      accessor: (x) => x[accessor],
    });
  } catch {
    return <View style={{ width, height }} testID={testID} />;
  }

  const total = data.reduce((sum, item) => sum + (Number(item[accessor]) || 0), 0);
  const hasSelection = selectedIndex !== null && selectedIndex !== undefined;

  const slices = chart.curves.map((c, i) => {
    const isSelected = selectedIndex === i;
    const isDimmed = hasSelection && !isSelected;
    const fill = c.item.color || "#9c44dc";
    // destacar: stroke branco + opacidade
    const stroke = isSelected ? "#ffffff" : "transparent";
    const strokeWidth = isSelected ? 3 : 0;
    const opacity = isDimmed ? 0.45 : 1;

    return (
      <G key={`slice-${i}`} opacity={opacity} onPress={() => onSelect && onSelect(i)}>
        <Path
          d={c.sector.path.print()}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onPress={() => onSelect && onSelect(i)}
        />
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
