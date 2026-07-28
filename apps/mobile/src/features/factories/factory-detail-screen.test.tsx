import * as Clipboard from "expo-clipboard";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking } from "react-native";

import { analytics } from "@chinasupply/analytics";
import { type GetFactory200Data, useGetFactory } from "@chinasupply/api-client";

import "../../lib/i18n";
import FactoryDetailScreen, {
  FactoryContactActions,
  FactoryCopyField,
  FactoryDetailLoaded,
  FactoryDetailState,
  FactoryImageCarousel,
} from "./factory-detail-screen";
import { FactoryLocationMap } from "./factory-location-map";

const factory: GetFactory200Data = {
  address: {
    en: "No. 8 Bright Road, Yiwu, Zhejiang, China",
    zh: "中国浙江省义乌市光明路8号",
  },
  categories: [
    {
      color: "#2563EB",
      icon: "lightbulb",
      id: "cat000000000000000001",
      name: "Lighting",
      parentId: null,
      slug: "lighting",
      sortOrder: 10,
    },
  ],
  certifications: ["ISO 9001", "BSCI"],
  cluster: {
    id: "clu000000000000000001",
    name: "Yiwu Small Commodities",
    slug: "yiwu-small-commodities",
  },
  contact: {
    email: "sales@bright.example.test",
    phone: "+86 579 1234 5678",
    website: "https://bright.example.test",
    wechat: "bright_factory",
  },
  employeeRange: "100–199 employees",
  establishedYear: 2012,
  id: "fac000000000000000001",
  imageUrl: "https://media.example.test/factories/bright/cover.webp",
  images: [
    {
      alt: "Assembly floor at Yiwu Bright Goods Factory",
      url: "https://media.example.test/factories/bright/1.webp",
    },
    {
      alt: "Finished LED products",
      url: "https://media.example.test/factories/bright/2.webp",
    },
  ],
  lastVerifiedAt: "2026-05-18T04:30:00Z",
  location: { coordinates: [120.08, 29.31], type: "Point" },
  mainProducts: ["LED gifts", "Promotional goods"],
  moq: "500 pieces",
  name: "Yiwu Bright Goods Factory",
  publishedAt: "2026-07-02T00:00:00Z",
  region: {
    id: "reg000000000000000001",
    level: "city",
    name: "Yiwu",
  },
  relatedFactories: [
    {
      cluster: {
        id: "clu000000000000000001",
        name: "Yiwu Small Commodities",
        slug: "yiwu-small-commodities",
      },
      id: "fac000000000000000002",
      imageUrl: null,
      location: { coordinates: [120.09, 29.32], type: "Point" },
      mainProducts: ["LED signage"],
      name: "Yiwu Signal Works",
      publishedAt: "2026-07-01T00:00:00Z",
      region: {
        id: "reg000000000000000001",
        level: "city",
        name: "Yiwu",
      },
      slug: "yiwu-signal-works",
      verified: false,
    },
  ],
  slug: "yiwu-bright-goods",
  sourceName: "Official factory website",
  sourceUrl: "https://bright.example.test/about",
  verified: true,
  verifiedAt: "2026-05-18T04:30:00Z",
};

function routerMock(overrides: Record<string, unknown> = {}) {
  return {
    back: jest.fn(),
    canDismiss: jest.fn(() => false),
    canGoBack: jest.fn(() => true),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
    navigate: jest.fn(),
    prefetch: jest.fn(),
    push: jest.fn(),
    reload: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useRouter>;
}

describe("mobile factory detail presentation", () => {
  it("renders all F-4 sections and keeps navigation placeholders disabled", () => {
    const onRelatedFactory = jest.fn();
    render(
      <FactoryDetailLoaded
        factory={factory}
        onBack={jest.fn()}
        onRelatedFactory={onRelatedFactory}
      />,
    );

    expect(screen.getByText(factory.name)).toBeOnTheScreen();
    expect(screen.getAllByText("Yiwu, China")).toHaveLength(2);
    expect(screen.getByText("Verified 2026-05")).toBeOnTheScreen();
    expect(screen.getByText("Official factory website ↗")).toBeOnTheScreen();
    expect(screen.getByText("1 of 2")).toBeOnTheScreen();
    expect(screen.getByText("ISO 9001, BSCI")).toBeOnTheScreen();
    expect(screen.getByText("500 pieces")).toBeOnTheScreen();
    expect(screen.getByText("2012")).toBeOnTheScreen();
    expect(screen.getByText("100–199 employees")).toBeOnTheScreen();
    expect(screen.getByText(factory.address.en)).toBeOnTheScreen();
    expect(screen.getByText(factory.address.zh)).toBeOnTheScreen();
    expect(screen.getByText("Contact factory")).toBeOnTheScreen();
    expect(screen.getByText("Related factories")).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("factory-navigation-google")).toBeDisabled();
    expect(screen.getByTestId("factory-navigation-apple")).toBeDisabled();
    expect(screen.getByTestId("factory-navigation-amap")).toBeDisabled();
    expect(screen.getByTestId("factory-navigation-baidu")).toBeDisabled();

    fireEvent.press(screen.getByTestId("related-factory-yiwu-signal-works"));
    expect(onRelatedFactory).toHaveBeenCalledWith("yiwu-signal-works");
  });

  it("hides every empty optional block and renders the gray trust state", () => {
    render(
      <FactoryDetailLoaded
        factory={{
          ...factory,
          certifications: [],
          contact: null,
          employeeRange: null,
          establishedYear: null,
          images: [],
          lastVerifiedAt: null,
          moq: null,
          relatedFactories: [],
          sourceName: null,
          sourceUrl: null,
          verified: false,
          verifiedAt: null,
        }}
        onBack={jest.fn()}
        onRelatedFactory={jest.fn()}
      />,
    );

    expect(screen.getByText("Unverified")).toBeOnTheScreen();
    expect(screen.queryByTestId("factory-detail-gallery")).toBeNull();
    expect(screen.queryByText("Certifications")).toBeNull();
    expect(screen.queryByText("Minimum order")).toBeNull();
    expect(screen.queryByText("Established")).toBeNull();
    expect(screen.queryByText("Factory size")).toBeNull();
    expect(screen.queryByText("Contact factory")).toBeNull();
    expect(screen.queryByText("Related factories")).toBeNull();
    expect(screen.queryByText("Source")).toBeNull();
  });

  it("updates the accessible carousel position after horizontal paging", () => {
    render(
      <FactoryImageCarousel images={factory.images} name={factory.name} />,
    );

    fireEvent(
      screen.getByTestId("factory-gallery-scroll"),
      "momentumScrollEnd",
      { nativeEvent: { contentOffset: { x: 2_000, y: 0 } } },
    );
    expect(screen.getByText("2 of 2")).toBeOnTheScreen();
  });

  it("keeps a page indicator for a single image", () => {
    render(
      <FactoryImageCarousel
        images={[factory.images[0]!]}
        name={factory.name}
      />,
    );

    expect(screen.getByText("1 of 1")).toBeOnTheScreen();
    expect(screen.getByTestId("factory-gallery-image-0")).toBeOnTheScreen();
    expect(screen.queryByTestId("factory-gallery-image-1")).toBeNull();
  });

  it("falls back to Verified when no verification month is available", () => {
    render(
      <FactoryDetailLoaded
        factory={{ ...factory, lastVerifiedAt: null }}
        onBack={jest.fn()}
        onRelatedFactory={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Verified 20/)).toBeNull();
  });
});

describe("mobile factory contact actions", () => {
  it("copies both addresses with feedback", async () => {
    render(
      <>
        <FactoryCopyField
          label="English address"
          testID="copy-address-en"
          value={factory.address.en}
        />
        <FactoryCopyField
          label="Chinese address"
          testID="copy-address-zh"
          value={factory.address.zh}
        />
      </>,
    );

    fireEvent.press(screen.getByTestId("copy-address-en"));
    fireEvent.press(screen.getByTestId("copy-address-zh"));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(factory.address.en);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(factory.address.zh);
    });
    expect(screen.getAllByText("Copied")).toHaveLength(2);
  });

  it("opens website, email, and phone URLs and tracks every contact method", async () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    render(
      <FactoryContactActions
        contact={factory.contact!}
        factoryId={factory.id}
        slug={factory.slug}
      />,
    );

    fireEvent.press(screen.getByTestId("factory-contact-website"));
    fireEvent.press(screen.getByTestId("factory-contact-email"));
    fireEvent.press(screen.getByTestId("factory-contact-phone"));
    fireEvent.press(screen.getByTestId("factory-contact-wechat"));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledTimes(3);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("bright_factory");
    });
    expect(openUrl).toHaveBeenNthCalledWith(1, "https://bright.example.test/");
    expect(openUrl).toHaveBeenNthCalledWith(
      2,
      "mailto:sales%40bright.example.test",
    );
    expect(openUrl).toHaveBeenNthCalledWith(3, "tel:%2B86%20579%201234%205678");
    for (const method of ["website", "email", "phone", "wechat"] as const) {
      expect(analytics.trackFactoryContactClicked).toHaveBeenCalledWith({
        factoryId: factory.id,
        method,
        slug: factory.slug,
      });
    }
    expect(screen.getByText("WeChat ID copied")).toBeOnTheScreen();
  });

  it("reports clipboard failures without throwing", async () => {
    jest
      .mocked(Clipboard.setStringAsync)
      .mockRejectedValueOnce(new Error("clipboard unavailable"));
    render(
      <FactoryCopyField
        label="English address"
        testID="copy-address-error"
        value={factory.address.en}
      />,
    );

    fireEvent.press(screen.getByTestId("copy-address-error"));
    await waitFor(() => {
      expect(screen.getByText("Could not copy")).toBeOnTheScreen();
    });
  });

  it("keeps unsafe websites non-actionable and reports native failures", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValueOnce(new Error("blocked"));
    render(
      <FactoryContactActions
        contact={{
          email: "sales@bright.example.test",
          website: "javascript:alert(1)",
        }}
        factoryId={factory.id}
        slug={factory.slug}
      />,
    );

    expect(screen.queryByTestId("factory-contact-website")).toBeNull();
    expect(screen.getByText("javascript:alert(1)")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("factory-contact-email"));
    await waitFor(() => {
      expect(
        screen.getByText("This action could not be completed. Try again."),
      ).toBeOnTheScreen();
    });
  });
});

describe("mobile factory detail states and map", () => {
  it("offers Retry for service errors and only a map return for 404", () => {
    const retry = jest.fn();
    const back = jest.fn();
    const { rerender } = render(
      <FactoryDetailState kind="error" onBack={back} onRetry={retry} />,
    );

    fireEvent.press(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<FactoryDetailState kind="not-found" onBack={back} />);
    expect(screen.getByText("This factory was not found")).toBeOnTheScreen();
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("preserves WGS-84 order and retries map failures with attribution", () => {
    render(
      <FactoryLocationMap
        location={factory.location}
        name={factory.name}
        verified={factory.verified}
      />,
    );

    expect(screen.getByTestId("factory-detail-map")).toHaveAccessibilityValue({
      text: "120.08,29.31",
    });
    fireEvent.press(screen.getByTestId("maplibre-fail-loading"));
    expect(
      screen.getByText("The map preview could not be loaded."),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Retry"));
    expect(screen.getByText("Loading map preview…")).toBeOnTheScreen();
    expect(
      screen.getByText("© MapTiler · © OpenStreetMap contributors"),
    ).toBeOnTheScreen();
  });
});

describe("mobile factory detail route", () => {
  it("loads A-5, tracks one view, routes related factories, and falls back to the map", async () => {
    const push = jest.fn();
    const replace = jest.fn();
    jest.mocked(useLocalSearchParams).mockReturnValue({
      slug: "yiwu-bright-goods",
    });
    jest
      .mocked(useRouter)
      .mockReturnValue(
        routerMock({ canGoBack: jest.fn(() => false), push, replace }),
      );
    jest.mocked(useGetFactory).mockReturnValue({
      data: { data: factory, error: null, meta: {} },
      error: null,
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetFactory>);

    const view = render(<FactoryDetailScreen />);

    expect(useGetFactory).toHaveBeenCalledWith("yiwu-bright-goods", {
      query: {
        enabled: true,
        staleTime: 300_000,
      },
    });
    await waitFor(() => {
      expect(analytics.trackFactoryViewed).toHaveBeenCalledWith({
        factoryId: factory.id,
        slug: factory.slug,
      });
    });
    view.rerender(<FactoryDetailScreen />);
    expect(analytics.trackFactoryViewed).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("related-factory-yiwu-signal-works"));
    expect(push).toHaveBeenCalledWith({
      params: { slug: "yiwu-signal-works" },
      pathname: "/factories/[slug]",
    });

    fireEvent.press(screen.getByTestId("factory-detail-back"));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("maps A-5 404 and service failures to distinct states", () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ slug: "missing-factory" });
    jest.mocked(useRouter).mockReturnValue(routerMock());
    jest.mocked(useGetFactory).mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isError: true,
      isPending: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetFactory>);

    const view = render(<FactoryDetailScreen />);
    expect(screen.getByText("This factory was not found")).toBeOnTheScreen();

    jest.mocked(useGetFactory).mockReturnValue({
      data: undefined,
      error: { status: 503 },
      isError: true,
      isPending: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetFactory>);
    view.rerender(<FactoryDetailScreen />);
    expect(
      screen.getByText("We could not load this factory"),
    ).toBeOnTheScreen();
  });
});
