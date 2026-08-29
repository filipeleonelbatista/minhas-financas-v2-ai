import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import dayjs from "dayjs";
import Header from "../components/Header";
import { financeRepo } from "../repositories/finance";
import { titheRepo, TITHE_SCRIPTURES, validateTithePercent, getMonthlyTithePreview } from "../repositories/tithe";
import { configRepo } from "../repositories/config";

// export for tests
export { TITHE_SCRIPTURES, validateTithePercent, getMonthlyTithePreview };

const GANHOS_CATEGORIES = ["Ganhos", "Investimentos"];

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function TitheSettings() {
  const navigation = useNavigation();
  const isFocused = useIsFocused ? useIsFocused() : true;

  const [percent, setPercent] = useState(10);
  const [percentText, setPercentText] = useState("10");
  const [selectedCategories, setSelectedCategories] = useState(["Ganhos"]);
  const [finances, setFinances] = useState([]);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeScripture, setActiveScripture] = useState(0);

  const load = useCallback(async () => {
    try {
      const f = await financeRepo.getAll();
      setFinances(f || []);
    } catch {
      setFinances([]);
    }
    try {
      const h = await titheRepo.getAll();
      setHistory(h || []);
    } catch {
      setHistory([]);
    }
    // load config persisted percent/categories
    try {
      const cfg = await configRepo.get();
      if (cfg) {
        if (cfg.tithePercent !== undefined && cfg.tithePercent !== null) {
          const p = validateTithePercent(cfg.tithePercent);
          setPercent(p);
          setPercentText(String(p));
        }
        if (cfg.titheCategories) {
          try {
            const parsed = typeof cfg.titheCategories === "string" ? JSON.parse(cfg.titheCategories) : cfg.titheCategories;
            if (Array.isArray(parsed) && parsed.length > 0) setSelectedCategories(parsed);
          } catch {}
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const persistConfig = useCallback(async (newPercent, newCategories) => {
    try {
      await configRepo.upsert({
        id: "config-singleton",
        tithePercent: newPercent,
        titheCategories: JSON.stringify(newCategories),
      });
    } catch {}
  }, []);

  // current month filtered list for preview
  const currentMonthList = useMemo(() => {
    const start = dayjs().startOf("month").valueOf();
    const end = dayjs().endOf("month").valueOf();
    return finances.filter((it) => {
      const d = Number(it.date);
      return d >= start && d <= end && !it.isEnabled;
    });
  }, [finances]);

  // preview uses currentMonthList filtered by selectedCategories
  const preview = useMemo(() => {
    // Ganhos list filtered: only entries whose category in selectedCategories
    const filteredBySelection = currentMonthList.filter((it) => selectedCategories.includes(it.category));
    // For display sums we use getMonthlyTithePreview but need amount based on filteredBySelection sum * percent?
    // Use calc via getMonthlyTithePreview expects full list; we trick: pass filteredBySelection as already filtered? But getMonthlyTithePreview uses calcTithePure which filters again by categories.
    // Simpler: compute directly via getMonthlyTithePreview on currentMonthList
    const p = getMonthlyTithePreview(currentMonthList, percent, selectedCategories);
    // If categories empty, p already handles warning
    // Also filteredBySelection sum check if needed for display without double filter, but p.amount already correct
    return p;
  }, [currentMonthList, percent, selectedCategories]);

  const handlePercentChange = (text) => {
    // allow comma
    setPercentText(text);
    const normalized = text.replace(",", ".");
    const num = parseFloat(normalized);
    if (isNaN(num)) return;
    const validated = validateTithePercent(num);
    // but we only set percent if within 1-100, keep text as is for typing
    // we set percent only when text is valid number; on blur we clamp
    setPercent(validated);
  };

  const commitPercent = () => {
    const num = parseFloat(percentText.replace(",", "."));
    const validated = validateTithePercent(isNaN(num) ? percent : num);
    setPercent(validated);
    setPercentText(String(validated));
    persistConfig(validated, selectedCategories);
  };

  const stepPercent = (delta) => {
    const newVal = validateTithePercent(percent + delta);
    setPercent(newVal);
    setPercentText(String(newVal));
    persistConfig(newVal, selectedCategories);
  };

  const toggleCategory = (cat) => {
    let next;
    if (selectedCategories.includes(cat)) {
      next = selectedCategories.filter((c) => c !== cat);
    } else {
      next = [...selectedCategories, cat];
    }
    setSelectedCategories(next);
    persistConfig(percent, next);
  };

  const handleMarkAsPaid = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert("Aviso", "Selecione ao menos um Ganho");
      return;
    }
    if (preview.amount === 0) {
      Alert.alert("Aviso", "Dízimo é R$ 0,00 — adicione Ganhos este mês");
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      // use currentMonthList for amount calculation (month filter)
      const result = await titheRepo.markAsPaid({
        percent,
        categories: selectedCategories,
        month,
        year,
        filteredList: currentMonthList,
      });
      Alert.alert("Dízimo pago", `Transação criada: ${result.finance.description} ${formatBRL(result.amount)}`);
      load();
    } catch (e) {
      Alert.alert("Erro", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-warmGray-50 dark:bg-gray-900" style={{ flex: 1, backgroundColor: "#f5f5f4" }}>
      <Header
        title="Dízimo JFA"
        isLeftIconComponent={
          <TouchableOpacity
            testID="back-button"
            onPress={() => navigation.goBack()}
            style={{ padding: 8, borderRadius: 999 }}
          >
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
        }
        isRightIconComponent={
          <View style={{ padding: 8 }}>
            <Feather name="heart" size={20} color="white" />
          </View>
        }
      />
      <ScrollView className="flex-1" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} testID="tithe-scroll">
        {/* Intro */}
        <View className="bg-purple-900 rounded-2xl mx-4 -mt-6 p-4" style={{ backgroundColor: "#581C87", borderRadius: 16, marginHorizontal: 16, marginTop: -16, padding: 16 }}>
          <Text className="text-white font-bold text-lg" style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Dízimo JFA</Text>
          <Text className="text-white/80 text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>
            Configure o percentual e a base de Ganhos. Tradução João Ferreira de Almeida.
          </Text>
        </View>

        {/* % do dízimo */}
        <View className="bg-white rounded-2xl mx-4 mt-4 p-4 shadow" style={{ backgroundColor: "white", borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, elevation: 2 }}>
          <Text className="text-gray-700 font-bold text-base mb-2" style={{ fontWeight: "700", color: "#374151", fontSize: 16 }} testID="label-percent">
            % do dízimo
          </Text>
          <Text className="text-xs text-gray-500 mb-3" style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Default 10, step 0.5, válido 1-100
          </Text>
          <View className="flex-row items-center" style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              testID="btn-percent-minus"
              onPress={() => stepPercent(-0.5)}
              className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#f3e8ff", alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="minus" size={20} color="#581C87" />
            </TouchableOpacity>
            <View className="flex-1 mx-3" style={{ flex: 1, marginHorizontal: 12 }}>
              <View className="border border-gray-200 rounded-xl px-3 py-2 bg-white flex-row items-center" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "white", flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  testID="input-percent"
                  value={percentText}
                  onChangeText={handlePercentChange}
                  onBlur={commitPercent}
                  keyboardType="numeric"
                  className="flex-1 text-center text-lg font-bold text-gray-800"
                  style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1f2937" }}
                  placeholder="10"
                />
                <Text style={{ color: "#6b7280", fontWeight: "600", marginLeft: 4 }}>%</Text>
              </View>
              <Text className="text-xs text-gray-400 text-center mt-1" style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
                {percent}% sobre a base selecionada
              </Text>
            </View>
            <TouchableOpacity
              testID="btn-percent-plus"
              onPress={() => stepPercent(0.5)}
              className="w-10 h-10 rounded-full bg-purple-600 items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#9c44dc", alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Seletor de base Ganhos */}
        <View className="bg-white rounded-2xl mx-4 mt-4 p-4 shadow" style={{ backgroundColor: "white", borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, elevation: 2 }}>
          <Text className="text-gray-700 font-bold text-base" style={{ fontWeight: "700", color: "#374151", fontSize: 16 }} testID="label-base">
            Base de cálculo — Ganhos
          </Text>
          <Text className="text-xs text-gray-500 mb-3" style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Selecione quais categorias contam para o dízimo
          </Text>
          {GANHOS_CATEGORIES.map((cat) => {
            const checked = selectedCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                testID={`checkbox-${cat}`}
                onPress={() => toggleCategory(cat)}
                className="flex-row items-center py-2"
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
              >
                <View
                  testID={`checkbox-box-${cat}`}
                  className={`w-6 h-6 rounded border-2 items-center justify-center ${checked ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: checked ? "#9c44dc" : "#d1d5db",
                    backgroundColor: checked ? "#9c44dc" : "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked && <Feather name="check" size={14} color="white" />}
                </View>
                <Text className={`ml-3 text-sm font-semibold ${checked ? "text-purple-700" : "text-gray-600"}`} style={{ marginLeft: 12, fontSize: 14, fontWeight: "600", color: checked ? "#581C87" : "#4b5563" }}>
                  {cat}
                </Text>
                <Feather name="dollar-sign" size={16} color={checked ? "#9c44dc" : "#9ca3af"} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })}
          {selectedCategories.length === 0 && (
            <View testID="warning-base" className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3" style={{ marginTop: 12, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 12, padding: 12 }}>
              <Text className="text-amber-700 text-sm font-semibold" style={{ color: "#b45309", fontSize: 13, fontWeight: "600" }}>
                Selecione ao menos um Ganho
              </Text>
              <Text className="text-amber-600 text-xs mt-1" style={{ color: "#d97706", fontSize: 12, marginTop: 4 }}>
                Nenhuma categoria selecionada — dízimo será R$ 0,00
              </Text>
            </View>
          )}
        </View>

        {/* Card mensal preview */}
        <View className="mx-4 mt-4 rounded-2xl p-4" style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: selectedCategories.length === 0 ? "#fffbeb" : "#f3e8ff", borderWidth: 1, borderColor: selectedCategories.length === 0 ? "#fde68a" : "#e9d5ff", elevation: 2 }} testID="card-monthly">
          <View className="flex-row justify-between items-center" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text className="text-gray-700 font-bold" style={{ fontWeight: "700", color: "#374151" }}>Este mês</Text>
            <View className="bg-white px-2 py-1 rounded-full" style={{ backgroundColor: "white", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text className="text-xs font-bold text-purple-700" style={{ fontSize: 11, fontWeight: "700", color: "#581C87" }}>
                {dayjs().format("MM/YYYY")}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600 mt-2" style={{ fontSize: 13, color: "#4b5563", marginTop: 8 }}>
            Deve pagar este mês:
          </Text>
          <Text testID="preview-amount" className="text-2xl font-bold text-purple-900 mt-1" style={{ fontSize: 26, fontWeight: "800", color: "#581C87", marginTop: 4 }}>
            {preview.formatted}
          </Text>
          <Text className="text-xs text-gray-500 mt-1" style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            {preview.warning ? "R$ 0,00 — base vazia" : `Σ selecionados (${selectedCategories.join(", ") || "nenhum"}) × ${percent}%`}
          </Text>
          {preview.warning && (
            <Text testID="preview-warning" className="text-sm font-semibold text-amber-700 mt-2" style={{ color: "#b45309", fontSize: 13, fontWeight: "600", marginTop: 8 }}>
              {preview.warning}
            </Text>
          )}
          <TouchableOpacity
            testID="btn-marcar-pago"
            onPress={handleMarkAsPaid}
            disabled={saving}
            className={`mt-4 rounded-xl py-3 items-center ${saving ? "bg-gray-300" : "bg-purple-600"}`}
            style={{ marginTop: 16, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: saving ? "#d1d5db" : "#9c44dc", opacity: preview.warning ? 0.6 : 1 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="check-circle" size={18} color="white" />
              <Text className="text-white font-bold ml-2" style={{ color: "white", fontWeight: "700", marginLeft: 8 }}>
                {saving ? "Salvando..." : "Marcar como pago"}
              </Text>
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 text-center mt-2" style={{ fontSize: 11, color: "#6b7280", textAlign: "center", marginTop: 8 }}>
            Cria saída "Dízimo - MM/AAAA" categoria Outros + histórico
          </Text>
        </View>

        {/* Histórico */}
        {history.length > 0 && (
          <View className="bg-white rounded-2xl mx-4 mt-4 p-4 shadow" style={{ backgroundColor: "white", borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, elevation: 2 }} testID="history-card">
            <Text className="text-gray-700 font-bold mb-2" style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}>Histórico de pagamentos</Text>
            {history.slice(0, 5).map((p) => (
              <View key={p.id} className="flex-row justify-between py-2 border-b border-gray-100" style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                <Text className="text-sm text-gray-600" style={{ fontSize: 13, color: "#4b5563" }}>{String(p.month).padStart(2, "0")}/{p.year}</Text>
                <Text className="text-sm font-bold text-gray-800" style={{ fontSize: 13, fontWeight: "700", color: "#1f2937" }}>{formatBRL(p.amount)}</Text>
                <Text className="text-xs text-gray-400" style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(p.date).toLocaleDateString("pt-BR")}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Escrituras JFA - carrossel */}
        <View className="mt-4" style={{ marginTop: 16 }}>
          <Text className="text-gray-700 font-bold text-base px-4 mb-2" style={{ fontWeight: "700", color: "#374151", fontSize: 16, paddingHorizontal: 16, marginBottom: 8 }} testID="scripture-title">
            Escrituras — JFA
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} testID="scripture-carousel">
            {TITHE_SCRIPTURES.map((s, idx) => (
              <View
                key={s.reference}
                testID={`scripture-${idx}`}
                className="bg-white rounded-2xl p-4 shadow"
                style={{ backgroundColor: "white", borderRadius: 16, padding: 16, width: 300, marginRight: 12, elevation: 2, borderWidth: activeScripture === idx ? 2 : 1, borderColor: activeScripture === idx ? "#9c44dc" : "#f3f4f6" }}
              >
                <View className="flex-row items-center mb-2" style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3e8ff", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    <Feather name="book-open" size={16} color="#581C87" />
                  </View>
                  <Text className="font-bold text-purple-900 flex-1" style={{ fontWeight: "700", color: "#581C87", flex: 1, fontSize: 13 }}>{s.reference}</Text>
                  <Text className="text-xs text-purple-400" style={{ fontSize: 10, color: "#c4b5fd" }}>{s.translation.includes("JFA") ? "JFA" : "JFA"}</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-5" style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>{s.text}</Text>
                <View className="mt-3 bg-purple-50 rounded-xl p-2" style={{ marginTop: 12, backgroundColor: "#f5f3ff", borderRadius: 12, padding: 8 }}>
                  <Text className="text-xs font-semibold text-purple-700" style={{ fontSize: 12, fontWeight: "600", color: "#6d28d9" }}>Reflexão</Text>
                  <Text className="text-xs text-gray-600 mt-1" style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>{s.reflection}</Text>
                </View>
                <Text className="text-xs text-gray-400 mt-2" style={{ fontSize: 10, color: "#9ca3af", marginTop: 8 }}>{s.translation}</Text>
              </View>
            ))}
          </ScrollView>
          <View className="flex-row justify-center mt-3" style={{ flexDirection: "row", justifyContent: "center", marginTop: 12 }}>
            {TITHE_SCRIPTURES.map((_, idx) => (
              <TouchableOpacity key={idx} onPress={() => setActiveScripture(idx)} testID={`dot-${idx}`} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: activeScripture === idx ? "#9c44dc" : "#e5e7eb", marginHorizontal: 4 }} />
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
