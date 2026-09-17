// @ts-nocheck
import React, { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useFormik } from "formik"
import { z } from "zod";;
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function EditVeicleForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const veicleName = useSettingsStore((s) => s.veicleName);
  const veicleBrand = useSettingsStore((s) => s.veicleBrand);
  const veicleYear = useSettingsStore((s) => s.veicleYear);
  const veicleColor = useSettingsStore((s) => s.veicleColor);
  const veiclePlate = useSettingsStore((s) => s.veiclePlate);
  const update = useSettingsStore((s) => s.update);

  const updateVeicle = async (info) => {
    await update("veicleName", info.name);
    await update("veicleBrand", info.brand);
    await update("veicleYear", info.year);
    await update("veicleColor", info.color);
    await update("veiclePlate", info.plate);
  };

  const formSchema = useMemo(() => {
    return z.object({
      name: z.string(),
      brand: z.string(),
      year: z.string(),
      color: z.string(),
      plate: z.string(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      name: veicleName ?? "",
      brand: veicleBrand ?? "",
      year: veicleYear ?? "",
      color: veicleColor ?? "",
      plate: veiclePlate ?? "",
    },
    validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    await updateVeicle(formValues);
    onClose();
  }

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Informações do veículo</Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione a Informações sobre o seu veículo para ter mais controles.
      </Text>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Modelo</Text>
        <TextInput
          placeholder="Modelo"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("name", t)}
          value={formik.values.name}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>
      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Marca</Text>
        <TextInput
          placeholder="Marca"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("brand", t)}
          value={formik.values.brand}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>
      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Ano</Text>
        <TextInput
          placeholder="Ano"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("year", t)}
          value={formik.values.year}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>
      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Cor</Text>
        <TextInput
          placeholder="Cor"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("color", t)}
          value={formik.values.color}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>
      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Placa</Text>
        <TextInput
          placeholder="Placa"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("plate", t)}
          value={formik.values.plate}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
      </View>

      <Pressable
        onPress={formik.submitForm}
        style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Atualizar</Text>
      </Pressable>
    </ScrollView>
  );
}
