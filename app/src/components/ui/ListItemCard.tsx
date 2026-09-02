import React from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settings';

interface ListItemCardProps {
  item: any;
  onPress?: (item: any) => void;
  onLongPress?: (item: any) => void;
  onUpdateQuantity?: (item: any, isAdd: boolean) => void;
  marketSimplifiedItems?: boolean;
  testID?: string;
}

export default function ListItemCard({ item, onPress, onLongPress, onUpdateQuantity, marketSimplifiedItems, testID }: ListItemCardProps) {
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
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ position: "absolute", top: 3, right: 3, flexDirection: "row", gap: 8 }}>
            {!marketSimplifiedItems && (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: item.quantityDesired <= item.quantity ? "#16a34a" : "#dc2626", borderRadius: 999, backgroundColor: "transparent" }}>
                <Text style={{ fontSize: 12, color: item.quantityDesired <= item.quantity ? "#16a34a" : "#dc2626" }}>{item.quantityDesired <= item.quantity ? "Em estoque" : "Em falta"}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 16 }}>
            <Feather name="shopping-bag" size={28} color={text} />
            <View style={{ alignItems: "flex-start", width: "70%" }}>
              <Text style={{ color: text, fontSize: 20 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.description}</Text>
              <Text style={{ color: text, fontWeight: "700", lineHeight: 14 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.category}</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  <FontAwesome name="money" size={14} color={text} />{" "}
                  {Number(item.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}{" "}
                  {marketSimplifiedItems && <FontAwesome name="times" size={14} color={text} />}
                  {marketSimplifiedItems && " " + item.quantity}
                </Text>
              </View>
              {!marketSimplifiedItems && onUpdateQuantity && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginVertical: 8 }}>
                  <TouchableOpacity
                    style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: "#dc2626", alignItems: "center", justifyContent: "center" }}
                    onPress={() => item.quantity > 0 && onUpdateQuantity(item, false)}
                    testID={`listitem-minus-${item.id}`}
                  >
                    <Feather name="minus" size={20} color="#dc2626" />
                  </TouchableOpacity>
                  <Text style={{ color: text, fontSize: 20 }}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" }}
                    onPress={() => onUpdateQuantity(item, true)}
                    testID={`listitem-plus-${item.id}`}
                  >
                    <Feather name="plus" size={20} color="#16a34a" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end", width: "35%" }}>
            <Text style={{ width: "100%", textAlign: "right", color: text, fontSize: 18 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} ellipsizeMode="tail">
              {(Number(item.amount) * Number(item.quantity)).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
