import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, View, Pressable, useWindowDimensions } from "react-native";
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

let ChromaRing: any = null;
try {
  // eslint-disable-next-line global-require
  ChromaRing = require('./ui/ChromaRing').ChromaRing ?? require('./ui/ChromaRing').default ?? null;
} catch {
  try {
    // eslint-disable-next-line global-require
    ChromaRing = require('reacticx').ChromaRing ?? null;
  } catch {}
}

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581C87";

export default function AddButton() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";
  const { height } = useWindowDimensions();
  const isKeyboardOpen = useIsKeyboardOpen();

  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const selectedSheet = usePagesStore((s) => s.selectedSheet);

  const selectedComponent = useMemo(() => {
    switch (selectedSheet) {
      case "Finanças":
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
        return <ErrorSheet />;
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
      {ChromaRing ? (
        <Pressable testID="add-button-fab" accessibilityLabel="Adicionar" onPress={onOpen} style={{ marginTop: -24 }}>
          <ChromaRing width={fabSize} height={fabSize} borderWidth={2} speed={1.0} base={PURPLE_900} glow={PURPLE_600} background={PURPLE_600} style={{ width: fabSize, height: fabSize, borderRadius: fabSize / 2 }}>
            {FabContent}
          </ChromaRing>
        </Pressable>
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
      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} transparent={false}>
        <View style={{ flex: 1, height: height * (isKeyboardOpen ? 0.9 : 1.09), paddingTop: 24, backgroundColor: bg }}>
          <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 16 }}>
            <Feather name="x" size={24} color={isDark ? "#e4e4e7" : "#52525b"} />
          </Pressable>
          <View style={{ flex: 1, paddingBottom: isKeyboardOpen ? 24 : 0 }}>
            {selectedComponent}
            <View style={{ height: 64, width: "100%" }} />
          </View>
        </View>
      </Modal>
    </>
  );
}
