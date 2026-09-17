// @ts-nocheck
import React from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { useSettingsStore } from "../stores/settings";
import emptyImage from "../assets/add_notes.png";

export default function EmptyMessage() {
  const { width } = useWindowDimensions();
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  return (
    <View style={{ alignItems: "center", gap: 16, marginVertical: 32 }}>
      <Image source={emptyImage} style={{ width: width * 0.6, height: width * 0.6 }} />
      <Text style={{ textAlign: "center", fontWeight: "700", color: text }}>
        Toque em '+' para itens para{"\n"}adicionar itens à tabela!
      </Text>
    </View>
  );
}
