// @ts-nocheck
import React, { useMemo } from "react";

import { useNavigation } from "@react-navigation/native";
import { useFormik } from "formik"
import { z } from "zod";
import { listSchema } from "../schemas/list.zod";;
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useListsStore } from "../stores/lists";
import { useSettingsStore } from "../stores/settings";

const PURPLE_600 = "#9c44dc";

export default function EditListForm({ onClose }) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const navigation = useNavigation();

  const selectedList = useListsStore((s) => s.selectedList);
  const load = useListsStore((s) => s.load);

  const formSchema = useMemo(() => {
    return z.object({
      description: z.string().min(1, "O campo Nome da lista é obrigatório"),
      location: z.string(),
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      description: selectedList?.description ?? "",
      location: selectedList?.location ?? "",
    },
    validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
    onSubmit: (values) => {
      handleSubmitForm(values);
    },
  });

  async function handleSubmitForm(formValues) {
    try {
      const createdList = {
        ...selectedList,
        description: formValues.description,
        location: formValues.location,
      };

      const { listRepo } = require("../repositories/list");
      await listRepo.update(createdList.id, createdList);
      await load();
      useListsStore.setState({ selectedList: createdList });

      onClose();
    } catch (error) {
      console.log("ERROR", error);
    }
  }

  return (
    <ScrollView style={{ width: "100%", paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>
        Editar informações da Lista
      </Text>
      <Text style={{ color: text, marginBottom: 16 }}>
        Edite os dados da sua lista.
      </Text>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Nome da lista</Text>
        <TextInput
          placeholder="Nome da lista"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("description", t)}
          value={formik.values.description}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.description && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.description}</Text>
        )}
      </View>

      <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
        <Text style={{ color: text }}>Local de compra</Text>
        <TextInput
          placeholder="Local de compra"
          placeholderTextColor="#a1a1aa"
          onChangeText={(t) => formik.setFieldValue("location", t)}
          value={formik.values.location}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
        />
        {formik.errors.location && (
          <Text style={{ color: "#dc2626" }}>{formik.errors.location}</Text>
        )}
        <Text style={{ color: text, fontSize: 12 }}>
          Esse local será usado para criar os itens da sua lista. Ao adicionar
          um item na lista você poderá mudar isso se preferir.
        </Text>
      </View>

      <Pressable
        onPress={formik.submitForm}
        className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
        style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Atualizar</Text>
      </Pressable>
    </ScrollView>
  );
}
