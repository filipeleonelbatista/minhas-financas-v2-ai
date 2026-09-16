import React from "react";
import { ImageBackground, View, Text } from "react-native";
import { useSettingsStore, type SettingsState } from "../stores/settings";
// @ts-ignore
import bgImg from "../assets/images/background.png";

const PURPLE_600: string = "#9c44dc";
const PURPLE_900: string = "#581c87";

type HeaderProps = {
  title?: string;
  isLeftIconComponent?: React.ReactNode | false;
  isRightIconComponent?: React.ReactNode | false;
  isShort?: boolean;
};

export default function Header({
  title,
  isLeftIconComponent = false,
  isRightIconComponent = false,
  isShort = false,
}: HeaderProps): React.JSX.Element {
  const colorModeState: string = useSettingsStore((s: SettingsState) => s.colorModeState);
  const isDark: boolean = colorModeState === "dark";
  const bg: string = isDark ? "#1c1e21" : "#f5f5f4";

  return (
    <ImageBackground
      source={bgImg}
      style={{
        paddingTop: 12,
        height: isShort ? 70 : 130,
        width: "100%",
        backgroundColor: PURPLE_600,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 }}>
        {isLeftIconComponent ? isLeftIconComponent : <View style={{ width: 40 }} />}
        <Text style={{ color: bg, fontWeight: "700", fontSize: 28 }}>
          {typeof title === "string" && title.endsWith("$") ? title.slice(0, -1) : title}
          <Text style={{ color: PURPLE_900 }}>$</Text>
        </Text>
        {isRightIconComponent ? isRightIconComponent : <View style={{ width: 40 }} />}
      </View>
    </ImageBackground>
  );
}
