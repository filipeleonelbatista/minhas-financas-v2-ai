import React, { useMemo, useState } from "react";

import { Feather } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, Switch } from "react-native";
import * as Yup from "yup";
import { useFinanceStore } from "../stores/finance";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

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

export default function EditItemForm({ onClose, selectedTransaction }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const [isEditable, setIsEditable] = useState(false);

  const simpleFinancesItem = useSettingsStore((s) => !!s.simpleFinancesItem);

  function moeda(e) {
    let value = String(e);
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const updateTransaction = useFinanceStore((s) => s.update);
  const deleteTransaction = useFinanceStore((s) => s.remove);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      description: Yup.string().required("O campo Descrição é obrigatório"),
      amount: Yup.string().required("O campo Valor é obrigatório"),
      date: Yup.string(),
      category: Yup.string(),
      paymentDate: Yup.string(),
      paymentStatus: Yup.boolean(),
      isEnabled: Yup.boolean(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      date:
        selectedTransaction.date !== ""
          ? new Date(selectedTransaction.date).toLocaleDateString("pt-BR")
          : "",
      paymentDate:
        selectedTransaction.paymentDate !== ""
          ? new Date(selectedTransaction.paymentDate).toLocaleDateString(
              "pt-BR"
            )
          : "",
      paymentStatus: selectedTransaction.paymentStatus === 1,
      category: selectedTransaction.category ?? "Outros",
      isEnabled: selectedTransaction.isEnabled === 1,
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date !== "" && formValues.date.split("/");
    const submittedPaymentDate =
      formValues.paymentDate !== "" ? formValues.paymentDate.split("/") : "";

    const data = {
      ...selectedTransaction,
      amount: parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      ),
      date:
        formValues.date !== ""
          ? new Date(
              `${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`
            ).getTime() + 43200000
          : "",
      paymentDate:
        formValues.paymentDate !== ""
          ? new Date(
              `${submittedPaymentDate[2]}-${submittedPaymentDate[1]}-${submittedPaymentDate[0]}`
            ).getTime() + 43200000
          : "",
      description: formValues.description,
      category: formValues.isEnabled ? formValues.category : "Ganhos",
      paymentStatus: formValues.paymentStatus,
      isEnabled: formValues.isEnabled,
    };
    await updateTransaction(data.id, data);
    onClose();
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
          {isEditable ? "Editar" : "Visualizar"} transação
        </Text>
        <TouchableOpacity
          onPress={async () => {
            await deleteTransaction(selectedTransaction);
            onClose();
          }}
          style={{ borderRadius: 4, borderWidth: 1, borderColor: RED_500, padding: 8, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash" size={24} color={RED_500} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 8 }}>
        {isEditable ? "Edite" : "Visualize"} informações sobre o entrada ou
        saída selecionada.
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
        <Text style={{ color: text }}>Valor</Text>
        <TextInput
          editable={isEditable}
          keyboardType="decimal-pad"
          placeholder="Valor"
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
        <Text style={{ color: text }}>Data de vencimento</Text>
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

      {!simpleFinancesItem && (
        <>
          <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
            <Text style={{ fontWeight: "700", fontSize: 18, color: text }}>Categoria</Text>
            <Picker
              selectedValue={formik.values.category ?? "Outros"}
              onValueChange={(itemValue) =>
                formik.setFieldValue("category", itemValue)
              }
              mode="dropdown"
              dropdownIconColor={PURPLE_600}
              enabled={isEditable}
              style={{
                width: "100%",
                borderRadius: 4,
                color: text,
              }}
            >
              {categoriesList.map((cat, index) =>
                index === 0 ? null : (
                  <Picker.Item key={index} label={cat} value={cat} />
                )
              )}
            </Picker>
            {formik.errors.category && (
              <Text style={{ color: "#dc2626" }}>{formik.errors.category}</Text>
            )}
          </View>
          <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
            <Text style={{ color: text }}>Data do pagamento</Text>
            <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", opacity: isEditable ? 1 : 0.6 }}>
              <TextInput
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#a1a1aa"
                value={formik.values.paymentDate}
                editable={false}
                style={{ flex: 1, padding: 12, color: text }}
              />
              <TouchableOpacity
                onPress={() => {
                  isEditable &&
                    DateTimePickerAndroid.open({
                      value: new Date(Date.now()),
                      onChange: onChangePaymentDate,
                      mode: "date",
                      is24Hour: false,
                    });
                }}
                style={{ backgroundColor: PURPLE_600, padding: 12, height: "100%", justifyContent: "center", alignItems: "center", width: "25%" }}
              >
                <Feather name="calendar" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {formik.errors.paymentDate && (
              <Text style={{ color: "#dc2626" }}>{formik.errors.paymentDate}</Text>
            )}
          </View>
        </>
      )}

      <View className="flex-row items-center gap-2" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Switch
          disabled={!isEditable}
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
        <Text style={{ color: "#dc2626" }}>{formik.errors.isEnabled}</Text>
      )}
      <Text style={{ fontSize: 14, color: text }}>
        Deixe marcado caso esteja adicionando uma saída (Despesa).
      </Text>

      {!simpleFinancesItem && (
        <>
          <View className="flex-row items-center gap-2" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Switch
              disabled={!isEditable}
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

      {isEditable && (
        <Pressable
          onPress={formik.submitForm}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
          style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      )}

      <View style={{ height: 64, width: "100%" }} />
    </ScrollView>
  );
}
