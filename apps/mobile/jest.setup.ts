import type { ReactNode } from "react";

jest.mock("@chinasupply/api-client", () => ({
  configureApiClient: jest.fn(),
  getGetMapClusterBoundariesQueryKey: jest.fn(() => [
    "/api/v1/map/clusters/boundaries",
  ]),
  getGetMapFactoriesQueryKey: jest.fn(() => ["/api/v1/map/factories"]),
  useGetMapClusterBoundaries: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
  useGetMapClusterPoints: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
  useGetMapFactories: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
  useGetHealthLive: jest.fn(() => ({
    isError: false,
    isPending: true,
  })),
}));

jest.mock("@chinasupply/config/map/style", () => ({
  BASEMAP_LABEL_ANCHOR_LAYER_ID: "Ferry labels",
  createChinaSupplyMapStyle: jest.fn(() => ({
    layers: [],
    sources: {},
    version: 8,
  })),
}));

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

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(() => "0123456789abcdef0123456789abcdef"),
  flush: jest.fn(async () => true),
  init: jest.fn(),
  wrap: jest.fn((component) => component),
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
