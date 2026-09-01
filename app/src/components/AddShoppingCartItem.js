import React, { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMarketStore } from "../stores/market";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function AddShoppingCartItem({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction = useMarketStore((s) => s.add);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      description: Yup.string().required("O campo Descrição é obrigatório"),
      amount: Yup.string().required("O campo Valor é obrigatório"),
      category: Yup.string().required("O campo Categoria é obrigatório"),
      quantity: Yup.string().required("O campo Quantidade é obrigatório"),
      quantityDesired: Yup.string(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      description: "",
      amount: "0,00",
      category: "Mercearia",
      quantity: "1",
      quantityDesired: "",
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const data = {
      amount: parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      ),
      quantity: parseInt(formValues.quantity),
      description: formValues.description,
      category: formValues.category,
      quantityDesired: !!formValues.quantityDesired
        ? parseInt(formValues.quantityDesired)
        : "",
    };
    await addTransaction(data);
    onClose();
  }

  function moeda(e) {
    let value = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  return (
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar produto ao estoque</Text>
      <Text style={{ color: text, marginBottom: 16 }}>Adicione itens para suas compras de mercado.</Text>

      <View style={{ gap: 8 }}>
        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Descrição</Text>
          <TextInput
            placeholder="Descrição"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("description", t)}
            value={formik.values.description}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.description && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.description}</Text>
          )}
        </View>

        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Categoria</Text>
          <Picker
            selectedValue={formik.values.category ?? "Mercearia"}
            onValueChange={(itemValue) =>
              formik.setFieldValue("category", itemValue)
            }
            mode="dropdown"
            dropdownIconColor={PURPLE_600}
            enabled
            style={{
              width: "100%",
              borderRadius: 4,
              color: text,
            }}
          >
            <Picker.Item label="Carnes" value="Carnes" />
            <Picker.Item label="Fruteira" value="Fruteira" />
            <Picker.Item label="Higiêne" value="Higiêne" />
            <Picker.Item label="Limpeza" value="Limpeza" />
            <Picker.Item label="Mercearia" value="Mercearia" />
            <Picker.Item label="Outros" value="Outros" />
          </Picker>
          {formik.errors.category && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.category}</Text>
          )}
        </View>

        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Valor</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Valor"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
            value={formik.values.amount}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.amount && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.amount}</Text>
          )}
        </View>

        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Quantidade</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Quantidade"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("quantity", t)}
            value={formik.values.quantity}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.quantity && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.quantity}</Text>
          )}
        </View>

        {!marketSimplifiedItems && (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <Text style={{ color: text }}>Quantidade desejada</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="Quantidade desejada"
              placeholderTextColor="#a1a1aa"
              onChangeText={(t) =>
                formik.setFieldValue("quantityDesired", t)
              }
              value={formik.values.quantityDesired}
              style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
            />
            {formik.errors.quantityDesired && (
              <Text style={{ color: "#dc2626" }}>{formik.errors.quantityDesired}</Text>
            )}
          </View>
        )}
        <Pressable
          onPress={formik.submitForm}
          style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
