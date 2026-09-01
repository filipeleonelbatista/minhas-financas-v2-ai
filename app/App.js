import "./global.css";
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
import { useSettingsStore } from "./src/stores/settings";
import Loading from "./src/components/Loading";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.",
  "Due to changes in Androids permission",
  "The result of getSnapshot should be cached",
]);

// BiometricGate migrated to useSettingsStore
function BiometricGate({ children }) {
  const isBiometricEnabled = useSettingsStore((s) => !!s.isBiometricEnabled);

  const [locked, setLocked] = useState(!!isBiometricEnabled);
  const [checking, setChecking] = useState(!!isBiometricEnabled);
  const [errorMsg, setErrorMsg] = useState("");

  const authenticate = useCallback(async () => {
    if (!isBiometricEnabled) {
      setLocked(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    setErrorMsg("");
    try {
      let LocalAuth;
      try {
        LocalAuth = require("expo-local-authentication");
      } catch {
        const { authenticateAsync } = require("./src/utils/biometry");
        const res = await authenticateAsync("Desbloquear Finanças");
        setLocked(!res.success);
        setChecking(false);
        return;
      }
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setLocked(false);
        setChecking(false);
        return;
      }
      const result = await LocalAuth.authenticateAsync({
        promptMessage: "Desbloquear Finanças",
        fallbackLabel: "Usar PIN",
        disableDeviceFallback: false,
        cancelLabel: "Cancelar",
      });
      if (result.success) {
        setLocked(false);
      } else {
        setLocked(true);
        setErrorMsg(result.error || "Autenticação falhou");
      }
    } catch (e) {
      try {
        const { authenticateAsync } = require("./src/utils/biometry");
        const res = await authenticateAsync("Desbloquear Finanças");
        setLocked(!res.success);
        if (!res.success) setErrorMsg(res.error || "Falha");
      } catch {
        setLocked(false);
      }
    }
    setChecking(false);
  }, [isBiometricEnabled]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  useEffect(() => {
    if (!isBiometricEnabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        authenticate();
      }
    });
    return () => sub.remove();
  }, [isBiometricEnabled, authenticate]);

  if (!isBiometricEnabled) return children;

  if (checking) {
    return <Loading />;
  }

  if (locked) {
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

  return children;
}

export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  const load = useSettingsStore((s) => s.load);

  useEffect(() => {
    (async () => {
      await load();
      if (process.env.NODE_ENV !== 'test') {
        try {
          const m = await import('./src/db/seed');
          const res = await m.ensureSeeded?.();
          if (res) {
            // recarrega todas as stores para refletir seed (finanças, corridas, estoque, listas, metas)
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
                load(),
              ]);
            } catch {}
          }
        } catch {}
      }
    })();
  }, []);

  if (!fontsLoaded) {
    return <Loading />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View
          style={{
            height: RNStatusBar.currentHeight,
            backgroundColor: "#581c87",
          }}
        >
          <StatusBar style="light" />
        </View>
        <BiometricGate>
          <Routes />
        </BiometricGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
