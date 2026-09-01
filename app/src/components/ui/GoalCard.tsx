import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calcGoalProgress, getDaysRemaining, getCategoryIcon } from '../../repositories/goal';
import { useSettingsStore } from '../../stores/settings';

// CTA reacticx wrapper: try to load reacticx, fallback to purple button
let CTAButton: any = null;
try {
  // eslint-disable-next-line global-require
  const reacticx = require('reacticx');
  CTAButton = reacticx.CTAButton ?? reacticx.CTA ?? null;
} catch {
  CTAButton = null;
}

let ProgressBar: any = null;
try {
  // eslint-disable-next-line global-require
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

  const CardContent = (
    <View
      testID={testID ?? `goal-card-${goal.id}`}
      style={[
        {
          backgroundColor: bgCard,
          borderRadius: 4,
          padding: 12,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          elevation: 2,
          borderWidth: 1,
          borderColor: isDark ? "#3f3f46" : "#e7e5e4",
        },
        style,
      ]}
    >
      {/* Header: icon + category + prazo - estilo Finances */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#3f3f46" : "#f3e8ff", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
            <Feather name={iconName} size={18} color="#581C87" />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#9c44dc", textTransform: "uppercase" }}>
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
            backgroundColor: isConcluded ? "#dcfce7" : days < 0 ? "#fee2e2" : days <= 7 ? "#fef3c7" : isDark ? "#3f3f46" : "#f3f4f6",
            borderWidth: 1,
            borderColor: isConcluded ? "#bbf7d0" : days < 0 ? "#fecaca" : days <= 7 ? "#fde68a" : isDark ? "#52525b" : "#e7e5e4",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isConcluded ? "#15803d" : days < 0 ? "#b91c1c" : days <= 7 ? "#b45309" : subText,
            }}
          >
            {progressPercent}%
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 15, fontWeight: "600", color: text, marginBottom: 4 }} numberOfLines={2}>
        {goal.description}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: subText }}>
          {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.amount)}
        </Text>
        <Text style={{ fontSize: 12, color: subText }}>
          {new Date(goal.date).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ marginBottom: 12 }} testID={`goal-progress-${goal.id}`} accessibilityLabel={`${progressPercent}%`}>
        {ProgressBar ? (
          <ProgressBar
            progress={progress}
            width={null}
            height={8}
            color={isConcluded ? '#16A34A' : '#581C87'}
            unfilledColor={isDark ? "#3f3f46" : "#E5E7EB"}
            borderWidth={0}
            borderRadius={8}
            style={{ width: '100%' }}
          />
        ) : (
          <View style={{ height: 8, width: "100%", backgroundColor: isDark ? "#3f3f46" : "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              testID={`goal-progress-bar-${goal.id}`}
              style={{ height: 8, borderRadius: 999, backgroundColor: isConcluded ? '#16A34A' : '#581C87', width: `${progressPercent}%` }}
            />
          </View>
        )}
      </View>

      {/* CTA Depositar - reacticx glow variant fallback */}
      {onDeposit && !isConcluded && (
        CTAButton ? (
          <CTAButton
            testID={`goal-cta-${goal.id}`}
            variant="glow"
            onPress={() => onDeposit(goal)}
            style={{ borderRadius: 12 }}
          >
            <Text className="text-white font-bold text-sm text-center">Depositar</Text>
          </CTAButton>
        ) : (
          <TouchableOpacity
            testID={`goal-cta-${goal.id}`}
            onPress={() => onDeposit(goal)}
            className="bg-purple-600 active:bg-purple-900 rounded-xl py-2.5 items-center"
            accessibilityRole="button"
            accessibilityLabel="Depositar"
          >
            <Text className="text-white font-bold text-sm">Depositar</Text>
          </TouchableOpacity>
        )
      )}
      {isConcluded && (
        <View testID={`goal-concluded-${goal.id}`} className="bg-green-50 border border-green-200 rounded-xl py-2 items-center">
          <Text className="text-green-700 font-semibold text-sm">Meta concluída 🎉</Text>
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
