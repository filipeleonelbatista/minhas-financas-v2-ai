import { ActivityIndicator, Image, View } from "react-native";
import logo from "../assets/icon.png";

export default function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#581c87" }}>
      <Image source={logo} style={{ width: 150, height: 150, borderRadius: 75, marginBottom: 16 }} />
      <ActivityIndicator size={36} color="#FFF" />
    </View>
  );
}
