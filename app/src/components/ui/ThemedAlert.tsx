import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settings';

const PURPLE_600 = "#9c44dc";
const RED_500 = "#ef4444";

type Variant = 'danger' | 'primary' | 'warning' | 'info' | 'success';

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Feather>['name'];
  confirmText?: string;
  cancelText?: string | null; // null = hide cancel
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  testID?: string;
  confirmTestID?: string;
  cancelTestID?: string;
}

const variantConfig: Record<Variant, { bg: string; border: string; icon: string; iconBg: string; iconBorder: string; buttonBg: string }> = {
  danger:   { bg: "#fee2e2", border: "#fecaca", icon: "#b91c1c", iconBg: "#fee2e2", iconBorder: "#fecaca", buttonBg: RED_500 },
  primary:  { bg: "#f3e8ff", border: "#e9d5ff", icon: PURPLE_600, iconBg: "#f3e8ff", iconBorder: "#e9d5ff", buttonBg: PURPLE_600 },
  warning:  { bg: "#fef3c7", border: "#fde68a", icon: "#b45309", iconBg: "#fef3c7", iconBorder: "#fde68a", buttonBg: "#f59e0b" },
  info:     { bg: "#dbeafe", border: "#bfdbfe", icon: "#1d4ed8", iconBg: "#dbeafe", iconBorder: "#bfdbfe", buttonBg: PURPLE_600 },
  success:  { bg: "#dcfce7", border: "#bbf7d0", icon: "#15803d", iconBg: "#dcfce7", iconBorder: "#bbf7d0", buttonBg: "#16a34a" },
};

const variantConfigDark: Record<Variant, { bg: string; border: string; icon: string; iconBg: string; iconBorder: string; buttonBg: string }> = {
  danger:   { bg: "#7f1d1d", border: "#991b1b", icon: "#fca5a5", iconBg: "#7f1d1d", iconBorder: "#991b1b", buttonBg: RED_500 },
  primary:  { bg: "#581c87", border: "#6d28d9", icon: "#c4b5fd", iconBg: "#581c87", iconBorder: "#6d28d9", buttonBg: PURPLE_600 },
  warning:  { bg: "#78350f", border: "#92400e", icon: "#fde68a", iconBg: "#78350f", iconBorder: "#92400e", buttonBg: "#f59e0b" },
  info:     { bg: "#1e3a8a", border: "#1e40af", icon: "#93c5fd", iconBg: "#1e3a8a", iconBorder: "#1e40af", buttonBg: PURPLE_600 },
  success:  { bg: "#14532d", border: "#166534", icon: "#86efac", iconBg: "#14532d", iconBorder: "#166534", buttonBg: "#16a34a" },
};

export default function ThemedAlert({
  visible,
  title,
  message,
  variant = 'primary',
  icon,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onClose,
  testID = 'themed-alert',
  confirmTestID = 'themed-alert-confirm',
  cancelTestID = 'themed-alert-cancel',
}: ThemedAlertProps) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === 'dark';
  const text = isDark ? "#e4e4e7" : "#52525b";
  const subText = isDark ? "#a1a1aa" : "#6b7280";

  const cfg = isDark ? variantConfigDark[variant] : variantConfig[variant];
  const iconName: React.ComponentProps<typeof Feather>['name'] = icon ?? (
    variant === 'danger' ? 'alert-triangle' :
    variant === 'warning' ? 'alert-circle' :
    variant === 'success' ? 'check-circle' :
    variant === 'info' ? 'info' :
    'help-circle'
  );

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };
  const handleConfirm = () => {
    onConfirm();
    // onClose é responsabilidade do caller se quiser fechar, mas default fecha
    // Não auto-fecha para permitir controle
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 }} testID={testID}>
        <View style={{ backgroundColor: isDark ? "#27272a" : "white", borderRadius: 16, padding: 20, borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#3f3f46" : "transparent" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: cfg.iconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cfg.iconBorder }}>
              <Feather name={iconName} size={24} color={cfg.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>{title}</Text>
              {variant === 'danger' && <Text style={{ fontSize: 13, color: subText, marginTop: 2 }}>Esta ação não pode ser desfeita</Text>}
            </View>
          </View>
          {message ? <Text style={{ fontSize: 14, color: text, marginBottom: 20 }}>{message}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {cancelText !== null && cancelText !== undefined && (
              <TouchableOpacity testID={cancelTestID} onPress={handleCancel} style={{ flex: 1, backgroundColor: isDark ? "#3f3f46" : "#f3f4f6", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: isDark ? 1 : 0, borderColor: isDark ? "#52525b" : "transparent" }}>
                <Text style={{ color: text, fontWeight: "700" }}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity testID={confirmTestID} onPress={handleConfirm} style={{ flex: 1, backgroundColor: cfg.buttonBg, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper para uso imperativo simples - mantém compatibilidade com Alert.alert
// Uso: const { show, hide, AlertComponent } = useThemedAlert()
export function useThemedAlert() {
  const [state, setState] = React.useState<null | ThemedAlertProps>(null);
  const show = (props: Omit<ThemedAlertProps, 'visible'>) => setState({ ...props, visible: true });
  const hide = () => setState(null);
  const AlertComponent = state ? (
    <ThemedAlert
      {...state}
      visible={!!state.visible}
      onCancel={() => { state.onCancel?.(); hide(); }}
      onConfirm={() => { state.onConfirm(); hide(); }}
      onClose={hide}
    />
  ) : null;
  return { show, hide, AlertComponent };
}
