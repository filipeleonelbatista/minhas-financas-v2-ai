// @ts-nocheck
import React from 'react';

import { Feather } from '@expo/vector-icons';
import { openThemedDatePicker } from '../utils/datePicker';
import { useFormik } from 'formik'
import { z } from "zod";
import { goalSchema } from "../schemas/goal.zod";;
import { View, Text, TextInput, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useCallback } from 'react';
import { useGoalsStore } from '../stores/goals';
import { useSettingsStore } from '../stores/settings';

const PURPLE_600 = "#9c44dc";

export default function AddGoalForm({ onClose }) {
    const colorModeState = useSettingsStore((s) => s.colorModeState);
    const isDark = colorModeState === "dark";
    const text = isDark ? "#e4e4e7" : "#52525b";

    const addTransaction = useGoalsStore((s) => s.add);

    const formSchema = useCallback(() => {
        return z.object({
            description: z.string().min(1, "O campo Descrição é obrigatório"),
            amount: z.string().min(1, "O campo Valor é obrigatório"),
            currentAmount: z.string(),
            date: z.string(),
        })
    }, [])

    const formik = useFormik({
        initialValues: {
            description: '',
            amount: '',
            currentAmount: '',
            date: '',
        },
        validate: (values: any) => { const r = (typeof formSchema === "function" ? (formSchema() as any) : (formSchema as any)).safeParse(values); if (r.success) return {}; const e: any = {}; r.error.issues.forEach((i: any) => { const k = String(i.path[0] ?? ""); if(k) e[k]=i.message; }); return e; },
        onSubmit: values => {
            handleSubmitForm(values)
        },
    });

    async function handleSubmitForm(formValues) {
        const submittedDate = formValues.date !== '' && formValues.date.split('/')
        const data = {
            currentAmount: parseFloat(formValues.currentAmount.replaceAll('.', '').replace(',', '.')),
            amount: parseFloat(formValues.amount.replaceAll('.', '').replace(',', '.')),
            date: formValues.date !== '' ? new Date(`${submittedDate[2]}-${submittedDate[1]}-${submittedDate[0]}`).getTime() + 43200000 : '',
            description: formValues.description,
        }
        await addTransaction(data)
        onClose()
    }

    function moeda(e) {
        let value = e;
        value = value.replace(/\D/g, "");
        value = value.replace(/(\d)(\d{2})$/, "$1,$2");
        value = value.replace(/(?=(\d{3})+(\D))\B/g, ".");
        return value;
    }

    const onChange = (event, selectedDate) => {
        const currentDate = selectedDate;
        formik.setFieldValue('date', `${currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate()}/${(currentDate.getMonth() + 1) < 10 ? '0' + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`);
    };


    return (
        <ScrollView
            style={{ width: "100%", paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }}
        >
            <Text style={{ fontWeight: "700", fontSize: 24, color: text }}>Adicionar Meta</Text>
            <Text style={{ color: text, marginBottom: 16 }}>
                Adicione sua meta para acompanhar em suas finanças.
            </Text>

            <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ color: text }}>Descrição</Text>
                <TextInput
                    placeholder="Descrição"
                    placeholderTextColor="#a1a1aa"
                    onChangeText={(t) => formik.setFieldValue('description', t)}
                    value={formik.values.description}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
                    style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
                />
                {formik.errors.description && (
                    <Text style={{ color: "#dc2626" }}>{formik.errors.description}</Text>
                )}
            </View>
            <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ color: text }}>Valor da meta</Text>
                <TextInput
                    keyboardType="decimal-pad"
                    placeholder="Valor da meta"
                    placeholderTextColor="#a1a1aa"
                    onChangeText={(t) => formik.setFieldValue('amount', moeda(t))}
                    value={formik.values.amount}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
                    style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
                />
                {formik.errors.amount && (
                    <Text style={{ color: "#dc2626" }}>{formik.errors.amount}</Text>
                )}
            </View>
            <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ color: text }}>Valor alcançado</Text>
                <TextInput
                    keyboardType="decimal-pad"
                    placeholder="Valor alcançado"
                    placeholderTextColor="#a1a1aa"
                    onChangeText={(t) => formik.setFieldValue('currentAmount', moeda(t))}
                    value={formik.values.currentAmount}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
                    style={{ color: text, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, padding: 12 }}
                />
                {formik.errors.currentAmount && (
                    <Text style={{ color: "#dc2626" }}>{formik.errors.currentAmount}</Text>
                )}
            </View>

            <View className="flex-col gap-2" style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ color: text }}>Data da meta</Text>
                <Pressable onPress={() => openThemedDatePicker({ value: new Date(), onChange, isDark })} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ flexDirection: "row", alignItems: "stretch", height: 48, backgroundColor: isDark ? "#27272a" : "white", borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#e4e4e7", borderRadius: 12, overflow: "hidden" }}>
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
                    <Text style={{ color: "#dc2626" }}>{formik.errors.date}</Text>
                )}
            </View>

            <Pressable
                onPress={formik.submitForm}
                className="bg-purple-600 rounded-xl p-3 mt-2 mb-8 items-center justify-center active:bg-purple-900"
                style={{ backgroundColor: PURPLE_600, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
                <Text style={{ color: "white", fontWeight: "600" }}>Adicionar</Text>
            </Pressable>
        </ScrollView>
    );
}
