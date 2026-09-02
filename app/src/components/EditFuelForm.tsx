import React, { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { openThemedDatePicker } from "../utils/datePicker";
import { Picker } from "@react-native-picker/picker";
import { useFormik } from "formik";
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from "react-native";
import * as Yup from "yup";
import { useRunsStore } from "../stores/runs";
import { useSettingsStore } from "../stores/settings";
import ThemedAlert from "./ui/ThemedAlert";

const PURPLE_600 = "#9c44dc";

const types = ["Gasolina comum","Gasolina aditivada","Etanol","Etanol aditivada","Carga elétrica","GNV","Dísel","Dísel-S10","Dísel aditivado"];

export default function EditFuelForm({ onClose, selectedRun, initialEditable = false }: any) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const [isEditable, setIsEditable] = useState(initialEditable);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setIsEditable(initialEditable); }, [initialEditable, selectedRun?.id]);

  const update = useRunsStore((s) => s.update);
  const remove = useRunsStore((s) => s.remove);

  function moeda(e: string) {
    let v = e.replace(/\D/g, "");
    v = v.replace(/(\d)(\d{2})$/, "$1,$2");
    v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return v;
  }

  const formSchema = useMemo(() => Yup.object().shape({
    currentDistance: Yup.string().required("Obrigatório"),
    unityAmount: Yup.string().required("Obrigatório"),
    amount: Yup.string().required("Obrigatório"),
    type: Yup.string().required("Obrigatório"),
    date: Yup.string().required("Obrigatório"),
    location: Yup.string().required("Obrigatório"),
  }), []);

  const formik = useFormik({
    initialValues: {
      currentDistance: String(selectedRun.currentDistance ?? ""),
      unityAmount: moeda(Number(selectedRun.unityAmount).toFixed(2)),
      amount: moeda(Number(selectedRun.amount).toFixed(2)),
      type: selectedRun.type ?? "Gasolina comum",
      date: selectedRun.date ? new Date(selectedRun.date).toLocaleDateString("pt-BR") : "",
      location: selectedRun.location ?? "",
    },
    validationSchema: formSchema,
    onSubmit: (values) => handleSubmit(values),
  });

  async function handleSubmit(values: any) {
    const parts = values.date.split("/");
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() + 43200000;
    const data = {
      currentDistance: parseFloat(String(values.currentDistance).replace(",", ".")),
      unityAmount: parseFloat(values.unityAmount.replaceAll(".", "").replace(",", ".")),
      amount: parseFloat(values.amount.replaceAll(".", "").replace(",", ".")),
      type: values.type,
      date,
      location: values.location,
    };
    await update(selectedRun.id, data);
    onClose();
  }

  const onChange = (_: any, d?: Date) => {
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
      <View style={{ borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#27272a" : "white", opacity: isEditable ? 1 : 0.6, marginBottom: 12 }}>
        <Picker selectedValue={formik.values.type} onValueChange={(v) => formik.setFieldValue("type", v)} mode="dropdown" dropdownIconColor={PURPLE_600} enabled={isEditable} style={{ width: "100%", color: text, height: 48 }}>
          {types.map((t) => <Picker.Item key={t} label={t} value={t} />)}
        </Picker>
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
