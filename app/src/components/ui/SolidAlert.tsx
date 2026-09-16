import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Variant = 'danger' | 'success' | 'warning' | 'info';

interface SolidAlertProps {
  variant?: Variant;
  message: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantConfig: Record<Variant, { bg: string; icon: string; border: string }> = {
  danger: { bg: '#ef4444', icon: 'alert-triangle', border: '#dc2626' },
  success: { bg: '#22c55e', icon: 'check-circle', border: '#16a34a' },
  warning: { bg: '#eab308', icon: 'alert-circle', border: '#ca8a04' },
  info: { bg: '#3b82f6', icon: 'info', border: '#2563eb' },
};

export default function SolidAlert({ variant = 'info', message, onClose, style, testID = 'solid-alert' }: SolidAlertProps) {
  const cfg = variantConfig[variant];
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: cfg.border }, style]}>
      <Feather name={cfg.icon as any} size={16} color="white" />
      <Text style={{ flex: 1, color: 'white', fontSize: 13, fontWeight: '600' }}>{message}</Text>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={8} testID={`${testID}-close`} style={{ padding: 4 }}>
          <Feather name="x" size={14} color="white" />
        </Pressable>
      )}
    </View>
  );
}

export type { Variant };
