import React, { useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, Alert, ToastAndroid } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMarketStore } from "../stores/market";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

export default function EditShoppingCartItem({ onClose, selectedTransaction }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const [isEditable, setIsEditable] = useState(false);
  const marketSimplifiedItems = useSettingsStore((s) => !!s.marketSimplifiedItems);
  const update = useMarketStore((s) => s.update);
  const remove = useMarketStore((s) => s.remove);

  function moeda(e) {
    let value = String(e);
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

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
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      category: selectedTransaction.category,
      quantity: String(selectedTransaction.quantity),
      quantityDesired: String(selectedTransaction.quantityDesired ?? ""),
    },
    validationSchema: formSchema,
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    const data = {
      ...selectedTransaction,
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
    await update(data.id, data);
    ToastAndroid.show("Item atualizado com sucesso", ToastAndroid.SHORT);
    onClose();
  }

  const handleDelete = () => {
    Alert.alert(
      "Deseja realmente deletar esse registro?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            await remove(selectedTransaction.id);
            ToastAndroid.show("Item removido do carrinho", ToastAndroid.SHORT);
            onClose();
          },
        },
      ]
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
        <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>{isEditable ? "Editar" : "Visualizar"} produto</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={{ borderRadius: 4, borderWidth: 1, borderColor: RED_500, padding: 8, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash" size={24} color={RED_500} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 16 }}>{isEditable ? "Edite" : "Visualize"} itens para suas compras de mercado.</Text>

      <View style={{ gap: 8 }}>
        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Descrição</Text>
          <TextInput
            editable={isEditable}
            placeholder="Descrição"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("description", t)}
            value={formik.values.description}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
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
            enabled={isEditable}
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
            editable={isEditable}
            keyboardType="decimal-pad"
            placeholder="Valor"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("amount", moeda(t))}
            value={formik.values.amount}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.amount && (
            <Text style={{ color: "#dc2626" }}>{formik.errors.amount}</Text>
          )}
        </View>

        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ color: text }}>Quantidade</Text>
          <TextInput
            editable={isEditable}
            keyboardType="decimal-pad"
            placeholder="Quantidade"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t) => formik.setFieldValue("quantity", t)}
            value={formik.values.quantity}
            style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
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
              editable={isEditable}
              keyboardType="decimal-pad"
              placeholder="Quantidade desejada"
              placeholderTextColor="#a1a1aa"
              onChangeText={(t) =>
                formik.setFieldValue("quantityDesired", t)
              }
              value={formik.values.quantityDesired}
              style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12, opacity: isEditable ? 1 : 0.6 }}
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
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
