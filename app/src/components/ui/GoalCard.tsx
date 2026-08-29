import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calcGoalProgress, getDaysRemaining, getCategoryIcon } from '../../repositories/goal';

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
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
      style={[
        { shadowColor: '#581C87', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
        style,
      ]}
    >
      {/* Header: icon + category + prazo */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-2">
            <Feather name={iconName} size={18} color="#581C87" />
          </View>
          <View>
            <Text className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              {category}
            </Text>
            <Text className="text-[11px] text-gray-400" testID={`goal-prazo-${goal.id}`}>
              {prazoText}
            </Text>
          </View>
        </View>
        <View
          className={`px-2 py-1 rounded-full ${isConcluded ? 'bg-green-100' : days < 0 ? 'bg-red-100' : days <= 7 ? 'bg-amber-100' : 'bg-gray-100'}`}
        >
          <Text
            className={`text-[11px] font-bold ${isConcluded ? 'text-green-700' : days < 0 ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-gray-600'}`}
          >
            {progressPercent}%
          </Text>
        </View>
      </View>

      <Text className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 mb-1" numberOfLines={2}>
        {goal.description}
      </Text>

      <View className="flex-row justify-between mb-2">
        <Text className="text-xs text-gray-500">
          {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.amount)}
        </Text>
        <Text className="text-xs text-gray-400">
          {new Date(goal.date).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="mb-3" testID={`goal-progress-${goal.id}`} accessibilityLabel={`${progressPercent}%`}>
        {ProgressBar ? (
          <ProgressBar
            progress={progress}
            width={null}
            height={8}
            color={isConcluded ? '#16A34A' : '#581C87'}
            unfilledColor="#E5E7EB"
            borderWidth={0}
            borderRadius={8}
            style={{ width: '100%' }}
          />
        ) : (
          <View className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <View
              testID={`goal-progress-bar-${goal.id}`}
              className={`${isConcluded ? 'bg-green-600' : 'bg-purple-600'} h-2 rounded-full`}
              style={{ width: `${progressPercent}%` as any }}
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
