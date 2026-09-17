// @ts-nocheck
import React, { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useFormik } from "formik"
import { z } from "zod";;
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function AutonomyForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const veicleAutonomy = useSettingsStore((s) => s.veicleAutonomy);
  const update = useSettingsStore((s) => s.update);
  const handleVeicleAutonomy = (v) => update("veicleAutonomy", v);

  const formSchema = useMemo(() => {
    return z.object({
      autonomy: z.string().min(1, "O campo Autonomia é obrigatório"),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      autonomy: String(veicleAutonomy ?? ""),
    },
    validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    handleVeicleAutonomy(Number(formValues.autonomy));
    onClose();
  }

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Autonomia</Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione a autonomia do veículo para estimar o uso do combustível.
      </Text>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor do Km/L</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Valor do Km/L"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("autonomy", t)}
          value={formik.values.autonomy}
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        />
        {formik.errors.autonomy && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.autonomy}</Text>
        )}
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
