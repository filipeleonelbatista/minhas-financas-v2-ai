import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, ToastAndroid } from "react-native";
import { Feather } from "@expo/vector-icons";
import ThemedPicker from "./ui/ThemedPicker";
import ThemedAlert from "./ui/ThemedAlert";
import { useFormik } from "formik";
import { useMarketStore } from "../stores/market";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { stockSchema } from "../schemas/stock.zod";
import type { StockRow } from "../repositories/market";

const PURPLE_600 = "#9c44dc";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

interface EditShoppingCartItemProps {
  onClose: () => void;
  selectedTransaction: StockRow;
  initialEditable?: boolean;
}

interface FormValues {
  description: string;
  amount: string;
  category: string;
  quantity: string;
  quantityDesired: string;
}

export default function EditShoppingCartItem({ onClose, selectedTransaction, initialEditable = false }: EditShoppingCartItemProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";

  const [isEditable, setIsEditable] = useState<boolean>(initialEditable);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  useEffect(() => { setIsEditable(initialEditable); }, [initialEditable, selectedTransaction?.id]);
  const marketSimplifiedItems: boolean = useSettingsStore((s: SettingsState) => !!s.marketSimplifiedItems);
  const update: (id: string, dto: Partial<StockRow>) => Promise<void> = useMarketStore((s: any) => s.update);
  const remove: (id: string) => Promise<void> = useMarketStore((s: any) => s.remove);

  function moeda(e: string | number): string {
    let value: string = String(e);
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const validate = (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.description.trim()) {
      errors.description = "O campo Descrição é obrigatório";
    }
    if (!values.amount.trim()) {
      errors.amount = "O campo Valor é obrigatório";
    }
    if (!values.category.trim()) {
      errors.category = "O campo Categoria é obrigatório";
    }
    if (!values.quantity.trim()) {
      errors.quantity = "O campo Quantidade é obrigatório";
    }
    if (values.description.trim() && values.amount.trim() && values.category.trim() && values.quantity.trim()) {
      const parsedAmount = parseFloat(values.amount.replaceAll(".", "").replace(",", "."));
      const amountNum = isNaN(parsedAmount) ? 0 : parsedAmount;
      const qty = parseInt(values.quantity);
      const qtyDes = values.quantityDesired ? parseInt(values.quantityDesired) : 1;
      const candidate: Record<string, unknown> = {
        description: values.description,
        amount: amountNum,
        category: values.category,
        quantity: isNaN(qty) ? 0 : qty,
        quantityDesired: isNaN(qtyDes) ? 1 : qtyDes,
      };
      const res = stockSchema.safeParse(candidate);
      if (!res.success) {
        const descIssue = res.error.errors.find((e) => e.path[0] === "description");
        if (descIssue) errors.description = descIssue.message;
        const amountIssue = res.error.errors.find((e) => e.path[0] === "amount");
        if (amountIssue) errors.amount = amountIssue.message;
      }
    }
    return errors;
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      category: selectedTransaction.category,
      quantity: String(selectedTransaction.quantity),
      quantityDesired: String(selectedTransaction.quantityDesired ?? ""),
    },
    validate,
    onSubmit: (values: FormValues) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues: FormValues): Promise<void> {
    const parsedAmount = parseFloat(formValues.amount.replaceAll(".", "").replace(",", "."));
    const qty = parseInt(formValues.quantity);
    const qtyDesiredRaw = formValues.quantityDesired ? parseInt(formValues.quantityDesired) : 1;
    const candidate: Record<string, unknown> = {
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      quantity: isNaN(qty) ? 0 : qty,
      description: formValues.description,
      category: formValues.category,
      quantityDesired: isNaN(qtyDesiredRaw) ? 1 : qtyDesiredRaw,
    };
    const validation = stockSchema.safeParse(candidate);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of validation.error.errors) {
        const path = issue.path[0] as string;
        if (path === "description" && !fieldErrors.description) fieldErrors.description = issue.message;
        if (path === "amount" && !fieldErrors.amount) fieldErrors.amount = issue.message;
      }
      if (Object.keys(fieldErrors).length > 0) {
        formik.setErrors(fieldErrors as any);
        return;
      }
    }
    const sanitized = validation.success ? validation.data : candidate;
    const data: any = {
      ...selectedTransaction,
      amount: (sanitized as any).amount,
      quantity: (sanitized as any).quantity,
      description: (sanitized as any).description,
      category: (sanitized as any).category,
      quantityDesired: (sanitized as any).quantityDesired,
    };
    if (!formValues.quantityDesired) {
      data.quantityDesired = 1;
    }
    await update(data.id, data);
    ToastAndroid.show("Item atualizado com sucesso", ToastAndroid.SHORT);
    onClose();
  }

  const handleDelete = (): void => setConfirmDelete(true);

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

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Descrição</Text>
      <TextInput
        editable={isEditable}
        placeholder="Descrição"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("description", t)}
        value={formik.values.description}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.description && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.description}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Categoria</Text>
      <View style={{ opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
        <ThemedPicker
          testID="edit-stock-category"
          selectedValue={formik.values.category ?? "Mercearia"}
          onValueChange={(v: string) => formik.setFieldValue("category", v)}
          enabled={isEditable}
          items={[
            { label: "Carnes", value: "Carnes" },
            { label: "Fruteira", value: "Fruteira" },
            { label: "Higiêne", value: "Higiêne" },
            { label: "Limpeza", value: "Limpeza" },
            { label: "Mercearia", value: "Mercearia" },
            { label: "Outros", value: "Outros" },
          ]}
        />
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
        onChangeText={(t: string) => formik.setFieldValue("amount", moeda(t))}
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
        onChangeText={(t: string) => formik.setFieldValue("quantity", t)}
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
            onChangeText={(t: string) =>
              formik.setFieldValue("quantityDesired", t)
            }
            value={formik.values.quantityDesired}
            style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {formik.errors.quantityDesired && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.quantityDesired}</Text>
          )}
        </>
      )}
      <Pressable
        onPress={() => formik.submitForm()}
        style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
      </Pressable>
      <ThemedAlert
        visible={confirmDelete}
        title="Excluir produto"
        message={`Deseja excluir "${selectedTransaction.description}"?`}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => { await remove(selectedTransaction.id); setConfirmDelete(false); onClose(); }}
        onCancel={() => setConfirmDelete(false)}
        onClose={() => setConfirmDelete(false)}
        testID="stock-edit-delete-alert"
        confirmTestID="confirm-delete-stock-edit"
        cancelTestID="cancel-delete-stock-edit"
      />
    </ScrollView>
  );
}
