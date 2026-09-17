// @ts-nocheck
import React from "react";
import { View, Text, Image, useWindowDimensions } from "react-native";
import { useSettingsStore } from "../stores/settings";
import emptyImage from "../assets/add_notes.png";

export default function ErrorSheet() {
  const { width } = useWindowDimensions();
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  return (
    <View style={{ alignItems: "center", gap: 16, marginVertical: 32 }}>
      <Image
        alt="No Data"
        source={emptyImage}
        style={{ width: width * 0.6, height: width * 0.6 }}
        resizeMode="contain"
      />
      <Text style={{ textAlign: "center", fontWeight: "700", color: text }}>
        Houve um erro ao carregar o formulário.{"\n"}
        Tente novamente!
      </Text>
    </View>
  );
}
