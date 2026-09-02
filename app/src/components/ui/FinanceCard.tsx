import React from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { Feather, FontAwesome, Fontisto, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settings';

const GREEN_600 = "#16a34a";
const RED_600 = "#dc2626";
const YELLOW_400 = "#facc15";

const categoryItemLib: Record<string, React.ReactNode> = {
  Outros: <Feather name="dollar-sign" size={28} color={"#e83e5a"} />,
  Moradia: <Feather name="home" size={28} color={"#e83e5a"} />,
  Vestuário: <Ionicons name="shirt-outline" size={28} color={"#e83e5a"} />,
  Streaming: <Fontisto name="netflix" size={28} color={"#e83e5a"} />,
  Estudos: <Ionicons name="school-outline" size={28} color={"#e83e5a"} />,
  Beleza: <MaterialCommunityIcons name="lipstick" size={28} color={"#e83e5a"} />,
  Emergência: <MaterialCommunityIcons name="alarm-light-outline" size={28} color={"#e83e5a"} />,
  Mercado: <Feather name="shopping-cart" size={28} color={"#e83e5a"} />,
  "TV/Internet/Telefone": <Feather name="at-sign" size={28} color={"#e83e5a"} />,
  Transporte: <FontAwesome name="car" size={28} color={"#e83e5a"} />,
  Saúde: <FontAwesome name="medkit" size={28} color={"#e83e5a"} />,
  Cartão: <Feather name="credit-card" size={28} color={"#e83e5a"} />,
  "Bares e Restaurantes": <Feather name="coffee" size={28} color={"#e83e5a"} />,
  Ganhos: <Feather name="dollar-sign" size={28} color={"#12a454"} />,
  Investimentos: <FontAwesome name="line-chart" size={28} color={"#12a454"} />,
};

interface FinanceCardProps {
  item: any;
  onPress?: (item: any) => void;
  onLongPress?: (item: any) => void;
  onFavorite: (item: any) => void;
  simpleFinancesItem: boolean;
  testID?: string;
}

export default function FinanceCard({ item, onPress, onLongPress, onFavorite, simpleFinancesItem, testID }: FinanceCardProps) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCard = isDark ? "#27272a" : "white"; // branco no claro para contraste (antes #f5f5f4 transparente)
  const borderColor = isDark ? "#3f3f46" : "#e7e5e4"; // mesma ideia do GoalCard

  // Wrapper igual ao GoalCard.tsx:100 - View estática com bg/borda/sombra, Pressable interno transparente
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
        <View style={{ position: "absolute", top: 0, right: 0, flexDirection: "row", gap: 8, alignItems: "center", zIndex: 1 }}>
          {!simpleFinancesItem && item.isEnabled === 1 && (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderWidth: 1,
                borderColor: item.paymentStatus === 1 ? GREEN_600 : RED_600,
                borderRadius: 999,
                backgroundColor: "transparent",
              }}
            >
              <Text style={{ fontSize: 10, color: item.paymentStatus === 1 ? GREEN_600 : RED_600 }}>
                {item.paymentStatus === 1 ? "Pago" : "Não Pago"}
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => onFavorite(item)}
            hitSlop={12}
            style={{ padding: 6, borderRadius: 999 }}
            android_ripple={{ color: isDark ? "#3f3f46" : "#e4e4e7", borderless: true }}
            testID={`finance-favorite-${item.id}`}
          >
            <FontAwesome
              name={item.isFavorited === 1 ? "star" : "star-o"}
              size={18}
              color={item.isFavorited === 1 ? YELLOW_400 : text}
            />
          </Pressable>
        </View>
        <View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 16 }}>
          {item.isEnabled === 1 ? (
            item.category ? (
              categoryItemLib[item.category] || <Feather name="arrow-down-circle" size={28} color={RED_600} />
            ) : (
              <Feather name="arrow-down-circle" size={28} color={RED_600} />
            )
          ) : (
            <Feather name="arrow-up-circle" size={28} color={GREEN_600} />
          )}
          <View style={{ alignItems: "flex-start", flex: 1 }}>
            <Text style={{ fontSize: 18, color: text }}>{item.description}</Text>
            {item.date !== "" && (
              <Text style={{ color: text, fontSize: 12 }}>
                {item.isEnabled === 1 ? "Dt. Venc.: " : "Dt. Receb.: "}
                {new Date(item.date).toLocaleDateString("pt-BR")}
              </Text>
            )}
            {!simpleFinancesItem && item.paymentDate !== "" && item.isEnabled === 1 && (
              <Text style={{ color: text, fontSize: 12 }}>Dt. Pgto.: {new Date(item.paymentDate).toLocaleDateString("pt-BR")}</Text>
            )}
            {!simpleFinancesItem && <Text style={{ color: text, fontSize: 12 }}>Cat.: {item.category}</Text>}
          </View>
          <View style={{ alignItems: "flex-end", width: "34%" }}>
            <Text
              style={{ fontSize: 18, color: text, marginTop: 16, marginRight: 12 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              ellipsizeMode="tail"
            >
              {item.isEnabled === 1 ? "-" : ""}
              {Number(item.amount).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: true,
              })}
            </Text>
          </View>
        </View>
      </View>
      </Pressable>
    </View>
  );
}
