import React, { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, ToastAndroid } from "react-native";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function AddItemListItem({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const addItemToList = useListsStore((s) => s.addItem);
  const selectedList = useListsStore((s) => s.selectedList);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);

  const formSchema = useMemo(() => {
    return Yup.object().shape({
      description: Yup.string().required("O campo Descrição é obrigatório"),
      amount: Yup.string().required("O campo Valor é obrigatório"),
      category: Yup.string().required("O campo Categoria é obrigatório"),
      quantity: Yup.string().required("O campo Quantidade é obrigatório"),
      quantityDesired: Yup.string(),
      location: Yup.string(),
      date: Yup.string(),
    });
  }, []);
  const startedDate = new Date();

  const formik = useFormik({
    initialValues: {
      description: "",
      amount: "0,00",
      category: "Mercearia",
      quantity: "1",
      quantityDesired: "",
      location: selectedList?.location ?? "",
      date: `${
        startedDate.getDate() < 10
          ? "0" + startedDate.getDate()
          : startedDate.getDate()
      }/${
        startedDate.getMonth() + 1 < 10
          ? "0" + (startedDate.getMonth() + 1)
          : startedDate.getMonth() + 1
      }/${startedDate.getFullYear()}`,
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date !== "" && formValues.date.split("/");

    const data = {
      list_id: selectedList.id,
      amount: parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      ),
      quantity: parseInt(formValues.quantity),
      description: formValues.description,
      category: formValues.category,
      quantityDesired: !!formValues.quantityDesired
        ? parseInt(formValues.quantityDesired)
        : "",
      location: formValues.location,
      date:
        new Date(
          `${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`
        ).getTime() + 43200000,
    };

    await addItemToList(data);

    ToastAndroid.show("Item adicionado com sucesso", ToastAndroid.SHORT);
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
    if (!currentDate) return;
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
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar item na lista</Text>
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
          <>
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

            <View style={{ gap: 8, marginBottom: 8 }}>
              <Text style={{ color: text }}>Local de compra</Text>
              <TextInput
                placeholder="Local de compra"
                placeholderTextColor="#a1a1aa"
                onChangeText={(t) => formik.setFieldValue("location", t)}
                value={formik.values.location}
                style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
              />
              {formik.errors.location && (
                <Text style={{ color: "#dc2626" }}>{formik.errors.location}</Text>
              )}
            </View>

            <View style={{ gap: 8, marginBottom: 8 }}>
              <Text style={{ color: text }}>Data de compra</Text>
              <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden" }}>
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
                <Text style={{ color: "#dc2626" }}>{formik.errors.date}</Text>
              )}
            </View>
          </>
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
