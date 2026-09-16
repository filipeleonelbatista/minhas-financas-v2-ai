import React from 'react';
export const ThemeMode = { Dark: 'dark', Light: 'light' };
export const AnimationType = { CircularBlur: 'circularBlur' };
export const EasingType = { EaseInOut: 'easeInOut' };
export function ThemeProvider({ children }) { return <>{children}</>; }
export function useTheme() { return { toggleTheme: async () => {}, isDark: false, colors: { background: '#fff', text: '#000' } }; }
export const ThemeSwitcher = ({ children }) => <>{children}</>;
export default { ThemeProvider, useTheme };
