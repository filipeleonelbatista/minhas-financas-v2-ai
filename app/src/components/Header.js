import { ImageBackground, View, Text } from "react-native";
import { useSettingsStore } from "../stores/settings";
import bgImg from "../assets/images/background.png";

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";

export default function Header({
  title,
  isLeftIconComponent = false,
  isRightIconComponent = false,
  isShort = false,
}) {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const bg = isDark ? "#1c1e21" : "#f5f5f4";

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
          {title}
          <Text style={{ color: PURPLE_900 }}>$</Text>
        </Text>
        {isRightIconComponent ? isRightIconComponent : <View style={{ width: 40 }} />}
      </View>
    </ImageBackground>
  );
}
