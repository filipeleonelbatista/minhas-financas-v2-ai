module.exports = function(api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test";
  return {
    presets: ["babel-preset-expo"],
    plugins: isTest
      ? [["@babel/plugin-proposal-decorators", { legacy: true }], "react-native-reanimated/plugin"]
      : [
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          "nativewind/babel",
          "react-native-reanimated/plugin",
        ],
  };
};
