module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|zustand|@gorhom/bottom-sheet|@gorhom/portal)",
  ],
  moduleNameMapper: {
    "\\.(css|png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/__mocks__/cssMock.js",
    "^@expo/vector-icons$": "<rootDir>/__mocks__/vectorIconsMock.js",
    "^@expo/vector-icons/(.*)$": "<rootDir>/__mocks__/vectorIconsMock.js",
    "^.*/components/ui/shimmer-wave-text.*$": "<rootDir>/__mocks__/shimmerMock.js",
    "^.*/components/ui/morph-fab.*$": "<rootDir>/__mocks__/morphFabMock.js",
    "^.*/components/ui/border-beam.*$": "<rootDir>/__mocks__/borderBeamMock.js",
  },
};
