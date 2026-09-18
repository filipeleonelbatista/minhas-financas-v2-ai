import { useSettingsStore } from "../stores/settings";

export function useColorScheme() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDarkColorScheme = colorModeState === "dark";
  // NativeWindUI espera `colors.root` como background do Picker + `colors.foreground` para texto/ícone.
  // Compatível com `colors.background`/`colors.card` já usados em Sheet.
  const background = isDarkColorScheme ? "#1c1e21" : "#f5f5f4";
  const card = isDarkColorScheme ? "#27272a" : "#ffffff";
  const foreground = isDarkColorScheme ? "#e4e4e7" : "#18181b";
  const colors = {
    background,
    card,
    root: card, // NativeWindUI Picker usa `colors.root` → surface do Picker
    foreground,
    grey5: isDarkColorScheme ? "#3f3f46" : "#e4e4e7",
    grey4: isDarkColorScheme ? "#52525b" : "#a1a1aa",
    border: isDarkColorScheme ? "#3f3f46" : "#e4e4e7",
    primary: "#9c44dc",
  };
  return { colors, isDarkColorScheme, colorScheme: colorModeState };
}
