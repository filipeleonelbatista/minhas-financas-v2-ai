import "./global.css";
import * as SplashScreen from 'expo-splash-screen';
try { SplashScreen.preventAutoHideAsync(); } catch {}
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, StatusBar as RNStatusBar, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import "react-native-url-polyfill/auto";
import Routes from "./src/routes";

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSettingsStore, type SettingsState } from "./src/stores/settings";
import Loading from "./src/components/Loading";
import { ThemeProvider } from "./src/components/organisms/theme-switch/context";
import { ThemeMode } from "./src/components/organisms/theme-switch/types";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.",
  "Due to changes in Androids permission",
  "The result of getSnapshot should be cached",
  "InteractionManager",
  "has been deprecated",
  "Writing to `value` during component render",
  "Reading from `value` during component render",
]);

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  const loadSettings = useSettingsStore((s: SettingsState) => s.load);
  const isBiometricEnabled: boolean = useSettingsStore((s: SettingsState) => !!s.isBiometricEnabled);
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  // Biometric state lifted to App to coordinate splash hiding
  const [biometricLocked, setBiometricLocked] = useState<boolean | null>(null); // null = not checked yet, true = locked, false = unlocked
  const [biometricChecking, setBiometricChecking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const authenticate = useCallback(async (): Promise<void> => {
    if (!isBiometricEnabled) {
      setBiometricLocked(false);
      setBiometricChecking(false);
      setErrorMsg("");
      return;
    }
    setBiometricChecking(true);
    setErrorMsg("");
    try {
      let LocalAuth: typeof import("expo-local-authentication") | null = null;
      try {
        LocalAuth = require("expo-local-authentication");
      } catch {
        const { authenticateAsync } = require("./src/utils/biometry") as typeof import("./src/utils/biometry");
        const res = await authenticateAsync("Desbloquear Finanças");
        setBiometricLocked(!res.success);
        if (!res.success) setErrorMsg(res.error || "Falha");
        setBiometricChecking(false);
        return;
      }
      if (!LocalAuth) {
        setBiometricLocked(false);
        setBiometricChecking(false);
        return;
      }
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setBiometricLocked(false);
        setBiometricChecking(false);
        return;
      }
      const result = await LocalAuth.authenticateAsync({
        promptMessage: "Desbloquear Finanças",
        fallbackLabel: "Usar PIN",
        disableDeviceFallback: false,
        cancelLabel: "Cancelar",
      });
      if (result.success) {
        setBiometricLocked(false);
      } else {
        setBiometricLocked(true);
        setErrorMsg((result as { error?: string }).error || "Autenticação falhou");
      }
    } catch (e) {
      try {
        const { authenticateAsync } = require("./src/utils/biometry") as typeof import("./src/utils/biometry");
        const res = await authenticateAsync("Desbloquear Finanças");
        setBiometricLocked(!res.success);
        if (!res.success) setErrorMsg(res.error || "Falha");
      } catch {
        setBiometricLocked(false);
      }
    }
    setBiometricChecking(false);
  }, [isBiometricEnabled]);

  useEffect(() => {
    (async () => {
      try {
        // 0) migrations drizzle one-shot (Crítico 1) - cria 8 tables + alter config antes de qualquer read
        try {
          const { runMigrations } = await import('./src/db/migrate');
          await runMigrations();
        } catch {}
        // 1) load settings first (has isBiometricEnabled etc)
        await loadSettings();
        // 2) carrega stores do DB (app limpo: sem auto-seed, sem flag)
        // Popule via `yarn db:seed` (gera financas.db e faz adb push) e o app carrega direto do sqlite (managed puro)
        try {
          const { useFinanceStore } = await import('./src/stores/finance');
          const { useRunsStore } = await import('./src/stores/runs');
          const { useMarketStore } = await import('./src/stores/market');
          const { useListsStore } = await import('./src/stores/lists');
          const { useGoalsStore } = await import('./src/stores/goals');
          await Promise.all([
            useFinanceStore.getState().load?.(),
            useRunsStore.getState().load?.(),
            useMarketStore.getState().load?.(),
            useListsStore.getState().load?.(),
            useGoalsStore.getState().load?.(),
          ]);
        } catch {}
      } finally {
        setAppIsReady(true);
      }
    })();
  }, []);

  // Trigger biometric check after app is ready; also handle toggle on/off
  const prevBioEnabledRef = React.useRef<boolean>(isBiometricEnabled);
  useEffect(() => {
    if (!appIsReady) return;
    if (isBiometricEnabled) {
      // Cold start: locked === null -> need auth
      if (biometricLocked === null) {
        authenticate();
      } else if (!prevBioEnabledRef.current && biometricLocked === false) {
        // Toggle from disabled (was false) to enabled -> require auth
        authenticate();
      }
      // If already locked true, keep locked screen – user must tap retry or resume via AppState
    } else {
      setBiometricLocked(false);
      setBiometricChecking(false);
      setErrorMsg("");
    }
    prevBioEnabledRef.current = isBiometricEnabled;
  }, [appIsReady, isBiometricEnabled, authenticate, biometricLocked]);

  useEffect(() => {
    if (!isBiometricEnabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        authenticate();
      }
    });
    return () => sub.remove();
  }, [isBiometricEnabled, authenticate]);

  const biometricReady: boolean = !isBiometricEnabled || (biometricLocked !== null && !biometricChecking);

  const onLayoutRootView = useCallback(async (): Promise<void> => {
    if (appIsReady && fontsLoaded && biometricReady) {
      try { await SplashScreen.hideAsync(); } catch {}
    }
  }, [appIsReady, fontsLoaded, biometricReady]);

  // Ensure splash hides even if onLayout already fired before biometric finished (cold start)
  useEffect(() => {
    if (appIsReady && fontsLoaded && biometricReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady, fontsLoaded, biometricReady]);

  if (!appIsReady || !fontsLoaded) {
    return <Loading />;
  }

  // While biometric is checking on cold start or after toggle, keep splash visible
  // Show Loading behind splash to avoid flashing Routes
  if (isBiometricEnabled && biometricChecking) {
    return <Loading />;
  }

  // Initial state before first check completes (null) -> keep splash, show Loading
  if (isBiometricEnabled && biometricLocked === null) {
    return <Loading />;
  }

  if (isBiometricEnabled && biometricLocked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#581c87", padding: 24 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "600", marginBottom: 12, textAlign: "center" }}>
          Finanças bloqueado
        </Text>
        <Text style={{ color: "white", opacity: 0.8, marginBottom: 24, textAlign: "center" }}>
          {errorMsg ? `Falha: ${errorMsg}. Tente novamente.` : "Autenticação necessária para continuar."}
        </Text>
        <TouchableOpacity
          onPress={authenticate}
          style={{ backgroundColor: "#9c44dc", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 }}
        >
          <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Desbloquear Finanças</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initialTheme: ThemeMode = useSettingsStore.getState().colorModeState === "dark" ? ThemeMode.Dark : ThemeMode.Light;
  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider
          defaultTheme={initialTheme}
          customLightColors={{ background: "#f5f5f4", text: "#52525b" }}
          customDarkColors={{ background: "#1c1e21", text: "#e4e4e7" }}
          onThemeChange={(newTheme: ThemeMode) => {
            const next = newTheme === ThemeMode.Dark ? "dark" : "light";
            try { useSettingsStore.getState().setColorMode(next); } catch {}
          }}
        >
          <View
            style={{
              height: RNStatusBar.currentHeight,
              backgroundColor: "#581c87",
            }}
          >
            <StatusBar style="light" />
          </View>
          <Routes />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
