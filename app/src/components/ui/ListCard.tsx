import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settings';

interface ListCardProps {
  item: any;
  onPress?: (item: any) => void;
  onLongPress?: (item: any) => void;
  testID?: string;
}

export default function ListCard({ item, onPress, onLongPress, testID }: ListCardProps) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";
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
      }}
    >
      <Pressable
        onPress={() => onPress?.(item)}
        onLongPress={() => onLongPress?.(item)}
        delayLongPress={400}
        style={{ flex: 1 }}
        android_ripple={{ color: isDark ? "#3f3f46" : "#e4e4e7" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ marginHorizontal: 8 }}>
            <Feather name="shopping-cart" size={28} color={text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, color: text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.description}</Text>
            <Text style={{ fontSize: 14, color: text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.location === "" ? "Sem mercado definido" : item.location}</Text>
            <Text style={{ fontSize: 14, color: text }}>{item.quantity} itens</Text>
          </View>
          <View style={{ alignItems: "flex-end", width: "34%" }}>
            <Text style={{ fontSize: 18, color: text, textAlign: "right", width: "100%" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {Number(item.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
