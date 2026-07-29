import type { ReactNode } from "react";

jest.mock("@chinasupply/api-client", () => ({
  configureApiClient: jest.fn(),
  createFavorite: jest.fn(),
  deleteFavorite: jest.fn(),
  deleteMe: jest.fn(),
  getClusters: jest.fn(),
  getClusterFactories: jest.fn(),
  getFavorites: jest.fn(),
  getGetMapClusterBoundariesQueryKey: jest.fn(() => [
    "/api/v1/map/clusters/boundaries",
  ]),
  getGetMapClusterPointsQueryKey: jest.fn(() => [
    "/api/v1/map/clusters/points",
  ]),
  getGetMapFactoriesQueryKey: jest.fn(() => ["/api/v1/map/factories"]),
  updateMe: jest.fn(),
  useGetCategories: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
  useGetCluster: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
  useGetFactory: jest.fn(() => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  })),
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
  useSearch: jest.fn(() => ({
    data: undefined,
    dataUpdatedAt: 0,
    isError: false,
    isPending: false,
    isSuccess: false,
    refetch: jest.fn(),
  })),
  useGetHealthLive: jest.fn(() => ({
    isError: false,
    isPending: true,
  })),
}));

jest.mock("@expo/vector-icons/FontAwesome6");

jest.mock("@chinasupply/analytics", () => ({
  analytics: {
    trackClusterViewed: jest.fn(),
    trackFactoryContactClicked: jest.fn(),
    trackFactoryViewed: jest.fn(),
    trackMapMoved: jest.fn(),
    trackSearchPerformed: jest.fn(),
  },
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(() => ({ type: "success" })),
}));

jest.mock("expo-router", () => {
  const Tabs = Object.assign(
    jest.fn(({ children }: { children: ReactNode }) => children),
    { Screen: jest.fn(() => null) },
  );

  return {
    ErrorBoundary: undefined,
    Stack: Object.assign(() => null, { Screen: () => null }),
    Tabs,
    useFocusEffect: jest.fn(),
    useLocalSearchParams: jest.fn(() => ({
      slug: "yiwu-small-commodities",
    })),
    useRouter: jest.fn(() => ({
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      push: jest.fn(),
      replace: jest.fn(),
    })),
  };
});

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
    useAuth: jest.fn(() => ({
      getToken: jest.fn(async () => null),
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    })),
    useClerk: jest.fn(() => ({ signOut: jest.fn(async () => undefined) })),
    useSignIn: jest.fn(() => ({
      fetchStatus: "idle",
      signIn: {
        create: jest.fn(async () => ({ error: null })),
        emailCode: {
          sendCode: jest.fn(async () => ({ error: null })),
          verifyCode: jest.fn(async () => ({ error: null })),
        },
        finalize: jest.fn(async () => ({ error: null })),
        mfa: {
          sendEmailCode: jest.fn(async () => ({ error: null })),
          verifyEmailCode: jest.fn(async () => ({ error: null })),
        },
        reset: jest.fn(async () => ({ error: null })),
        status: "complete",
        supportedSecondFactors: [],
      },
    })),
    useSignUp: jest.fn(() => ({
      fetchStatus: "idle",
      signUp: {
        create: jest.fn(async () => ({ error: null })),
        finalize: jest.fn(async () => ({ error: null })),
        reset: jest.fn(async () => ({ error: null })),
        status: "complete",
        verifications: {
          sendEmailCode: jest.fn(async () => ({ error: null })),
          verifyEmailCode: jest.fn(async () => ({ error: null })),
        },
      },
    })),
    useSSO: jest.fn(() => ({ startSSOFlow: jest.fn() })),
    useUser: jest.fn(() => ({ isLoaded: true, user: null })),
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
