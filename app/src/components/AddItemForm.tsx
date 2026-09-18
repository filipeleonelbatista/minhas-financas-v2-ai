import React, { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { useFormik } from "formik";
import ThemedPicker from "./ui/ThemedPicker";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, Switch } from "react-native";
import { useFinanceStore } from "../stores/finance";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { financeSchema } from "../schemas/finance.zod";
import type { FinanceRow } from "../repositories/finance";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";

const categoriesList: string[] = [
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

interface AddItemFormProps {
  onClose: () => void;
}

interface FormValues {
  description: string;
  amount: string;
  date: string;
  category: string;
  paymentDate: string;
  paymentStatus: boolean;
  isEnabled: boolean;
}

export default function AddItemForm({ onClose }: AddItemFormProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction: (dto: Partial<FinanceRow> & { amount: number; description: string }) => Promise<void> = useFinanceStore((s: any) => s.add);
  const simpleFinancesItem: boolean = useSettingsStore((s: SettingsState) => !!s.simpleFinancesItem);

  const validate = (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.description.trim()) {
      errors.description = "O campo Descrição é obrigatório";
    }
    if (!values.amount.trim()) {
      errors.amount = "O campo Valor é obrigatório";
    }
    // optional zod validation for extra sanitization feedback
    if (values.description.trim() && values.amount.trim()) {
      const parsedAmount = parseFloat(values.amount.replaceAll(".", "").replace(",", "."));
      const amountNum = isNaN(parsedAmount) ? 0 : parsedAmount;
      const candidate: Record<string, unknown> = {
        description: values.description,
        amount: amountNum,
        category: values.category,
        date: Date.now(),
        paymentStatus: values.paymentStatus ? 1 : 0,
        isEnabled: values.isEnabled ? 1 : 0,
        isFavorited: 0,
      };
      const res = financeSchema.safeParse(candidate);
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
      description: "",
      amount: "",
      date: "",
      category: "Outros",
      paymentDate: "",
      paymentStatus: false,
      isEnabled: true,
    },
    validate,
    onSubmit: (values: FormValues) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues: FormValues): Promise<void> {
    const submittedDate: string[] | null = formValues.date !== "" ? formValues.date.split("/") : null;
    const submittedPaymentDate: string[] | null =
      formValues.paymentDate !== "" ? formValues.paymentDate.split("/") : null;
    const parsedAmount = parseFloat(formValues.amount.replaceAll(".", "").replace(",", "."));
    const data: Record<string, unknown> = {
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
    const validation = financeSchema.safeParse(data);
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
    const sanitized = validation.success ? validation.data : data;
    const finalData = {
      amount: (sanitized as any).amount,
      date: (sanitized as any).date,
      paymentDate: (sanitized as any).paymentDate ?? null,
      description: (sanitized as any).description,
      category: (sanitized as any).category,
      paymentStatus: (sanitized as any).paymentStatus,
      isEnabled: (sanitized as any).isEnabled,
      isFavorited: 0,
    };
    try {
      await addTransaction(finalData as any);
    } catch (e) {
      console.error("Add transaction failed", e);
    }
    onClose();
  }

  function moeda(e: string): string {
    let value: string = e;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }
  const toggleSwitch = (): void => {
    if (formik.values.isEnabled) {
      formik.setFieldValue("category", "Ganhos");
    } else {
      formik.setFieldValue("category", "Outros");
    }

    formik.setFieldValue("isEnabled", !formik.values.isEnabled);
  };

  const toggleSwitchPaymentStatus = (): void => {
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

  const onChange = (_event: unknown, selectedDate?: Date): void => {
    const currentDate = selectedDate as Date;
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

  const onChangePaymentDate = (_event: unknown, selectedDate?: Date): void => {
    const currentDate = selectedDate as Date;
    if (!currentDate) return;
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
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
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
        onChangeText={(t: string) => formik.setFieldValue("description", t)}
        value={formik.values.description}
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
        onChangeText={(t: string) => formik.setFieldValue("amount", moeda(t))}
        value={formik.values.amount}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data de vencimento</Text>
      <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
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
          <View style={{ marginBottom: 12 }}>
            <ThemedPicker
              testID="add-category-picker"
              selectedValue={formik.values.category ?? "Outros"}
              onValueChange={(v: string) => formik.setFieldValue("category", v)}
              items={categoriesList.filter((_, i) => i !== 0).map((cat: string) => ({ label: cat, value: cat }))}
            />
          </View>
          {formik.errors.category && (
            <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.category}</Text>
          )}
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data do pagamento</Text>
          <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange: onChangePaymentDate, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
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
        onPress={() => formik.submitForm()}
        style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
      </Pressable>
    </ScrollView>
  );
}
