import React from "react";
import { Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Dashboard from "./pages/Dashboard";
import Finances from "./pages/Finances";
import Runs from "./pages/Runs";
import ActionSheet from "./pages/ActionSheet";
import AddButton from "./components/AddButtton";
import { useSettingsStore } from "./stores/settings";
import { useIsKeyboardOpen } from "./hooks/useIsKeyboardOpen";
import MarketStackRoutes from "./market-stack-routes";

const Tab = createBottomTabNavigator();

// Theme mapping for NativeWind dark replacement
const PURPLE_600 = "#9c44dc";

export default function BottomTabRoutes() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);

  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const isKeyboardOpen = useIsKeyboardOpen();
  const insets = useSafeAreaInsets();
  // Altura fixa sem títulos
  const baseHeight = 50;
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);
  const tabBarHeight = baseHeight + bottomInset;

  return (
    <Tab.Navigator
      initialRouteName={"Início"}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: PURPLE_600,
        tabBarInactiveTintColor: text,
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: bg,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: isDark ? "#27272a" : "#e4e4e7",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
      }}
    >
      <Tab.Screen
        name="Início"
        component={Dashboard}
        options={{
          tabBarIcon: ({ focused }) => (
            <Feather
              name="home"
              size={24}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Finanças"
        component={Finances}
        options={{
          tabBarIcon: ({ focused }) => (
            <Feather
              name="dollar-sign"
              size={24}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Adicionar"
        component={ActionSheet}
        options={{
          tabBarButton: () => <AddButton />,
        }}
      />
      <Tab.Screen
        name="Combustível"
        component={Runs}
        options={{
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={"fuel"}
              size={26}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Mercado"
        component={MarketStackRoutes}
        options={{
          tabBarIcon: ({ focused }) => (
            <Feather
              name="shopping-cart"
              size={24}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
