import { Feather } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import { Modal, View, Pressable, useWindowDimensions, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Sheet, useSheetRef } from "./nativewindui/Sheet";
import { useIsKeyboardOpen } from "../hooks/useIsKeyboardOpen";
import { usePagesStore } from "../stores/pages";
import { useSettingsStore } from "../stores/settings";
import AddFuelForm from "./AddFuelForm";
import AddGoalForm from "./AddGoalForm";
import AddItemForm from "./AddItemForm";
import AddItemListItem from "./AddItemListtItem";
import AddListForm from "./AddListForm";
import AddShoppingCartItem from "./AddShoppingCartItem";
import ErrorSheet from "./ErrorSheet";

let BorderBeam: any = null;
try {
  // eslint-disable-next-line global-require
  BorderBeam = require('./ui/border-beam').BorderBeam ?? require('./ui/border-beam/index').BorderBeam ?? require('./ui/border-beam/index').default ?? null;
} catch {
  try {
    // eslint-disable-next-line global-require
    BorderBeam = require('../components/ui/border-beam').BorderBeam ?? null;
  } catch {}
}

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";

export default function AddButton() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isKeyboardOpen = useIsKeyboardOpen();

  // NativeWindUI Sheet ref for modern bottom-sheet
  const sheetRef = useSheetRef();
  const [useNativeSheet] = useState(false); // toggle to true to use @gorhom/bottom-sheet native sheet

  const [isOpen, setIsOpen] = useState(false);
  const onOpen = useCallback(() => {
    if (useNativeSheet) {
      sheetRef.current?.present();
    } else {
      setIsOpen(true);
    }
  }, [useNativeSheet]);
  const onClose = useCallback(() => {
    if (useNativeSheet) {
      sheetRef.current?.dismiss();
    } else {
      setIsOpen(false);
    }
  }, [useNativeSheet]);

  const selectedSheet = usePagesStore((s) => s.selectedSheet);

  const selectedComponent = useMemo(() => {
    switch (selectedSheet) {
      case "Finanças":
      case "Início":
      case null:
      case undefined:
        return <AddItemForm onClose={onClose} />;
      case "Combustível":
        return <AddFuelForm onClose={onClose} />;
      case "Stock":
        return <AddShoppingCartItem onClose={onClose} />;
      case "Lists":
        return <AddListForm onClose={onClose} />;
      case "List":
        return <AddItemListItem onClose={onClose} />;
      case "Relatórios":
        return <AddGoalForm onClose={onClose} />;
      default:
        return <AddItemForm onClose={onClose} />;
    }
  }, [selectedSheet]);

  const fabSize = 64;
  const FabContent = (
    <View style={{ width: fabSize, height: fabSize, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="plus" size={26} color="white" />
    </View>
  );

  return (
    <>
      {BorderBeam ? (
        <View testID="add-button-fab" accessibilityLabel="Adicionar" style={{ marginTop: -52, padding: 12 }}>
          <BorderBeam borderRadius={fabSize/2} borderWidth={2} colors={["#9c44dc","#581C87","#9c44dc"]} duration={3} glow={6} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2 }}>
            <Pressable onPress={onOpen} style={{ width: fabSize, height: fabSize, borderRadius: fabSize/2, backgroundColor: PURPLE_600, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="plus" size={26} color="white" />
            </Pressable>
          </BorderBeam>
        </View>
      ) : (
        <Pressable
          testID="add-button-fab"
          accessibilityLabel="Adicionar"
          onPress={onOpen}
          style={({ pressed }) => ({
            backgroundColor: pressed ? PURPLE_900 : PURPLE_600,
            width: fabSize,
            height: fabSize,
            borderRadius: 999,
            marginTop: -24,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Feather name="plus" size={26} color="white" />
        </Pressable>
      )}
      {/* Fallback Modal with NativeWindUI styling + SafeArea - preferred for jest */}
      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false} statusBarTranslucent>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "bottom"]}>
          {/* NativeWindUI sheet handle indicator */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "#3f3f46" : "#e4e4e7" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={{ width: 40 }} />
            <Pressable onPress={onClose} style={{ padding: 12, borderRadius: 999, backgroundColor: isDark ? "#27272a" : "#f5f5f4" }}>
              <Feather name="x" size={20} color={isDark ? "#e4e4e7" : "#52525b"} />
            </Pressable>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={insets.top + 12} style={{ flex: 1 }}>
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
              {selectedComponent}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* NativeWindUI Sheet (bottom-sheet) - alternative native feeling sheet */}
      <Sheet ref={sheetRef} snapPoints={["92%"]} enableDynamicSizing={false} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize">
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, backgroundColor: bg }} style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {selectedComponent}
          </View>
        </BottomSheetScrollView>
      </Sheet>
    </>
  );
}
