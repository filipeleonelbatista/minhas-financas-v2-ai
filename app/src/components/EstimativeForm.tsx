// @ts-nocheck
import React, { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useFormik } from "formik"
import { z } from "zod";;
import { useSettingsStore } from "../stores/settings";
import { useMarket } from "../hooks/useMarket";

const PURPLE_600 = "#9c44dc";

export default function EstimativeForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  // Fallback: legacy hook may not have estimative after zustand migration; provide local no-op
  let estimative = 0;
  let setEstimativeValue = () => {};
  try {
    const market = useMarket ? useMarket() : null;
    if (market) {
      estimative = market.estimative ?? market.estimativeValue ?? 0;
      setEstimativeValue = market.setEstimativeValue ?? market.setEstimative ?? (() => {});
    }
  } catch {}

  function moeda(e) {
    let value = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const formSchema = useMemo(() => {
    return z.object({
      estimative: z.string().min(1, "O campo Valor estimado é obrigatório"),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      estimative: Number(estimative)
        .toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: true,
        })
        .replace("R$ ", ""),
    },
    validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    setEstimativeValue(
      parseFloat(formValues.estimative.replaceAll(".", "").replace(",", "."))
    );
    onClose();
  }

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar produto</Text>
      <Text style={{ color: text, marginBottom: 16 }}>Adicione itens para suas compras de mercado.</Text>

      <View style={{ gap: 8, marginBottom: 8 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: text }}>Valor de gastos estimado</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Valor de gastos estimado"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("estimative", moeda(t))}
            value={formik.values.estimative}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.estimative && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.estimative}</Text>
          )}
        </View>
        <Pressable
          onPress={formik.submitForm}
          style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Atualizar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
