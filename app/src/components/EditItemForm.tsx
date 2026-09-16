import React, { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import ThemedAlert from "./ui/ThemedAlert";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity, Switch } from "react-native";
import { useFinanceStore } from "../stores/finance";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { financeSchema } from "../schemas/finance.zod";
import type { FinanceRow } from "../repositories/finance";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";
const GREEN_500 = "#22c55e";
const RED_500 = "#ef4444";

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

interface EditItemFormProps {
  onClose: () => void;
  selectedTransaction: FinanceRow;
  initialEditable?: boolean;
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

export default function EditItemForm({ onClose, selectedTransaction, initialEditable = false }: EditItemFormProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";

  const [isEditable, setIsEditable] = useState<boolean>(initialEditable);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  useEffect(() => {
    setIsEditable(initialEditable);
  }, [initialEditable, selectedTransaction?.id]);

  const simpleFinancesItem: boolean = useSettingsStore((s: SettingsState) => !!s.simpleFinancesItem);

  function moeda(e: string | number): string {
    let value: string = String(e);
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d)(\d{2})$/, "$1,$2");
    value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return value;
  }

  const updateTransaction: (id: string, dto: Partial<FinanceRow>) => Promise<void> = useFinanceStore((s: any) => s.update);
  const deleteTransaction: (dto: FinanceRow) => Promise<void> = useFinanceStore((s: any) => s.remove);

  const validate = (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.description.trim()) {
      errors.description = "O campo Descrição é obrigatório";
    }
    if (!values.amount.trim()) {
      errors.amount = "O campo Valor é obrigatório";
    }
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
        isFavorited: selectedTransaction.isFavorited ?? 0,
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
      description: selectedTransaction.description,
      amount: moeda(selectedTransaction.amount.toFixed(2)),
      date:
        selectedTransaction.date !== ("" as unknown as number) && selectedTransaction.date
          ? new Date(selectedTransaction.date).toLocaleDateString("pt-BR")
          : "",
      paymentDate:
        selectedTransaction.paymentDate !== ("" as unknown as number) && selectedTransaction.paymentDate
          ? new Date(selectedTransaction.paymentDate as number).toLocaleDateString(
              "pt-BR"
            )
          : "",
      paymentStatus: selectedTransaction.paymentStatus === 1,
      category: selectedTransaction.category ?? "Outros",
      isEnabled: selectedTransaction.isEnabled === 1,
    },
    validate,
    onSubmit: (values: FormValues) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues: FormValues): Promise<void> {
    const submittedDate: string[] | false = formValues.date !== "" && formValues.date.split("/");
    const submittedPaymentDate: string[] | string =
      formValues.paymentDate !== "" ? formValues.paymentDate.split("/") : "";

    const parsedAmount = parseFloat(
        formValues.amount.replaceAll(".", "").replace(",", ".")
      );
    const rawData: Record<string, unknown> = {
      ...selectedTransaction,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      date:
        formValues.date !== ""
          ? new Date(
              `${(submittedDate as string[])[2]}-${(submittedDate as string[])[1]}-${(submittedDate as string[])[0]}`
            ).getTime() + 43200000
          : ("" as unknown as number),
      paymentDate:
        formValues.paymentDate !== ""
          ? new Date(
              `${(submittedPaymentDate as string[])[2]}-${(submittedPaymentDate as string[])[1]}-${(submittedPaymentDate as string[])[0]}`
            ).getTime() + 43200000
          : "",
      description: formValues.description,
      category: formValues.isEnabled ? formValues.category : "Ganhos",
      paymentStatus: formValues.paymentStatus ? 1 : 0,
      isEnabled: formValues.isEnabled ? 1 : 0,
    };

    // Validate via zod - handle date being empty string as optional
    const candidateForValidation: Record<string, unknown> = {
      description: rawData.description,
      amount: rawData.amount,
      category: rawData.category,
      date: typeof rawData.date === "number" && !isNaN(rawData.date as number) ? rawData.date : Date.now(),
      paymentDate: typeof rawData.paymentDate === "number" ? rawData.paymentDate : null,
      paymentStatus: rawData.paymentStatus,
      isEnabled: rawData.isEnabled,
      isFavorited: selectedTransaction.isFavorited ?? 0,
    };
    const validation = financeSchema.safeParse(candidateForValidation);
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
    const sanitized = validation.success ? validation.data : candidateForValidation;
    const finalDto: Partial<FinanceRow> = {
      amount: (sanitized as any).amount,
      date: (sanitized as any).date as number,
      paymentDate: (sanitized as any).paymentDate ?? null,
      description: (sanitized as any).description,
      category: (sanitized as any).category,
      paymentStatus: (sanitized as any).paymentStatus,
      isEnabled: (sanitized as any).isEnabled,
      isFavorited: selectedTransaction.isFavorited,
    };
    // Preserve empty date behavior from original if needed
    if (formValues.date === "") {
      (finalDto as any).date = "";
    }
    if (formValues.paymentDate === "") {
      (finalDto as any).paymentDate = "";
    }
    await updateTransaction((selectedTransaction as FinanceRow).id, finalDto as any);
    onClose();
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
        <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>
          {isEditable ? "Editar" : "Visualizar"} transação
        </Text>
        <TouchableOpacity
          onPress={() => setConfirmDelete(true)}
          style={{ borderRadius: 4, borderWidth: 1, borderColor: RED_500, padding: 8, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash" size={24} color={RED_500} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 8 }}>
        {isEditable ? "Edite" : "Visualize"} informações sobre o entrada ou
        saída selecionada.
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Descrição</Text>
      <TextInput
        editable={isEditable}
        placeholder="Descrição"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("description", t)}
        value={formik.values.description}
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}
      />
      {formik.errors.description && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.description}</Text>
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
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data de vencimento</Text>
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

      {!simpleFinancesItem && (
        <>
          <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Categoria</Text>
          <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
            <Picker
              selectedValue={formik.values.category ?? "Outros"}
              onValueChange={(itemValue: string) =>
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
              {categoriesList.map((cat: string, index: number) =>
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
          <Pressable onPress={() => isEditable && openThemedDatePicker({ value: new Date(), onChange: onChangePaymentDate, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
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
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.isEnabled}</Text>
      )}
      <Text style={{ fontSize: 14, color: text, marginBottom: 12 }}>
        Deixe marcado caso esteja adicionando uma saída (Despesa).
      </Text>

      {!simpleFinancesItem && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
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
          onPress={() => formik.submitForm()}
          style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      )}

      <ThemedAlert
        visible={confirmDelete}
        title="Excluir lançamento"
        message={`Deseja excluir "${selectedTransaction.description}"?`}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => { await deleteTransaction(selectedTransaction); setConfirmDelete(false); onClose(); }}
        onCancel={() => setConfirmDelete(false)}
        onClose={() => setConfirmDelete(false)}
        testID="finance-edit-delete-alert"
        confirmTestID="confirm-delete-finance-edit"
        cancelTestID="cancel-delete-finance-edit"
      />

      <View style={{ height: 64, width: "100%" }} />
    </ScrollView>
  );
}
