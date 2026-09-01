import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";

/**
 * Abre o DatePicker Android com tema roxo (primária #9c44dc) e respeitando darkMode.
 * - Botões (OK/Cancel) em roxo via positiveButton/negativeButton.textColor
 * - No iOS usa accentColor + themeVariant
 * - Extensível para design material se necessário
 */
export type ThemedDatePickerOptions = {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  isDark?: boolean;
  mode?: "date" | "time";
  display?: "default" | "spinner" | "calendar" | "clock";
};

export function openThemedDatePicker({
  value,
  onChange,
  isDark = false,
  mode = "date",
  display = "default",
}: ThemedDatePickerOptions) {
  const safeValue = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  const purple = PURPLE_600;

  // Android: tint dos botões em roxo; iOS: accentColor + themeVariant via cast any (tipagem Android não expõe)
  const common: any = {
    value: safeValue,
    onChange,
    mode,
    display,
    is24Hour: false,
    positiveButton: { textColor: purple },
    negativeButton: { textColor: purple },
    // Força tema claro/escuro no iOS e tenta influenciar Android Material (ignorado se não suportado não quebra)
    themeVariant: isDark ? "dark" : "light",
    accentColor: purple,
  };

  // Remove props não suportadas por display material warnings (mantém compat)
  try {
    DateTimePickerAndroid.open(common);
  } catch (e) {
    // fallback sem theming se falhar
    DateTimePickerAndroid.open({
      value: safeValue,
      onChange,
      mode,
      display,
      is24Hour: false,
    } as any);
  }
}

// Helper para abrir a partir de string DD/MM/YYYY ou timestamp
export function parseDateInput(value: string | number | Date | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number" && !isNaN(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === "string" && value.includes("/")) {
    const [d, m, y] = value.split("/");
    const parsed = new Date(`${y}-${m}-${d}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
