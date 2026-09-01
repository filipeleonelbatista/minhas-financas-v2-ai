import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export function useIsKeyboardOpen() {
  const [isKeybordOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return isKeybordOpen;
}