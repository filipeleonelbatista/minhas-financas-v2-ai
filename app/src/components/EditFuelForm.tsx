import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { useFormik } from "formik";
import ThemedPicker from "./ui/ThemedPicker";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";
import ThemedAlert from "./ui/ThemedAlert";
import { runSchema } from "../schemas/run.zod";

const PURPLE_600 = "#9c44dc";

const types = ["Gasolina comum","Gasolina aditivada","Etanol","Etanol aditivada","Carga elétrica","GNV","Dísel","Dísel-S10","Dísel aditivado"];

interface EditFuelFormProps {
  onClose: () => void;
  selectedRun: { id: string; currentDistance?: number; unityAmount?: number; amount?: number; type?: string; date?: number; location?: string };
  initialEditable?: boolean;
}

interface EditFormValues {
  currentDistance: string;
  unityAmount: string;
  amount: string;
  type: string;
  date: string;
  location: string;
}

export default function EditFuelForm({ onClose, selectedRun, initialEditable = false }: EditFuelFormProps): React.JSX.Element {
  const colorModeState = useSettingsStore((s) => s.colorModeState as string);
  const isDark: boolean = colorModeState === "dark";
  const text: string = isDark ? "#e4e4e7" : "#52525b";
  const [isEditable, setIsEditable] = useState<boolean>(initialEditable);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  useEffect(() => { setIsEditable(initialEditable); }, [initialEditable, selectedRun?.id]);

  const update = useRunsStore((s) => s.update);
  const remove = useRunsStore((s) => s.remove);

  function moeda(e: string): string {
    let v: string = e.replace(/\D/g, "");
    v = v.replace(/(\d)(\d{2})$/, "$1,$2");
    v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return v;
  }

  const validate = (values: EditFormValues): Partial<Record<keyof EditFormValues, string>> => {
    const errors: Partial<Record<keyof EditFormValues, string>> = {};
    if (!values.currentDistance.trim()) errors.currentDistance = "Obrigatório";
    if (!values.unityAmount.trim()) errors.unityAmount = "Obrigatório";
    if (!values.amount.trim()) errors.amount = "Obrigatório";
    if (!values.type.trim()) errors.type = "Obrigatório";
    if (!values.date.trim()) errors.date = "Obrigatório";
    if (!values.location.trim()) errors.location = "Obrigatório";
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

  const formik = useFormik<EditFormValues>({
    initialValues: {
      currentDistance: String(selectedRun.currentDistance ?? ""),
      unityAmount: moeda(Number(selectedRun.unityAmount ?? 0).toFixed(2)),
      amount: moeda(Number(selectedRun.amount ?? 0).toFixed(2)),
      type: selectedRun.type ?? "Gasolina comum",
      date: selectedRun.date ? new Date(selectedRun.date).toLocaleDateString("pt-BR") : "",
      location: selectedRun.location ?? "",
    },
    validate,
    onSubmit: (values: EditFormValues) => { void handleSubmit(values); },
  });

  async function handleSubmit(values: EditFormValues): Promise<void> {
    const parts = values.date.split("/");
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() + 43200000;
    const parsedDistance = parseFloat(values.currentDistance.replaceAll(".", "").replace(",", "."));
    const rawCandidate: Record<string, unknown> = {
      currentDistance: isNaN(parsedDistance) ? 0 : parsedDistance,
      unityAmount: values.unityAmount,
      amount: values.amount,
      type: values.type,
      date,
      location: values.location,
    };
    const validation = runSchema.safeParse(rawCandidate);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof EditFormValues, string>> = {};
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
        formik.setErrors(fieldErrors as Record<string, string>);
        return;
      }
    }
    const dataValidated = validation.success ? validation.data : (rawCandidate as { currentDistance: number; unityAmount: unknown; amount: unknown; type: string; date: number; location: string });
    const data = {
      currentDistance: Number((dataValidated as { currentDistance: number }).currentDistance) || 0,
      unityAmount: Number((dataValidated as { unityAmount: number }).unityAmount),
      amount: Number((dataValidated as { amount: number }).amount),
      type: String((dataValidated as { type: string }).type),
      date: Number((dataValidated as { date: number }).date),
      location: String((dataValidated as { location: string }).location),
    };
    await update(selectedRun.id, data);
    onClose();
  }

  const onChange = (_: unknown, d?: Date): void => {
    if (!d) return;
    formik.setFieldValue("date", `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`);
  };

  return (
    <ScrollView style={{ flex: 1, width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {!isEditable ? (
          <TouchableOpacity onPress={() => setIsEditable(true)} style={{ borderRadius: 4, borderWidth: 1, borderColor: "#22c55e", padding: 8, alignItems: "center", justifyContent: "center" }}>
            <Feather name="edit" size={24} color="#22c55e" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>{isEditable ? "Editar" : "Visualizar"} abastecimento</Text>
        <TouchableOpacity onPress={() => setConfirmDelete(true)} style={{ borderRadius: 4, borderWidth: 1, borderColor: "#ef4444", padding: 8, alignItems: "center", justifyContent: "center" }}>
          <Feather name="trash" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <Text style={{ color: text, marginBottom: 8 }}>{isEditable ? "Edite" : "Visualize"} informações do abastecimento.</Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Local</Text>
      <TextInput editable={isEditable} placeholder="Local" placeholderTextColor="#a1a1aa" onChangeText={(t) => formik.setFieldValue("location", t)} value={formik.values.location} style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }} />
      {formik.errors.location && <Text style={{ color: "#dc2626", marginBottom: 8 }}>{formik.errors.location as any}</Text>}

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Km Atual</Text>
      <TextInput editable={isEditable} keyboardType="decimal-pad" placeholder="Km Atual" placeholderTextColor="#a1a1aa" onChangeText={(t) => formik.setFieldValue("currentDistance", t)} value={formik.values.currentDistance} style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor do litro</Text>
      <TextInput editable={isEditable} keyboardType="decimal-pad" placeholder="Valor do litro" placeholderTextColor="#a1a1aa" onChangeText={(t) => formik.setFieldValue("unityAmount", moeda(t))} value={formik.values.unityAmount} style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Valor pago</Text>
      <TextInput editable={isEditable} keyboardType="decimal-pad" placeholder="Valor pago" placeholderTextColor="#a1a1aa" onChangeText={(t) => formik.setFieldValue("amount", moeda(t))} value={formik.values.amount} style={{ color: text, backgroundColor: isDark ? "#3f3f46" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: isEditable ? 1 : 0.6, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Tipo do combustível</Text>
      <View style={{ opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
        <ThemedPicker
          testID="fuel-type-edit"
          selectedValue={formik.values.type}
          onValueChange={(v: string) => formik.setFieldValue("type", v)}
          enabled={isEditable}
          items={types.map((t) => ({ label: t, value: t }))}
        />
      </View>

      <Text style={{ fontSize: 14, fontWeight: "600", color: text, marginBottom: 4 }}>Data do abastecimento</Text>
      <Pressable onPress={() => isEditable && openThemedDatePicker({ value: new Date(), onChange, isDark })} style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
        <TextInput placeholder="DD/MM/AAAA" placeholderTextColor="#a1a1aa" value={formik.values.date} editable={false} pointerEvents="none" style={{ flex: 1, paddingHorizontal: 12, textAlignVertical: "center", color: text }} />
        <View style={{ backgroundColor: PURPLE_600, justifyContent: "center", alignItems: "center", width: 56, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
          <Feather name="calendar" size={20} color="#FFF" />
        </View>
      </Pressable>

      {isEditable && (
        <Pressable onPress={formik.submitForm} style={{ backgroundColor: PURPLE_600, marginTop: 20, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white", fontWeight: "600" }}>Salvar</Text>
        </Pressable>
      )}
      <ThemedAlert
        visible={confirmDelete}
        title="Excluir abastecimento"
        message={`Deseja excluir abastecimento em "${selectedRun.location}"?`}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => { await remove(selectedRun.id); setConfirmDelete(false); onClose(); }}
        onCancel={() => setConfirmDelete(false)}
        onClose={() => setConfirmDelete(false)}
        testID="run-edit-delete-alert"
        confirmTestID="confirm-delete-run-edit"
        cancelTestID="cancel-delete-run-edit"
      />
      <View style={{ height: 64 }} />
    </ScrollView>
  );
}
