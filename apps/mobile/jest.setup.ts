import type { ReactNode } from "react";

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

jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn((length: number) => new Uint8Array(length).fill(7)),
}));

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async () => "existing-key-123"),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock("@clerk/expo", () => {
  return {
    ClerkProvider: ({ children }: { children: ReactNode }) => children,
    useAuth: jest.fn(() => ({ isLoaded: true, isSignedIn: false })),
    useSignIn: jest.fn(() => ({
      fetchStatus: "idle",
      signIn: {
        finalize: jest.fn(async () => ({ error: null })),
        mfa: {
          sendEmailCode: jest.fn(async () => ({ error: null })),
          verifyEmailCode: jest.fn(async () => ({ error: null })),
        },
        password: jest.fn(async () => ({ error: null })),
        status: "complete",
        supportedSecondFactors: [],
      },
    })),
  };
});

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
