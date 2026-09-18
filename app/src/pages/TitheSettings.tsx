// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import dayjs from "dayjs";
import Header from "../components/Header";
import { financeRepo } from "../repositories/finance";
import { titheRepo, TITHE_SCRIPTURES, validateTithePercent, getMonthlyTithePreview } from "../repositories/tithe";
import { configRepo } from "../repositories/config";
import { useSettingsStore, type SettingsState } from "../stores/settings";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// export for tests
export { TITHE_SCRIPTURES, validateTithePercent, getMonthlyTithePreview };

const GANHOS_CATEGORIES = ["Ganhos", "Investimentos"];

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function TitheSettings() {
  const navigation = useNavigation();
  const isFocused = useIsFocused ? useIsFocused() : true;
  const colorModeState = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const bgCard = isDark ? "#27272a" : "white";
  const bgElevated = isDark ? "#3f3f46" : "#f9fafb";
  const text = isDark ? "#e4e4e7" : "#1f2937";
  const subText = isDark ? "#a1a1aa" : "#6b7280";
  const mutedText = isDark ? "#71717a" : "#9ca3af";
  const borderColor = isDark ? "#3f3f46" : "#e5e7eb";
  const purple = "#9c44dc";
  const purpleDark = "#581C87";
  const insets = useSafeAreaInsets();

  const [percent, setPercent] = useState(10);
  const [percentText, setPercentText] = useState("10");
  const [selectedCategories, setSelectedCategories] = useState(["Ganhos"]);
  const [finances, setFinances] = useState([]);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeScripture, setActiveScripture] = useState(0);
  const [willUsePrefix, setWillUsePrefix] = useState(false);
  const [prefixTithe, setPrefixTithe] = useState("");

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
        if (cfg.willUsePrefixToRemoveTihteSum !== undefined) setWillUsePrefix(!!cfg.willUsePrefixToRemoveTihteSum);
        if (cfg.prefixTithe !== undefined) setPrefixTithe(String(cfg.prefixTithe || ""));
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
  const persistPrefix = useCallback(async (willUse, prefix) => {
    try {
      await configRepo.upsert({ id: "config-singleton", willUsePrefixToRemoveTihteSum: willUse ? 1 : 0, prefixTithe: prefix });
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
    const p = getMonthlyTithePreview(currentMonthList, percent, selectedCategories);
    return p;
  }, [currentMonthList, percent, selectedCategories]);

  const handlePercentChange = (text) => {
    setPercentText(text);
    const normalized = text.replace(",", ".");
    const num = parseFloat(normalized);
    if (isNaN(num)) return;
    const validated = validateTithePercent(num);
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

  const handleTogglePrefix = (v) => { setWillUsePrefix(v); persistPrefix(v, prefixTithe); };
  const handleChangePrefix = (text) => { setPrefixTithe(text); persistPrefix(willUsePrefix, text); };
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

  const headerTextColor = "white";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Header
        title="Dízimo JFA"
        isShort
        isLeftIconComponent={
          <TouchableOpacity
            testID="back-button"
            onPress={() => navigation.goBack()}
            style={{ padding: 8, borderRadius: 999 }}
          >
            <Feather name="arrow-left" size={20} color={headerTextColor} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }} testID="tithe-scroll" showsVerticalScrollIndicator={false}>
        {/* HERO — redesign: monthly preview as top highlight card with gradient feel */}
        <View
          testID="card-monthly"
          style={{
            marginHorizontal: 16,
            marginTop: 4,
            borderRadius: 20,
            padding: 16,
            backgroundColor: selectedCategories.length === 0 ? (isDark ? "#422006" : "#fffbeb") : isDark ? "#2a1050" : "#581C87",
            borderWidth: 1,
            borderColor: selectedCategories.length === 0 ? (isDark ? "#92400e" : "#fde68a") : isDark ? "#6d28d9" : "#7c3aed",
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Feather name="heart" size={18} color="white" />
              </View>
              <View>
                <Text style={{ fontWeight: "700", color: "white", fontSize: 16 }}>Este mês</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{`Referência ${dayjs().format("MM/YYYY")}`}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: purpleDark }}>
                {dayjs().format("MM/YYYY")}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 14, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Deve pagar este mês
          </Text>
          <Text testID="preview-amount" style={{ fontSize: 30, fontWeight: "800", color: "white", marginTop: 4 }}>
            {preview.formatted}
          </Text>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            {preview.warning ? "R$ 0,00 — base vazia" : `Σ ${selectedCategories.join(", ") || "nenhum"} × ${percent}%`}
          </Text>
          {preview.warning && (
            <View testID="preview-warning" style={{ marginTop: 10, backgroundColor: isDark ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
              <Text style={{ color: isDark ? "#fde68a" : "white", fontSize: 12, fontWeight: "600" }}>{preview.warning}</Text>
            </View>
          )}
          <TouchableOpacity
            testID="btn-marcar-pago"
            onPress={handleMarkAsPaid}
            disabled={saving}
            style={{ marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: saving ? "#a1a1aa" : "white", opacity: preview.warning ? 0.7 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <Feather name="check-circle" size={18} color={purpleDark} />
            <Text style={{ color: purpleDark, fontWeight: "800", fontSize: 15 }}>
              {saving ? "Salvando..." : "Marcar como pago"}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 8 }}>
            Cria saída "Dízimo - MM/AAAA" categoria Outros + histórico
          </Text>
        </View>

        {/* Escrituras JFA - redesigned: section header with icon + carousel dark-aware */}
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 10, gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "#3f3f46" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
              <Feather name="book-open" size={14} color={isDark ? "#c4b5fd" : purpleDark} />
            </View>
            <Text style={{ fontWeight: "800", color: text, fontSize: 15, flex: 1 }} testID="scripture-title">
              Escrituras — JFA
            </Text>
            <Text style={{ fontSize: 11, color: mutedText }}>{TITHE_SCRIPTURES.length} passagens</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} testID="scripture-carousel">
            {TITHE_SCRIPTURES.map((s, idx) => (
              <View
                key={s.reference}
                testID={`scripture-${idx}`}
                style={{ backgroundColor: bgCard, borderRadius: 16, padding: 14, width: 300, marginRight: 2, elevation: 2, shadowColor: "#000", shadowOpacity: isDark ? 0.2 : 0.06, borderWidth: 1, borderColor: activeScripture === idx ? purple : borderColor }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? "rgba(156,68,220,0.15)" : "#f3e8ff", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    <Feather name="book-open" size={14} color={purpleDark} />
                  </View>
                  <Text style={{ fontWeight: "700", color: isDark ? "#c4b5fd" : purpleDark, flex: 1, fontSize: 12 }} numberOfLines={1}>{s.reference}</Text>
                  <View style={{ backgroundColor: isDark ? "#3f3f46" : "#f5f3ff", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 }}>
                    <Text style={{ fontSize: 9, color: isDark ? "#a1a1aa" : "#7c3aed", fontWeight: "700" }}>JFA</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: text, lineHeight: 18 }}>{s.text}</Text>
                <View style={{ marginTop: 10, backgroundColor: isDark ? "#27272a" : "#f5f3ff", borderRadius: 12, padding: 8, borderWidth: 1, borderColor: isDark ? "#3f3f46" : "#ede9fe" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#c4b5fd" : "#6d28d9" }}>Reflexão</Text>
                  <Text style={{ fontSize: 11, color: subText, marginTop: 3, lineHeight: 16 }}>{s.reflection}</Text>
                </View>
                <Text style={{ fontSize: 10, color: mutedText, marginTop: 8 }}>{s.translation}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
            {TITHE_SCRIPTURES.map((_, idx) => (
              <TouchableOpacity key={idx} onPress={() => setActiveScripture(idx)} testID={`dot-${idx}`} style={{ width: activeScripture === idx ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: activeScripture === idx ? purple : borderColor, marginHorizontal: 4 }} />
            ))}
          </View>
        </View>

        {/* Config grid: % do dízimo + Base Ganhos lado a lado em layout diferente */}
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          {/* % do dízimo - card compact with stepper */}
          <View style={{ backgroundColor: bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: borderColor, elevation: isDark ? 0 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(156,68,220,0.15)" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                <Feather name="percent" size={16} color={purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: text, fontSize: 14 }} testID="label-percent">Percentual do dízimo</Text>
                <Text style={{ fontSize: 11, color: subText }}>1–100 • passo 0,5 • padrão 10%</Text>
              </View>
              <View style={{ backgroundColor: isDark ? "#3f3f46" : "#f5f3ff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: purple }}>{percent}%</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                testID="btn-percent-minus"
                onPress={() => stepPercent(-0.5)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: borderColor }}
              >
                <Feather name="minus" size={18} color={text} />
              </TouchableOpacity>
              <View style={{ flex: 1, borderWidth: 1, borderColor: borderColor, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? "#1c1e21" : bgElevated, flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  testID="input-percent"
                  value={percentText}
                  onChangeText={handlePercentChange}
                  onBlur={commitPercent}
                  keyboardType="numeric"
                  style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: text, paddingVertical: 4 }}
                  placeholder="10"
                  placeholderTextColor={mutedText}
                />
                <Text style={{ color: subText, fontWeight: "700", marginLeft: 4 }}>%</Text>
              </View>
              <TouchableOpacity
                testID="btn-percent-plus"
                onPress={() => stepPercent(0.5)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: purple, alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="plus" size={18} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: mutedText, textAlign: "center", marginTop: 6 }}>
              {percent}% sobre a base selecionada abaixo
            </Text>
          </View>

          {/* Base Ganhos - checklist redesigned */}
          <View style={{ backgroundColor: bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: borderColor, elevation: isDark ? 0 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#f0fdf4", alignItems: "center", justifyContent: "center" }}>
                <Feather name="layers" size={16} color={isDark ? "#86efac" : "#16a34a"} />
              </View>
              <Text style={{ fontWeight: "800", color: text, fontSize: 14, flex: 1 }} testID="label-base">Base de cálculo</Text>
              <Text style={{ fontSize: 11, color: subText, backgroundColor: bgElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" }}>{selectedCategories.length} selecionada{selectedCategories.length !== 1 ? "s" : ""}</Text>
            </View>
            <Text style={{ fontSize: 11, color: subText, marginBottom: 10 }}>
              Quais categorias de entrada contam para o cálculo
            </Text>
            {GANHOS_CATEGORIES.map((cat) => {
              const checked = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  testID={`checkbox-${cat}`}
                  onPress={() => toggleCategory(cat)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: checked ? (isDark ? "rgba(156,68,220,0.12)" : "#f5f3ff") : "transparent", borderWidth: 1, borderColor: checked ? (isDark ? "rgba(156,68,220,0.3)" : "#e9d5ff") : "transparent", marginBottom: 8 }}
                >
                  <View
                    testID={`checkbox-box-${cat}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: checked ? purple : borderColor,
                      backgroundColor: checked ? purple : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {checked && <Feather name="check" size={14} color="white" />}
                  </View>
                  <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: "700", color: checked ? (isDark ? "#c4b5fd" : purpleDark) : text, flex: 1 }}>
                    {cat}
                  </Text>
                  <Feather name="dollar-sign" size={16} color={checked ? purple : mutedText} />
                  {checked && <View style={{ marginLeft: 8, backgroundColor: purple, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}><Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>ATIVO</Text></View>}
                </TouchableOpacity>
              );
            })}
            {selectedCategories.length === 0 && (
              <View testID="warning-base" style={{ marginTop: 4, backgroundColor: isDark ? "rgba(251,191,36,0.12)" : "#fffbeb", borderWidth: 1, borderColor: isDark ? "#92400e" : "#fde68a", borderRadius: 12, padding: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="alert-triangle" size={16} color={isDark ? "#fbbf24" : "#d97706"} />
                  <Text style={{ color: isDark ? "#fde68a" : "#92400e", fontSize: 12, fontWeight: "700" }}>Selecione ao menos um Ganho</Text>
                </View>
                <Text style={{ color: isDark ? "#fcd34d" : "#b45309", fontSize: 11, marginTop: 4 }}>Nenhuma categoria selecionada — dízimo será R$ 0,00</Text>
              </View>
            )}
          </View>
        </View>

        {/* Prefixo Dízimo - redesigned with icon header */}
        <View testID="card-prefix" style={{ backgroundColor: bgCard, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 14, borderWidth: 1, borderColor: borderColor, elevation: isDark ? 0 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
              <Feather name="filter" size={16} color={isDark ? "#cbd5e1" : "#475569"} />
            </View>
            <Text style={{ fontWeight: "800", color: text, fontSize: 14, flex: 1 }}>Remover por prefixo</Text>
            <View style={{ backgroundColor: willUsePrefix ? (isDark ? "rgba(34,197,94,0.15)" : "#f0fdf4") : bgElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: willUsePrefix ? (isDark ? "#86efac" : "#16a34a") : mutedText }}>{willUsePrefix ? "ATIVO" : "INATIVO"}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: subText, lineHeight: 16 }}>
            Transações com este prefixo no título são excluídas da base de cálculo. Ideal para reembolsos e transferências internas.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, backgroundColor: bgElevated, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: borderColor }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: text, flex: 1, marginRight: 12 }}>Ativar remoção por prefixo</Text>
            <Switch
              testID="switch-prefix"
              trackColor={{ false: borderColor, true: isDark ? "#581C87" : "#e9d5ff" }}
              thumbColor={willUsePrefix ? purple : isDark ? "#a1a1aa" : "#f5f5f4"}
              ios_backgroundColor={borderColor}
              onValueChange={handleTogglePrefix}
              value={willUsePrefix}
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: text, marginBottom: 6 }}>Prefixo</Text>
            <TextInput
              testID="input-prefix"
              placeholder="Ex: Reembolso"
              placeholderTextColor={mutedText}
              value={prefixTithe}
              onChangeText={handleChangePrefix}
              editable={willUsePrefix}
              style={{ borderWidth: 1, borderColor: willUsePrefix ? purple : borderColor, borderRadius: 12, padding: 12, color: text, backgroundColor: willUsePrefix ? bgCard : bgElevated, opacity: willUsePrefix ? 1 : 0.6 }}
            />
            <Text style={{ fontSize: 10, color: mutedText, marginTop: 6 }}>Se o título começar com este texto, não entra na soma.</Text>
          </View>
        </View>

        {/* Histórico - dark aware list */}
        {history.length > 0 && (
          <View style={{ backgroundColor: bgCard, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 14, borderWidth: 1, borderColor: borderColor, elevation: isDark ? 0 : 1 }} testID="history-card">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(156,68,220,0.15)" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                <Feather name="clock" size={16} color={purple} />
              </View>
              <Text style={{ fontWeight: "800", color: text, fontSize: 14, flex: 1 }}>Histórico de pagamentos</Text>
              <Text style={{ fontSize: 11, color: mutedText }}>{history.length} registro{history.length !== 1 ? "s" : ""}</Text>
            </View>
            {history.slice(0, 5).map((p) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: borderColor }}>
                    <Feather name="check" size={12} color={purple} />
                  </View>
                  <Text style={{ fontSize: 13, color: text, fontWeight: "600" }}>{String(p.month).padStart(2, "0")}/{p.year}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: text }}>{formatBRL(p.amount)}</Text>
                <Text style={{ fontSize: 11, color: mutedText }}>{new Date(p.date).toLocaleDateString("pt-BR")}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}
