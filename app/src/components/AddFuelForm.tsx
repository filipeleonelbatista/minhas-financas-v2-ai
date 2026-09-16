import React from "react";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { useFinanceStore } from "../stores/finance";
import { runSchema } from "../schemas/run.zod";

const PURPLE_600 = "#9c44dc";

interface AddFuelFormProps {
  onClose: () => void;
}

interface FormValues {
  currentDistance: string;
  unityAmount: string;
  amount: string;
  type: string;
  date: string;
  location: string;
}

export default function AddFuelForm({ onClose }: AddFuelFormProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";

  const addTransaction: (dto: any) => Promise<void> = useRunsStore((s: any) => s.add);
  const willAddFuelToTransactionList: boolean = useSettingsStore((s: SettingsState) => !!s.willAddFuelToTransactionList);
  const financeAdd: (dto: any) => Promise<void> = useFinanceStore((s: any) => s.add);

  const validate = (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.currentDistance.trim()) {
      errors.currentDistance = "O campo Km Atual é obrigatório";
    }
    if (!values.unityAmount.trim()) {
      errors.unityAmount = "O campo Valor do litro é obrigatório";
    }
    if (!values.amount.trim()) {
      errors.amount = "O campo Valor Pago é obrigatório";
    }
    if (!values.type.trim()) {
      errors.type = "O campo Tipo do combustível é obrigatório";
    }
    if (!values.date.trim()) {
      errors.date = "O campo Data é obrigatório";
    }
    if (!values.location.trim()) {
      errors.location = "O campo Local é obrigatório";
    }
    // If required fields present, run zod validation for sanitized shape
    if (Object.keys(errors).length === 0) {
      const parts = values.date.split("/");
      let dateNum = Date.now();
      if (parts.length === 3) {
        const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() + 43200000;
        if (!isNaN(parsed)) dateNum = parsed;
      }
      const parsedDistance = parseFloat(values.currentDistance.replaceAll(".", "").replace(",", "."));
      const candidate: Record<string, unknown> = {
        currentDistance: isNaN(parsedDistance) ? 0 : parsedDistance,
        unityAmount: values.unityAmount,
        amount: values.amount,
        type: values.type,
        date: dateNum,
        location: values.location,
      };
      const res = runSchema.safeParse(candidate);
      if (!res.success) {
        for (const issue of res.error.errors) {
          const path = issue.path[0] as string;
          if (path === "currentDistance" && !errors.currentDistance) errors.currentDistance = issue.message;
          if (path === "unityAmount" && !errors.unityAmount) errors.unityAmount = issue.message;
          if (path === "amount" && !errors.amount) errors.amount = issue.message;
          if (path === "type" && !errors.type) errors.type = issue.message;
          if (path === "date" && !errors.date) errors.date = issue.message;
          if (path === "location" && !errors.location) errors.location = issue.message;
        }
      }
    }
    return errors;
  };

  const formik = useFormik<FormValues>({
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
    validate,
    onSubmit: (values: FormValues) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues: FormValues): Promise<void> {
    const submittedDate = formValues.date.split("/");
    const parsedDistance = parseFloat(formValues.currentDistance.replaceAll(".", "").replace(",", "."));
    const rawCandidate: Record<string, unknown> = {
      currentDistance: isNaN(parsedDistance) ? 0 : parsedDistance,
      type: formValues.type,
      unityAmount: formValues.unityAmount,
      amount: formValues.amount,
      date:
        new Date(
          `${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`
        ).getTime() + 43200000,
      location: formValues.location,
    };
    const validation = runSchema.safeParse(rawCandidate);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of validation.error.errors) {
        const path = issue.path[0] as string;
        if (path === "currentDistance" && !fieldErrors.currentDistance) fieldErrors.currentDistance = issue.message;
        if (path === "unityAmount" && !fieldErrors.unityAmount) fieldErrors.unityAmount = issue.message;
        if (path === "amount" && !fieldErrors.amount) fieldErrors.amount = issue.message;
        if (path === "type" && !fieldErrors.type) fieldErrors.type = issue.message;
        if (path === "date" && !fieldErrors.date) fieldErrors.date = issue.message;
        if (path === "location" && !fieldErrors.location) fieldErrors.location = issue.message;
      }
      if (Object.keys(fieldErrors).length > 0) {
        formik.setErrors(fieldErrors as any);
        return;
      }
    }
    const data = validation.success ? validation.data : (rawCandidate as any);
    // data now has sanitized numbers for amount/unityAmount and trimmed location/type
    const finalData = {
      currentDistance: Number(data.currentDistance) || 0,
      type: String(data.type),
      unityAmount: Number(data.unityAmount),
      amount: Number(data.amount),
      date: Number(data.date),
      location: String(data.location),
    };
    await addTransaction(finalData);
    if (willAddFuelToTransactionList) {
      const newPaymentTransaction = {
        description: `Abastecimento - ${finalData.location}`,
        amount: finalData.amount,
        date: finalData.date,
        category: "Transporte",
        paymentDate: finalData.date,
        paymentStatus: 1,
        isEnabled: 1,
        isFavorited: 0,
      };
      await financeAdd(newPaymentTransaction);
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

  return (
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar abastecimento</Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Adicione informações sobre o abastecimento.
      </Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Local</Text>
      <TextInput
        placeholder="Local"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("location", t)}
        value={formik.values.location}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.location && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.location}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Km Atual</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder="Km Atual"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("currentDistance", t)}
        value={formik.values.currentDistance}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.currentDistance && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.currentDistance}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor do litro</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder="Valor do litro"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) =>
          formik.setFieldValue("unityAmount", moeda(t))
        }
        value={formik.values.unityAmount}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.unityAmount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.unityAmount}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor pago</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder="Valor pago"
        placeholderTextColor="#a1a1aa"
        onChangeText={(t: string) => formik.setFieldValue("amount", moeda(t))}
        value={formik.values.amount}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
        style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
      />
      {formik.errors.amount && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.amount}</Text>
      )}
      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Tipo do combustível</Text>
      <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", marginBottom: 12 }}>
        <Picker
          selectedValue={formik.values.type ?? "Gasolina comum"}
          onValueChange={(itemValue: string) =>
            formik.setFieldValue("type", itemValue)
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
      </View>
      {formik.errors.type && (
        <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.type}</Text>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data do abastecimento</Text>
      <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange, isDark })} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
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

      <Pressable
        onPress={() => formik.submitForm()}
        className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
      </Pressable>
    </ScrollView>
  );
}
