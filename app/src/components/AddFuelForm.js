import React, { useMemo } from "react";

import { Feather } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from "react-native";
import * as Yup from "yup";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";
import { useFinanceStore } from "../stores/finance";

const PURPLE_600 = "#9c44dc";

export default function AddFuelForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction = useRunsStore((s) => s.add);
  const willAddFuelToTransactionList = useSettingsStore((s) => !!s.willAddFuelToTransactionList);
  const financeAdd = useFinanceStore((s) => s.add);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      currentDistance: Yup.string().required("O campo Km Atual é obrigatório"),
      unityAmount: Yup.string().required(
        "O campo Valor do litro é obrigatório"
      ),
      amount: Yup.string().required("O campo Valor Pago é obrigatório"),
      type: Yup.string().required("O campo Tipo do combustível é obrigatório"),
      date: Yup.string().required("O campo Data é obrigatório"),
      location: Yup.string().required("O campo Local é obrigatório"),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      currentDistance: "",
      unityAmount: "",
      amount: "",
      type: "Gasolina comum",
      date: `${
        new Date().getDate() < 10
          ? "0" + new Date().getDate()
          : new Date().getDate()
      }/${
        new Date().getMonth() + 1 < 10
          ? "0" + (new Date().getMonth() + 1)
          : new Date().getMonth() + 1
      }/${new Date().getFullYear()}`,
      location: "",
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date.split("/");
    const data = {
      currentDistance: parseFloat(
        formValues.currentDistance.replaceAll(".", "").replace(",", ".")
      ),
      type: formValues.type,
      unityAmount: parseFloat(
        formValues.unityAmount.replaceAll(".", "").replace(",", ".")
      ),
      amount: parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      ),
      date:
        new Date(
          `${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`
        ).getTime() + 43200000,
      location: formValues.location,
    };
    await addTransaction(data);
    if (willAddFuelToTransactionList) {
      const newPaymentTransaction = {
        description: `Abastecimento - ${data.location}`,
        amount: data.amount,
        date: data.date,
        category: "Transporte",
        paymentDate: data.date,
        paymentStatus: 1,
        isEnabled: 1,
        isFavorited: 0,
      };
      await financeAdd(newPaymentTransaction);
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
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar abastecimento</Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione informações sobre o abastecimento.
      </Text>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Local</Text>
        <TextInput
          placeholder="Local"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("location", t)}
          value={formik.values.location}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.location && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.location}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Km Atual</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Km Atual"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("currentDistance", t)}
          value={formik.values.currentDistance}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.currentDistance && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.currentDistance}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor do litro</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Valor do litro"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) =>
            formik.setFieldValue("unityAmount", moeda(t))
          }
          value={formik.values.unityAmount}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.unityAmount && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.unityAmount}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Valor pago</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Valor pago"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
          value={formik.values.amount}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.amount && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.amount}</Text>
        )}
      </View>
      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Tipo do combustivel</Text>
        <Picker
          selectedValue={formik.values.type ?? "Gasolina comum"}
          onValueChange={(itemValue) =>
            formik.setFieldValue("type", itemValue)
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
        {formik.errors.type && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.type}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Data de vencimento</Text>
        <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden" }}>
          <TextInput
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#a1a1aa"
            value={formik.values.date}
            editable={false}
            style={{ flex: 1, padding: 12, color: text }}
          />
          <TouchableOpacity
            onPress={() => {
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

        <Pressable
          onPress={formik.submitForm}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
          style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
