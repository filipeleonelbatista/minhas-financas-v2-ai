module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|zustand|@gorhom/bottom-sheet|@gorhom/portal)",
  ],
};
