import React from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { useMarketStore } from "../stores/market";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { stockSchema } from "../schemas/stock.zod";

const PURPLE_600 = "#9c44dc";

interface AddShoppingCartItemProps {
  onClose: () => void;
}

interface FormValues {
  description: string;
  amount: string;
  category: string;
  quantity: string;
  quantityDesired: string;
}

export default function AddShoppingCartItem({ onClose }: AddShoppingCartItemProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction: (dto: any) => Promise<void> = useMarketStore((s: any) => s.add);
  const marketSimplifiedItems: boolean = useSettingsStore((s: SettingsState) => !!s.marketSimplifiedItems);

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
        const qtyIssue = res.error.errors.find((e) => e.path[0] === "quantity");
        if (qtyIssue) errors.quantity = qtyIssue.message;
      }
    }
    return errors;
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      description: "",
      amount: "0,00",
      category: "Mercearia",
      quantity: "1",
      quantityDesired: "",
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
        if (path === "quantity" && !fieldErrors.quantity) fieldErrors.quantity = issue.message;
      }
      if (Object.keys(fieldErrors).length > 0) {
        formik.setErrors(fieldErrors as any);
        return;
      }
    }
    const sanitized = validation.success ? validation.data : candidate;
    const data: any = {
      amount: (sanitized as any).amount,
      quantity: (sanitized as any).quantity,
      description: (sanitized as any).description,
      category: (sanitized as any).category,
      quantityDesired: (sanitized as any).quantityDesired,
    };
    // For simplified mode original sent quantityDesired "" when empty; store will normalize to 1
    if (!formValues.quantityDesired) {
      data.quantityDesired = 1;
    }
    await addTransaction(data);
    onClose();
  }

  function moeda(e: string): string {
    let value: string = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  return (
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar produto ao estoque</Text>
      <Text style={{ color: text, marginBottom: 16 }}>Adicione itens para suas compras de mercado.</Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Descrição</Text>
      <TextInput
        placeholder="Descrição"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("description", t)}
        value={formik.values.description}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.description && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.description}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Categoria</Text>
      <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", marginBottom: 12 }}>
        <Picker
          selectedValue={formik.values.category ?? "Mercearia"}
          onValueChange={(itemValue: string) =>
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
        keyboardType="decimal-pad"
        placeholder="Valor"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("amount", moeda(t))}
        value={formik.values.amount}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Quantidade</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder="Quantidade"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("quantity", t)}
        value={formik.values.quantity}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      />
      {formik.errors.quantity && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.quantity}</Text>
      )}

      {!marketSimplifiedItems && (
        <>
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Quantidade desejada</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Quantidade desejada"
            placeholderTextColor="#a1a1aa"
            onChangeText={(t: string) =>
              formik.setFieldValue("quantityDesired", t)
            }
            value={formik.values.quantityDesired}
            style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
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
        <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
      </Pressable>
    </ScrollView>
  );
}
