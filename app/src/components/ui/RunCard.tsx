import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settings';

interface RunCardProps {
  item: any;
  onPress?: (item: any) => void;
  onLongPress?: (item: any) => void;
  testID?: string;
}

export default function RunCard({ item, onPress, onLongPress, testID }: RunCardProps) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";
  const bgCard = isDark ? "#27272a" : "white";
  const borderColor = isDark ? "#3f3f46" : "#e7e5e4";

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: bgCard,
        borderRadius: 4,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.15 : 0.08,
        elevation: 2,
        borderWidth: 1,
        borderColor: borderColor,
        position: "relative",
      }}
    >
      <Pressable
        onPress={() => onPress?.(item)}
        onLongPress={() => onLongPress?.(item)}
        delayLongPress={400}
        style={{ flex: 1 }}
        android_ripple={{ color: isDark ? "#3f3f46" : "#e4e4e7" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", width: "100%", gap: 8 }}>
          <MaterialCommunityIcons name="fuel" size={28} color="#12a454" />
          <View style={{ alignItems: "flex-start", flex: 1 }}>
            <Text style={{ color: text, fontSize: 18 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} ellipsizeMode="tail">{item.location}</Text>
            <Text style={{ color: text, fontSize: 12 }}>Km no Abast.: {item.currentDistance}</Text>
            <Text style={{ color: text, fontSize: 12 }}>{new Date(item.date).toLocaleDateString("pt-BR")}</Text>
            <Text style={{ color: subText, fontSize: 12 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {Number(item.unityAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })} - {(Number(item.amount) / Number(item.unityAmount)).toFixed(2)} Litros
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", width: "34%" }}>
            <Text style={{ color: text, fontSize: 18, marginTop: 8, textAlign: "right", width: "100%" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {Number(item.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
