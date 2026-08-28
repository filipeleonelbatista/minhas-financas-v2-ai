// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const nativewindMetro = require("nativewind/metro");
const withNativewind = nativewindMetro.withNativeWind || nativewindMetro.withNativewind;

const config = getDefaultConfig(__dirname, { isTsconfigPathsEnabled: true });

let finalConfig;
try {
  finalConfig = withNativewind(config, { input: "./global.css" });
} catch (e) {
  console.warn("[nativewind] withNativewind failed (tailwind mismatch), fallback to default metro config:", e.message);
  finalConfig = config;
}
module.exports = finalConfig;
