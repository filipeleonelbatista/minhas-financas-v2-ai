import React, { useMemo } from "react";

import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, Switch } from "react-native";
import * as Yup from "yup";
import { useFinanceStore } from "../stores/finance";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";

const categoriesList = [
  "Todos",
  "Outros",
  "Bares e Restaurantes",
  "Beleza",
  "Cartão",
  "Emergência",
  "Estudos",
  "Ganhos",
  "Investimentos",
  "Mercado",
  "Moradia",
  "Saúde",
  "Streaming",
  "TV/Internet/Telefone",
  "Transporte",
  "Vestuário",
];

export default function AddItemForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction = useFinanceStore((s) => s.add);
  const simpleFinancesItem = useSettingsStore((s) => !!s.simpleFinancesItem);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      description: Yup.string().required("O campo Descrição é obrigatório"),
      amount: Yup.string().required("O campo Valor é obrigatório"),
      category: Yup.string(),
      date: Yup.string(),
      paymentDate: Yup.string(),
      paymentStatus: Yup.boolean(),
      isEnabled: Yup.boolean(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      description: "",
      amount: "",
      date: "",
      category: "Outros",
      paymentDate: "",
      paymentStatus: false,
      isEnabled: true,
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date !== "" ? formValues.date.split("/") : null;
    const submittedPaymentDate =
      formValues.paymentDate !== "" ? formValues.paymentDate.split("/") : null;
    const parsedAmount = parseFloat(formValues.amount.replaceAll(".", "").replace(",", "."));
    const data = {
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      date:
        submittedDate
          ? new Date(`${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`).getTime() + 43200000
          : Date.now() + 43200000,
      paymentDate:
        submittedPaymentDate
          ? new Date(`${submittedPaymentDate[2]}-${submittedPaymentDate[1]}-${submittedPaymentDate[0]}`).getTime() + 43200000
          : null,
      description: formValues.description,
      category: formValues.isEnabled ? formValues.category : "Ganhos",
      paymentStatus: formValues.paymentStatus ? 1 : 0,
      isEnabled: formValues.isEnabled ? 1 : 0,
      isFavorited: 0,
    };
    try {
      await addTransaction(data);
    } catch (e) {
      console.error("Add transaction failed", e);
    }
    onClose();
  }

  function moeda(e) {
    let value = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }
  const toggleSwitch = () => {
    if (formik.values.isEnabled) {
      formik.setFieldValue("category", "Ganhos");
    } else {
      formik.setFieldValue("category", "Outros");
    }

    formik.setFieldValue("isEnabled", !formik.values.isEnabled);
  };

  const toggleSwitchPaymentStatus = () => {
    if (!formik.values.paymentStatus) {
      const currentDate = new Date();
      formik.setFieldValue(
        "paymentDate",
        `${
          currentDate.getDate() < 10
            ? "0" + currentDate.getDate()
            : currentDate.getDate()
        }/${
          currentDate.getMonth() + 1 < 10
            ? "0" + (currentDate.getMonth() + 1)
            : currentDate.getMonth() + 1
        }/${currentDate.getFullYear()}`
      );
    } else {
      formik.setFieldValue("paymentDate", "");
    }
    formik.setFieldValue("paymentStatus", !formik.values.paymentStatus);
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    formik.setFieldValue(
      "date",
      `${
        currentDate.getDate() < 10
          ? "0" + currentDate.getDate()
          : currentDate.getDate()
      }/${
        currentDate.getMonth() + 1 < 10
          ? "0" + (currentDate.getMonth() + 1)
          : currentDate.getMonth() + 1
      }/${currentDate.getFullYear()}`
    );
  };

  const onChangePaymentDate = (event, selectedDate) => {
    const currentDate = selectedDate;
    formik.setFieldValue(
      "paymentDate",
      `${
        currentDate.getDate() < 10
          ? "0" + currentDate.getDate()
          : currentDate.getDate()
      }/${
        currentDate.getMonth() + 1 < 10
          ? "0" + (currentDate.getMonth() + 1)
          : currentDate.getMonth() + 1
      }/${currentDate.getFullYear()}`
    );
  };

  return (
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar transação</Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione informações sobre o entrada ou saída que está adicionando.
      </Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Descrição</Text>
      <TextInput
        testID="input-description"
        accessibilityLabel="Descrição"
        placeholder="Descrição"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t) => formik.setFieldValue("description", t)}
        value={formik.values.description}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.description && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.description}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor</Text>
      <TextInput
        testID="input-amount"
        accessibilityLabel="Valor"
        keyboardType="decimal-pad"
        placeholder="Valor"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
        value={formik.values.amount}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data de vencimento</Text>
      <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange, isDark })} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        <TextInput
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#a1a1aa"
          value={formik.values.date}
          editable={false}
          pointerEvents="none"
          style={{ flex: 1, paddingHorizontal: 12, textAlignVertical: "center", color: text }}
        />
        <View style={{ backgroundColor: PURPLE_600, justifyContent: "center", alignItems: "center", width: 56, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
          <Feather name="calendar" size={20} color="#FFF" />
        </View>
      </Pressable>
      {formik.errors.date && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.date}</Text>
      )}

      {!simpleFinancesItem && (
        <>
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Categoria</Text>
          <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", marginBottom: 12 }}>
            <Picker
              selectedValue={formik.values.category ?? "Outros"}
              onValueChange={(itemValue) =>
                formik.setFieldValue("category", itemValue)
              }
              mode="dropdown"
              dropdownIconColor={PURPLE_600}
              enabled
              style={{
                width: "100%",
                color: text,
                height: 48,
              }}
            >
              {categoriesList.map((cat, index) =>
                index === 0 ? null : (
                  <Picker.Item key={index} label={cat} value={cat} />
                )
              )}
            </Picker>
          </View>
          {formik.errors.category && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.category}</Text>
          )}
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data do pagamento</Text>
          <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangePaymentDate, isDark })} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            <TextInput
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#a1a1aa"
              value={formik.values.paymentDate}
              editable={false}
              pointerEvents="none"
              style={{ flex: 1, paddingHorizontal: 12, textAlignVertical: "center", color: text }}
            />
            <View style={{ backgroundColor: PURPLE_600, justifyContent: "center", alignItems: "center", width: 56, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
              <Feather name="calendar" size={20} color="#FFF" />
            </View>
          </Pressable>
          {formik.errors.paymentDate && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.paymentDate}</Text>
          )}
        </>
      )}

      <View className="flex-row items-center gap-2" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
        <Switch
          trackColor={{
            false: "#a1a1aa",
            true: "#a1a1aa",
          }}
          thumbColor={
            formik.values.isEnabled
              ? PURPLE_600
              : "#27272a"
          }
          ios_backgroundColor="#27272a"
          onValueChange={toggleSwitch}
          value={formik.values.isEnabled}
        />
        <Text style={{ fontSize: 14, color: text }}>É despesa?</Text>
      </View>
      {formik.errors.isEnabled && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.isEnabled}</Text>
      )}
      <Text style={{ fontSize: 14, color: text, marginBottom: 12 }}>
        Deixe marcado caso esteja adicionando uma saída (Despesa).
      </Text>

      {!simpleFinancesItem && (
        <>
          <View className="flex-row items-center gap-2" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            <Switch
              trackColor={{
                false: "#a1a1aa",
                true: "#a1a1aa",
              }}
              thumbColor={
                formik.values.paymentStatus
                  ? PURPLE_600
                  : "#27272a"
              }
              ios_backgroundColor="#27272a"
              onValueChange={toggleSwitchPaymentStatus}
              value={formik.values.paymentStatus}
            />
            <Text style={{ fontSize: 14, color: text }}>Foi Pago?</Text>
          </View>
          {formik.errors.paymentStatus && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.paymentStatus}</Text>
          )}
        </>
      )}

      <Pressable
        onPress={formik.submitForm}
        className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
      </Pressable>
    </ScrollView>
  );
}
