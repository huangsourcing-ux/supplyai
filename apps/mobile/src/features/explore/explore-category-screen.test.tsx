import {
  getClusters,
  type GetCategories200DataItem,
  type GetClusters200,
  type GetClusters200DataItem,
  useGetCategories,
} from "@chinasupply/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import "../../lib/i18n";
import ExploreCategoryScreen, {
  ExploreCategoryLoaded,
  ExploreCategoryState,
} from "./explore-category-screen";

const category: GetCategories200DataItem = {
  children: [
    {
      color: null,
      icon: "smartphone",
      id: "cat000000000000000002",
      name: "Consumer Electronics",
      parentId: "cat000000000000000001",
      slug: "consumer-electronics",
      sortOrder: 11,
    },
  ],
  color: "#2563EB",
  icon: "cpu",
  id: "cat000000000000000001",
  name: "Electronics",
  parentId: null,
  slug: "electronics",
  sortOrder: 10,
};

const cluster: GetClusters200DataItem = {
  centroid: { coordinates: [113.8, 23.1], type: "Point" },
  coverImageUrl: null,
  factoryCount: 5,
  id: "clu000000000000000001",
  mainProducts: ["Power supplies", "Electronic components"],
  name: "Dongguan Electronic Information",
  primaryCategory: {
    color: category.color,
    icon: category.icon,
    id: category.id,
    name: category.name,
    parentId: null,
    slug: category.slug,
    sortOrder: category.sortOrder,
  },
  publishedAt: "2026-07-25T12:00:00Z",
  region: {
    id: "reg000000000000000001",
    level: "city",
    name: "Dongguan",
  },
  slug: "dongguan-electronic-information",
  summary: "A major electronics manufacturing cluster.",
};

const secondCluster: GetClusters200DataItem = {
  ...cluster,
  coverImageUrl: "https://media.example.test/clusters/shenzhen.webp",
  factoryCount: 12,
  id: "clu000000000000000002",
  mainProducts: ["Smart devices", "Consumer electronics"],
  name: "Shenzhen Consumer Electronics",
  slug: "shenzhen-consumer-electronics",
  summary: "A consumer-device manufacturing and design cluster.",
};

function page(
  data: GetClusters200DataItem[],
  nextCursor: string | null = null,
): GetClusters200 {
  return { data, error: null, meta: { nextCursor } };
}

function categoriesResult(categories: GetCategories200DataItem[]) {
  return {
    data: { data: categories, error: null, meta: {} },
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useGetCategories>;
}

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ExploreCategoryScreen />
    </QueryClientProvider>,
  );
  return { queryClient, view };
}

describe("Mobile Explore cluster list presentation", () => {
  it("renders cluster identity, products, factory count, image states, and details", () => {
    const onViewDetails = jest.fn();
    render(
      <ExploreCategoryLoaded
        category={category}
        clusters={[cluster, secondCluster]}
        hasNextPage={false}
        isFetchNextPageError={false}
        isFetchingNextPage={false}
        onBack={jest.fn()}
        onFetchNextPage={jest.fn()}
        onViewDetails={onViewDetails}
      />,
    );

    expect(
      screen.getByText("Electronics industrial clusters"),
    ).toBeOnTheScreen();
    expect(screen.getByText(cluster.summary)).toBeOnTheScreen();
    expect(
      screen.getByText("Power supplies · Electronic components"),
    ).toBeOnTheScreen();
    expect(screen.getByText("5 factories")).toBeOnTheScreen();
    expect(screen.getAllByTestId("category-icon-microchip")).toHaveLength(2);
    expect(
      screen.getByLabelText("Shenzhen Consumer Electronics industrial cluster"),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        "explore-cluster-details-dongguan-electronic-information",
      ),
    );
    expect(onViewDetails).toHaveBeenCalledWith(
      "dongguan-electronic-information",
    );
  });

  it("automatically loads, keeps a manual fallback, and retries continuation errors", () => {
    const fetchNextPage = jest.fn();
    const { rerender } = render(
      <ExploreCategoryLoaded
        category={category}
        clusters={[cluster]}
        hasNextPage
        isFetchNextPageError={false}
        isFetchingNextPage={false}
        onBack={jest.fn()}
        onFetchNextPage={fetchNextPage}
        onViewDetails={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Load more clusters"));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    screen.getByTestId("explore-cluster-list").props.onEndReached();
    expect(fetchNextPage).toHaveBeenCalledTimes(2);

    rerender(
      <ExploreCategoryLoaded
        category={category}
        clusters={[cluster]}
        hasNextPage
        isFetchNextPageError
        isFetchingNextPage={false}
        onBack={jest.fn()}
        onFetchNextPage={fetchNextPage}
        onViewDetails={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText("Try again"));
    expect(fetchNextPage).toHaveBeenCalledTimes(3);
  });

  it("shows the selected category's real empty state", () => {
    render(
      <ExploreCategoryLoaded
        category={category}
        clusters={[]}
        hasNextPage={false}
        isFetchNextPageError={false}
        isFetchingNextPage={false}
        onBack={jest.fn()}
        onFetchNextPage={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );

    expect(screen.getByTestId("explore-clusters-empty")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "There are no published industrial clusters in Electronics yet.",
      ),
    ).toBeOnTheScreen();
  });

  it("separates service Retry from an unavailable category", () => {
    const retry = jest.fn();
    const { rerender } = render(
      <ExploreCategoryState kind="error" onBack={jest.fn()} onRetry={retry} />,
    );
    fireEvent.press(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<ExploreCategoryState kind="unavailable" onBack={jest.fn()} />);
    expect(
      screen.getByTestId("explore-category-unavailable"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Try again")).toBeNull();
  });
});

describe("Mobile Explore category route", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ slug: "electronics" });
    jest.mocked(useGetCategories).mockReturnValue(categoriesResult([category]));
    jest.mocked(useRouter).mockReturnValue({
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      push,
      replace: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("passes the exact slug and opaque cursor, deduplicates, and routes details", async () => {
    jest
      .mocked(getClusters)
      .mockResolvedValueOnce(page([cluster], "opaque.cursor_2"))
      .mockResolvedValueOnce(page([cluster, secondCluster]));
    const { queryClient, view } = renderRoute();

    expect(await screen.findByText(cluster.name)).toBeOnTheScreen();
    expect(getClusters).toHaveBeenNthCalledWith(
      1,
      { category: "electronics", limit: 20 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    fireEvent.press(screen.getByText("Load more clusters"));
    expect(await screen.findByText(secondCluster.name)).toBeOnTheScreen();
    expect(getClusters).toHaveBeenNthCalledWith(
      2,
      {
        category: "electronics",
        cursor: "opaque.cursor_2",
        limit: 20,
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getAllByText(cluster.name)).toHaveLength(1);

    fireEvent.press(
      screen.getByTestId(
        "explore-cluster-details-dongguan-electronic-information",
      ),
    );
    expect(push).toHaveBeenCalledWith({
      params: { slug: cluster.slug },
      pathname: "/clusters/[slug]",
    });
    view.unmount();
    queryClient.clear();
  });

  it("renders an empty A-1 result without inventing data", async () => {
    jest.mocked(getClusters).mockResolvedValue(page([]));
    const { queryClient, view } = renderRoute();

    expect(
      await screen.findByTestId("explore-clusters-empty"),
    ).toBeOnTheScreen();
    view.unmount();
    queryClient.clear();
  });

  it("retries an initial A-1 failure", async () => {
    jest
      .mocked(getClusters)
      .mockRejectedValueOnce(new Error("service unavailable"))
      .mockResolvedValueOnce(page([cluster]));
    const { queryClient, view } = renderRoute();

    fireEvent.press(
      await screen.findByText("Try again", {}, { timeout: 2_000 }),
    );
    expect(await screen.findByText(cluster.name)).toBeOnTheScreen();
    expect(getClusters).toHaveBeenCalledTimes(2);
    view.unmount();
    queryClient.clear();
  });

  it("rejects invalid and child-category deep links before A-1", async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ slug: "consumer-electronics" });
    const { queryClient, view } = renderRoute();

    expect(
      await screen.findByTestId("explore-category-unavailable"),
    ).toBeOnTheScreen();
    expect(getClusters).not.toHaveBeenCalled();
    view.unmount();
    queryClient.clear();
  });
});
