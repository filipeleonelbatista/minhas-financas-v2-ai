import React from 'react';
import { View, Platform } from 'react-native';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { cn } from '../../lib/cn';
import { useColorScheme } from '../../lib/useColorScheme';

type Item = { label: string; value: string };

type Props = {
  selectedValue: string;
  onValueChange: (v: string) => void;
  items: Item[];
  enabled?: boolean;
  testID?: string;
  placeholder?: string;
  mode?: 'dialog' | 'dropdown';
  dropdownIconColor?: string;
  className?: string;
};

/**
 * ThemedPicker – wrapper tipado sobre NativeWindUI Picker (https://nativewindui.com/component/picker)
 * - Fidelidade ao spec: View `border-background bg-background rounded-md border` + RNPicker `style {backgroundColor: colors.root, borderRadius:8}` + `dropdownIconColor ?? colors.foreground`
 * - Itens seguem spec: <PickerItem color={colors.foreground} style={{backgroundColor: colors.root}} />
 * - Dark/Light via `useColorScheme()` (colors.root/foreground/border) – cobre todos os 16 usos mapeados.
 * - Mantém API legada `items: {label,value}[]` para compatibilidade.
 */
export default function ThemedPicker({ selectedValue, onValueChange, items, enabled = true, testID, placeholder, mode = 'dropdown', dropdownIconColor, className }: Props): React.JSX.Element {
  const { colors, isDarkColorScheme } = useColorScheme();

  // Fix borda + texto cortado:
  // - View com borderRadius 12 + overflow hidden + background colors.root (única fonte de bg). RNPicker transparente para não sobrepor borda.
  // - Sem height fixo 48 no Picker (causava corte vertical em Android com fontScale). Wrapper minHeight 48 + Picker com height auto.
  // - Removido rounded-md className conflitante; inline radius 12 prevalece.
  return (
    <View
      testID={testID ? `${testID}-wrap` : undefined}
      className={cn('ios:shadow-sm ios:shadow-black/5 border overflow-hidden', className)}
      style={{
        borderColor: colors.border,
        backgroundColor: colors.root,
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 48,
        justifyContent: 'center',
      }}
    >
      <RNPicker
        testID={testID}
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        mode={mode as any}
        enabled={enabled}
        dropdownIconColor={dropdownIconColor ?? colors.foreground}
        dropdownIconRippleColor={colors.foreground}
        style={
          {
            width: '100%',
            color: colors.foreground,
            backgroundColor: 'transparent',
          } as any
        }
        itemStyle={
          Platform.OS === 'ios'
            ? { color: colors.foreground, fontSize: 16, backgroundColor: colors.root }
            : undefined
        }
      >
        {placeholder ? (
          <RNPicker.Item label={placeholder} value="" color={isDarkColorScheme ? '#a1a1aa' : '#6b7280'} style={{ backgroundColor: colors.root } as any} />
        ) : null}
        {items.map((it) => (
          <RNPicker.Item key={it.value} label={it.label} value={it.value} color={colors.foreground} style={{ backgroundColor: colors.root } as any} />
        ))}
      </RNPicker>
    </View>
  );
}

export const ThemedPickerItem = RNPicker.Item;
