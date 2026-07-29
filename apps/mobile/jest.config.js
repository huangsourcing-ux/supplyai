module.exports = {
  preset: "jest-expo",
  fakeTimers: {
    // React Native's scheduler needs real task-queue primitives during
    // teardown; faking them can leave Jest spinning on Linux runners.
    doNotFake: ["nextTick", "queueMicrotask", "setImmediate"],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["js", "ts", "tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-svg|@tanstack/.*|react-native-reanimated|react-native-mmkv|react-native-nitro-modules|react-native-worklets|react-native-css-interop|nativewind|zustand|mdast-.*|micromark.*|decode-named-character-reference|character-entities.*|unist-.*|devlop))",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
