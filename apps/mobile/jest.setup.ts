jest.mock("react-native-worklets", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [
    {
      languageCode: "en",
      languageTag: "en-US",
      textDirection: "ltr",
    },
  ]),
}));

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn(() => ({
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
    getString: jest.fn(),
    remove: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock("@maplibre/maplibre-react-native");
