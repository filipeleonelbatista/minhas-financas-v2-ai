// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, ToastAndroid } from "react-native";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import ThemedAlert from "./ui/ThemedAlert";
import { useFormik } from "formik"
import { z } from "zod";
import { stockSchema } from "../schemas/stock.zod";;
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

export default function EditItemListItem({ onClose, selectedTransaction, initialEditable = false }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  function moeda(e) {
    let value = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const [isEditable, setIsEditable] = useState(initialEditable);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setIsEditable(initialEditable); }, [initialEditable, selectedTransaction?.id]);
  const selectedList = useListsStore((s) => s.selectedList);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);

  const formSchema = useMemo(() => {
    return z.object({
      description: z.string().min(1, "O campo Descrição é obrigatório"),
      amount: z.string().min(1, "O campo Valor é obrigatório"),
      category: z.string().min(1, "O campo Categoria é obrigatório"),
      quantity: z.string().min(1, "O campo Quantidade é obrigatório"),
      quantityDesired: z.string(),
      location: z.string(),
      date: z.string(),
    });
  }, []);

  const startedDate = new Date();

  const formik = useFormik({
    initialValues: {
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      category: selectedTransaction.category ?? "Mercearia",
      quantity: String(selectedTransaction.quantity),
      quantityDesired: String(selectedTransaction.quantityDesired ?? ""),
      location: selectedTransaction.location ?? "",
      date:
        selectedTransaction.date !== ""
          ? new Date(selectedTransaction.date).toLocaleDateString("pt-BR")
          : `${
              startedDate.getDate() < 10
                ? "0" + startedDate.getDate()
                : startedDate.getDate()
            }/${
              startedDate.getMonth() + 1 < 10
                ? "0" + (startedDate.getMonth() + 1)
                : startedDate.getMonth() + 1
            }/${startedDate.getFullYear()}`,
    },
    validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const submittedDate = formValues.date !== "" && formValues.date.split("/");

    const data = {
      ...selectedTransaction,
      list_id: selectedList?.id ?? selectedTransaction.list_id,
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

    await useListsStore.getState().updateItem(data.id, data);

    ToastAndroid.show("Item atualizado com sucesso", ToastAndroid.SHORT);
    onClose();
  }

  const handleDelete = () => setConfirmDelete(true);

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
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
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
        <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>{isEditable ? "Editar" : "Visualizar"} item</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={{ borderRadius: 4, borderWidth: 1, borderColor: RED_500, padding: 8, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash" size={24} color={RED_500} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 16 }}>Adicione itens para suas compras de mercado.</Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Descrição</Text>
      <TextInput
        editable={isEditable}
        placeholder="Descrição"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t) => formik.setFieldValue("description", t)}
        value={formik.values.description}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.description && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.description}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Categoria</Text>
      <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
        <Picker
          selectedValue={formik.values.category ?? "Mercearia"}
          onValueChange={(itemValue) =>
            formik.setFieldValue("category", itemValue)
          }
          mode="dropdown"
          dropdownIconColor={PURPLE_600}
          enabled={isEditable}
          style={{
            width: "100%",
            color: text,
            height: 48,
          }}
        >
          <Picker.Item label="Carnes" value="Carnes" />
          <Picker.Item label="Fruteira" value="Fruteira" />
          <Picker.Item label="Higiêne" value="Higiêne" />
          <Picker.Item label="Limpeza" value="Limpeza" />
          <Picker.Item label="Mercearia" value="Mercearia" />
          <Picker.Item label="Outros" value="Outros" />
        </Picker>
      </View>
      {formik.errors.category && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.category}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor</Text>
      <TextInput
        editable={isEditable}
        keyboardType="decimal-pad"
        placeholder="Valor"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
        value={formik.values.amount}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Quantidade</Text>
      <TextInput
        editable={isEditable}
        keyboardType="decimal-pad"
        placeholder="Quantidade"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t) => formik.setFieldValue("quantity", t)}
        value={formik.values.quantity}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.quantity && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.quantity}</Text>
      )}
      {!marketSimplifiedItems && (
        <>
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Quantidade desejada</Text>
          <TextInput
            editable={isEditable}
            keyboardType="decimal-pad"
            placeholder="Quantidade desejada"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) =>
              formik.setFieldValue("quantityDesired", t)
            }
            value={formik.values.quantityDesired}
            style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.quantityDesired && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.quantityDesired}</Text>
          )}
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Local de compra</Text>
          <TextInput
            editable={isEditable}
            placeholder="Local de compra"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("location", t)}
            value={formik.values.location}
            style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.location && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.location}</Text>
          )}
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data de compra</Text>
          <Pressable onPress={() => isEditable && openThemedDatePicker({ value: new Date(), onChange, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
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
        </>
      )}
      {isEditable && (
        <Pressable
          onPress={formik.submitForm}
          style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
          className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      )}
      <ThemedAlert
        visible={confirmDelete}
        title="Excluir item"
        message={`Deseja excluir "${selectedTransaction.description}"?`}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => { await useListsStore.getState().deleteItem(selectedTransaction.id, selectedTransaction.list_id ?? selectedList?.id); setConfirmDelete(false); onClose(); }}
        onCancel={() => setConfirmDelete(false)}
        onClose={() => setConfirmDelete(false)}
        testID="listitem-edit-delete-alert"
        confirmTestID="confirm-delete-listitem-edit"
        cancelTestID="cancel-delete-listitem-edit"
      />
      <View style={{ height: 64, width: "100%" }} />
    </ScrollView>
  );
}
