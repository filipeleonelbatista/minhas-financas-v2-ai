import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calcGoalProgress, getDaysRemaining, getCategoryIcon } from '../../repositories/goal';
import { useSettingsStore } from '../../stores/settings';

// CTA reacticx wrapper: try to load reacticx, fallback to purple button
let CTAButton: any = null;
try {
  const reacticx = require('reacticx');
  CTAButton = reacticx.CTAButton ?? reacticx.CTA ?? null;
} catch {
  CTAButton = null;
}

let ProgressBar: any = null;
try {
  ProgressBar = require('react-native-progress').Bar;
} catch {
  ProgressBar = null;
}

export interface GoalCardProps {
  goal: {
    id: string;
    description: string;
    amount: number;
    currentAmount: number;
    date: number;
    icon?: string;
    category?: string;
  };
  onDeposit?: (goal: any) => void;
  onPress?: (goal: any) => void;
  testID?: string;
  style?: ViewStyle;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GoalCard({ goal, onDeposit, onPress, testID, style }: GoalCardProps) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";
  const progress = calcGoalProgress(goal);
  const days = getDaysRemaining(goal);
  const isConcluded = progress >= 1;
  const category = goal.category ?? 'outros';
  const iconName: any = goal.icon ?? getCategoryIcon(category);

  const prazoText = isConcluded
    ? 'Concluída'
    : days < 0
    ? `Vencida há ${Math.abs(days)} dias`
    : days === 0
    ? 'Vence hoje'
    : days <= 30
    ? `Restam ${days} dias`
    : `${days} dias restantes`;

  const progressPercent = Math.round(progress * 100);

  // Cores que respeitam darkmode - versões mais escuras e menos vivas no escuro
  const badgeConfig = (() => {
    if (isConcluded) {
      return isDark
        ? { bg: "#14532d", border: "#166534", text: "#86efac" }
        : { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d" };
    }
    if (days < 0) {
      return isDark
        ? { bg: "#7f1d1d", border: "#991b1b", text: "#fecaca" }
        : { bg: "#fee2e2", border: "#fecaca", text: "#b91c1c" };
    }
    if (days <= 7) {
      return isDark
        ? { bg: "#78350f", border: "#92400e", text: "#fde68a" }
        : { bg: "#fef3c7", border: "#fde68a", text: "#b45309" };
    }
    return isDark
      ? { bg: "#3f3f46", border: "#52525b", text: "#a1a1aa" }
      : { bg: "#f3f4f6", border: "#e7e5e4", text: "#52525b" };
  })();

  const iconBg = isDark ? "#3f3f46" : "#f3e8ff";
  const iconColor = isDark ? "#c4b5fd" : "#581C87";
  const categoryColor = isDark ? "#c4b5fd" : "#9c44dc";

  const CardContent = (
    <View
      testID={testID ?? `goal-card-${goal.id}`}
      style={[
        {
          backgroundColor: bgCard,
          borderRadius: 4,
          padding: 12,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.15 : 0.08,
          elevation: 2,
          borderWidth: 1,
          borderColor: isDark ? "#3f3f46" : "#e7e5e4",
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#52525b" : "transparent" }}>
            <Feather name={iconName} size={18} color={iconColor} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: categoryColor, textTransform: "uppercase" }}>
              {category}
            </Text>
            <Text style={{ fontSize: 11, color: subText }} testID={`goal-prazo-${goal.id}`}>
              {prazoText}
            </Text>
          </View>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: badgeConfig.bg,
            borderWidth: 1,
            borderColor: badgeConfig.border,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: badgeConfig.text,
            }}
          >
            {progressPercent}%
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 15, fontWeight: "600", color: text, marginBottom: 4 }} numberOfLines={2}>
        {goal.description}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <Text style={{ fontSize: 12, color: subText, flex: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} ellipsizeMode="tail">
          {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.amount)}
        </Text>
        <Text style={{ fontSize: 12, color: subText }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {new Date(goal.date).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      <View style={{ marginBottom: 12 }} testID={`goal-progress-${goal.id}`} accessibilityLabel={`${progressPercent}%`}>
        {ProgressBar ? (
          <ProgressBar
            progress={progress}
            width={null}
            height={8}
            color={isDark ? (isConcluded ? '#15803d' : '#7c3aed') : (isConcluded ? '#16A34A' : '#581C87')}
            unfilledColor={isDark ? "#3f3f46" : "#E5E7EB"}
            borderWidth={0}
            borderRadius={8}
            style={{ width: '100%' }}
          />
        ) : (
          <View style={{ height: 8, width: "100%", backgroundColor: isDark ? "#3f3f46" : "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              testID={`goal-progress-bar-${goal.id}`}
              style={{ height: 8, borderRadius: 999, backgroundColor: isDark ? (isConcluded ? '#15803d' : '#7c3aed') : (isConcluded ? '#16A34A' : '#581C87'), width: `${progressPercent}%` }}
            />
          </View>
        )}
      </View>

      {onDeposit && !isConcluded && (
        CTAButton ? (
          <CTAButton
            testID={`goal-cta-${goal.id}`}
            variant="glow"
            onPress={() => onDeposit(goal)}
            style={{ borderRadius: 12 }}
            theme={isDark ? { background: "#7c3aed", backgroundSubtle: "#4c1d95", foreground: "#ffffff", highlight: "#ddd6fe", highlightSubtle: "#8b5cf6" } : undefined}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 14, textAlign: "center" }}>Depositar</Text>
          </CTAButton>
        ) : (
          <TouchableOpacity
            testID={`goal-cta-${goal.id}`}
            onPress={() => onDeposit(goal)}
            style={{ backgroundColor: isDark ? "#7c3aed" : "#9c44dc", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#6d28d9" : "transparent" }}
            accessibilityRole="button"
            accessibilityLabel="Depositar"
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Depositar</Text>
          </TouchableOpacity>
        )
      )}
      {isConcluded && (
        <View testID={`goal-concluded-${goal.id}`} style={{ backgroundColor: isDark ? "#14532d" : "#f0fdf4", borderWidth: 1, borderColor: isDark ? "#166534" : "#bbf7d0", borderRadius: 12, paddingVertical: 8, alignItems: "center" }}>
          <Text style={{ color: isDark ? "#86efac" : "#15803d", fontWeight: "600", fontSize: 14 }}>Meta concluída 🎉</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(goal)} activeOpacity={0.8}>
        {CardContent}
      </TouchableOpacity>
    );
  }
  return CardContent;
}
