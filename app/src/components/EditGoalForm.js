import React, { useMemo, useState } from "react";

import { Feather } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from "react-native";
import * as Yup from "yup";
import { useGoalsStore } from "../stores/goals";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

export default function EditGoalForm({ onClose, selectedTransaction }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const [isEditable, setIsEditable] = useState(false);

  function moeda(e) {
    let value = String(e);
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const updateTransaction = useGoalsStore((s) => s.update);
  const deleteTransaction = useGoalsStore((s) => s.delete);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      description: Yup.string().required("O campo Descrição é obrigatório"),
      amount: Yup.string().required("O campo Valor é obrigatório"),
      currentAmount: Yup.string(),
      date: Yup.string(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      currentAmount: moeda(selectedTransaction.currentAmount),
      date:
        selectedTransaction.date !== ""
          ? new Date(selectedTransaction.date).toLocaleDateString("pt-BR")
          : "",
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date !== "" && formValues.date.split("/");

    const data = {
      ...selectedTransaction,
      currentAmount: parseFloat(
        formValues.currentAmount.replaceAll(".", "").replace(",", ".")
      ),
      amount: parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      ),
      date:
        formValues.date !== ""
          ? new Date(
              `${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`
            ).getTime() + 43200000
          : "",
      description: formValues.description,
    };
    await updateTransaction(selectedTransaction.id, data);
    onClose();
  }

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

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="flex-row justify-between items-center mb-2" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        {!isEditable ? (
          <TouchableOpacity
            onPress={() => setIsEditable(true)}
            style={{ borderRadius: 4, borderWidth: 1, borderColor: GREEN_500, padding: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="edit" size={24} color={GREEN_500} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>
          {isEditable ? "Editar" : "Visualizar"} meta
        </Text>
        <TouchableOpacity
          onPress={async () => {
            await deleteTransaction(selectedTransaction.id);
            onClose();
          }}
          style={{ borderRadius: 4, borderWidth: 1, borderColor: RED_500, padding: 8, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash" size={24} color={RED_500} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione sua meta para acompanhar em suas finanças.
      </Text>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Descrição</Text>
        <TextInput
          editable={isEditable}
          placeholder="Descrição"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("description", t)}
          value={formik.values.description}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
        />
        {formik.errors.description && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.description}</Text>
        )}
      </View>
      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor da meta</Text>
        <TextInput
          editable={isEditable}
          keyboardType="decimal-pad"
          placeholder="Valor da meta"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
          value={formik.values.amount}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
        />
        {formik.errors.amount && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.amount}</Text>
        )}
      </View>
      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor alcançado</Text>
        <TextInput
          editable={isEditable}
          keyboardType="decimal-pad"
          placeholder="Valor alcançado"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) =>
            formik.setFieldValue("currentAmount", moeda(t))
          }
          value={formik.values.currentAmount}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
        />
        {formik.errors.currentAmount && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.currentAmount}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Data da meta</Text>
        <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", opacity: isEditable ? 1 : 0.6 }}>
          <TextInput
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#a1a1aa"
            value={formik.values.date}
            editable={false}
            style={{ flex: 1, padding: 12, color: text }}
          />
          <TouchableOpacity
            onPress={() => {
              isEditable &&
                DateTimePickerAndroid.open({
                  value: new Date(Date.now()),
                  onChange,
                  mode: "date",
                  is24Hour: false,
                });
            }}
            style={{ backgroundColor: PURPLE_600, padding: 12, height: "100%", justifyContent: "center", alignItems: "center", width: "25%" }}
          >
            <Feather name="calendar" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        {formik.errors.date && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.date}</Text>
        )}
      </View>
      {isEditable && (
        <Pressable
          onPress={formik.submitForm}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
          style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
