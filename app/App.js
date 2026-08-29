import "./global.css";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { AppState, StatusBar as RNStatusBar, Text, TouchableOpacity, View } from "react-native";
import "react-native-url-polyfill/auto";
import Routes from "./src/routes";

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";

import { NativeBaseProvider } from "native-base";

import { GoalsContextProvider } from "./src/context/GoalsContext";
import { MarketContextProvider } from "./src/context/MarketContext";
import { PagesContextProvider } from "./src/context/PagesContext";
import { PaymentsContextProvider } from "./src/context/PaymentsContext";
import { RunsContextProvider } from "./src/context/RunsContext";
import { SettingsContext, SettingsContextProvider } from "./src/context/SettingsContext";

import { LogBox } from "react-native";
import Loading from "./src/components/Loading";
import { ListsContextProvider } from "./src/context/ListsContext";

LogBox.ignoreLogs([
  "In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.",
]);

// LocalAuth gate §1.3: biometria antes de Routes se isBiometricEnabled
function BiometricGate({ children }) {
  const ctx = useContext(SettingsContext) || {};
  const isBiometricEnabled = ctx.isBiometricEnabled ?? false;

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
      // Lazy import to allow jest fallback without native module
      let LocalAuth;
      try {
        LocalAuth = require("expo-local-authentication");
      } catch {
        // In jest without native, fallback to biometry utils
        const { authenticateAsync } = require("./src/utils/biometry");
        const res = await authenticateAsync("Desbloquear Finanças");
        setLocked(!res.success);
        setChecking(false);
        return;
      }
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Sem biometria disponível, libera acesso (switch deve ficar oculto em AboutUs)
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
      // Fallback via utils/biometry wrapper
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
    return (
      <NativeBaseProvider>
        <Loading />
      </NativeBaseProvider>
    );
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
          style={{ backgroundColor: "#9c44dc", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.2 }}
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

  if (!fontsLoaded) {
    return (
      <NativeBaseProvider>
        <Loading />
      </NativeBaseProvider>
    );
  }

  return (
    <>
      <View
        style={{
          height: RNStatusBar.currentHeight,
          backgroundColor: "#581c87",
        }}
      >
        <StatusBar style="light" />
      </View>
      <NativeBaseProvider>
        <PagesContextProvider>
          <SettingsContextProvider>
            <BiometricGate>
              <PaymentsContextProvider>
                <RunsContextProvider>
                  <ListsContextProvider>
                    <MarketContextProvider>
                      <GoalsContextProvider>
                        <Routes />
                      </GoalsContextProvider>
                    </MarketContextProvider>
                  </ListsContextProvider>
                </RunsContextProvider>
              </PaymentsContextProvider>
            </BiometricGate>
          </SettingsContextProvider>
        </PagesContextProvider>
      </NativeBaseProvider>
    </>
  );
}
