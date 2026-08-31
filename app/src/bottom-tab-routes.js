import React from "react";
import { Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Dashboard from "./pages/Dashboard";
import Finances from "./pages/Finances";
import Market from "./pages/Market";
import Reports from "./pages/Reports";
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
  const isShowLabelOnNavigation = useSettingsStore((s) => !!s.isShowLabelOnNavigation);

  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const text = isDark ? "#e4e4e7" : "#52525b";

  const isKeyboardOpen = useIsKeyboardOpen();

  return (
    <Tab.Navigator
      initialRouteName={"Início"}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarShowLabel: isShowLabelOnNavigation,
        tabBarStyle: {
          backgroundColor: bg,
          height: isShowLabelOnNavigation ? 60 : 50,
          position: "relative",
        },
      }}
    >
      <Tab.Screen
        name="Início"
        component={Dashboard}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: focused ? PURPLE_600 : text }}>Início</Text>
          ),
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
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: focused ? PURPLE_600 : text }}>
              Finanças
            </Text>
          ),
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
        name="Combustível"
        component={Runs}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: focused ? PURPLE_600 : text }}>
              Combustível
            </Text>
          ),
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
        name="Adicionar"
        component={ActionSheet}
        options={{
          tabBarButton: () => <AddButton />,
        }}
      />
      <Tab.Screen
        name="Mercado"
        component={MarketStackRoutes}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: focused ? PURPLE_600 : text }}>
              Mercado
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Feather
              name="shopping-cart"
              size={24}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Relatórios"
        component={Reports}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: focused ? PURPLE_600 : text }}>
              Relatórios
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Feather
              name="pie-chart"
              size={24}
              color={focused ? PURPLE_600 : text}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
