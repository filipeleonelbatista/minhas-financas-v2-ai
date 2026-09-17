// @ts-nocheck
import React from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function ViewFuelReport({ selectedValue }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  function moeda(e) {
    return Number(e).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  }

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Visualizar abastecimento</Text>
      <Text style={{ color: text, marginBottom: 16 }}>Informações sobre o abastecimento.</Text>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Local</Text>
        <TextInput
          placeholder="Local"
          placeholderTextColor="#a1a1aa"
          value={selectedValue.location}
          editable={false}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Km Atual</Text>
        <TextInput
          placeholder="Km Atual"
          placeholderTextColor="#a1a1aa"
          value={String(selectedValue.currentDistance)}
          editable={false}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor do litro</Text>
        <TextInput
          placeholder="Valor do litro"
          placeholderTextColor="#a1a1aa"
          value={moeda(selectedValue.unityAmount)}
          editable={false}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor pago</Text>
        <TextInput
          placeholder="Valor pago"
          placeholderTextColor="#a1a1aa"
          value={moeda(selectedValue.amount)}
          editable={false}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>
      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Tipo do combustivel</Text>
        <Picker
          selectedValue={selectedValue.type ?? "Gasolina comum"}
          mode="dropdown"
          dropdownIconColor={PURPLE_600}
          enabled={false}
          style={{
            width: "100%",
            borderRadius: 4,
            color: text,
          }}
        >
          <Picker.Item label="Gasolina comum" value="Gasolina comum" />
          <Picker.Item label="Gasolina aditivada" value="Gasolina aditivada" />
          <Picker.Item label="Etanol" value="Etanol" />
          <Picker.Item label="Etanol aditivada" value="Etanol aditivada" />
          <Picker.Item label="Carga elétrica" value="Carga elétrica" />
          <Picker.Item label="GNV" value="GNV" />
          <Picker.Item label="Dísel" value="Dísel" />
          <Picker.Item label="Dísel-S10" value="Dísel-S10" />
          <Picker.Item label="Dísel aditivado" value="Dísel aditivado" />
        </Picker>
      </View>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Data de vencimento</Text>
        <View style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden" }}>
          <TextInput
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#a1a1aa"
            value={new Date(selectedValue.date).toLocaleDateString("pt-BR")}
            editable={false}
            style={{ flex: 1, paddingHorizontal: 12, textAlignVertical: "center", color: text }}
          />
          <View
            style={{ backgroundColor: PURPLE_600, width: 56, justifyContent: "center", alignItems: "center" }}
          >
            <Feather name="calendar" size={20} color="#FFF" />
          </View>
        </View>
      </View>

      <View style={{ height: 64, width: "100%" }} />
    </ScrollView>
  );
}
