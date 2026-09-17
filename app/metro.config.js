// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const nativewindMetro = require("nativewind/metro");
const withNativewind = nativewindMetro.withNativeWind || nativewindMetro.withNativewind;

const config = getDefaultConfig(__dirname, { isTsconfigPathsEnabled: true });

// Support *.sql as source/assets so drizzle-kit SQL migrations can be imported via `?raw`
// If Metro asset handling is unavailable, migrate.ts falls back to inline SQL strings (see comment there)
config.resolver = config.resolver || {};
config.resolver.assetExts = [...(config.resolver.assetExts || []), "sql"];
// Ensure .sql is not treated as sourceExt (avoid babel transform attempt)
if (config.resolver.sourceExts) {
  config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "sql");
}

let finalConfig;
try {
  finalConfig = withNativewind(config, { input: "./global.css" });
} catch (e) {
  console.warn("[nativewind] withNativewind failed (tailwind mismatch), fallback to default metro config:", e.message);
  finalConfig = config;
}
module.exports = finalConfig;
