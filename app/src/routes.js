import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import Onboarding from "./pages/Onboarding";
import BottomTabRoutes from "./bottom-tab-routes";
import AboutUs from "./pages/AboutUs";
import IAPage from "./pages/IAPage";
import AIProviders from "./pages/AIProviders";
import Goals from "./pages/Goals";
import TitheSettings from "./pages/TitheSettings";
import { useSettingsStore } from "./stores/settings";

const Stack = createStackNavigator();

export default function Routes() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);

  return (
    <NavigationContainer theme={{ colors: { background: colorModeState === "dark" ? "#1c1e21" : "#f0f2f5" } }}>
      <BottomSheetModalProvider>
        <Stack.Navigator
          initialRouteName={"Onboarding"}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="Configuracoes" component={AboutUs} />
          <Stack.Screen name="IAPage" component={IAPage} />
          <Stack.Screen name="AIProviders" component={AIProviders} />
          <Stack.Screen name="TitheSettings" component={TitheSettings} />
          <Stack.Screen name="Goals" component={Goals} />
          <Stack.Screen name="TabNavigator" component={BottomTabRoutes} />
        </Stack.Navigator>
      </BottomSheetModalProvider>
    </NavigationContainer>
  );
}
