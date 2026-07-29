import {
  type GetCategories200DataItem,
  useGetCategories,
} from "@chinasupply/api-client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import "../../lib/i18n";
import ExploreScreen from "./explore-screen";

const categories: GetCategories200DataItem[] = [
  {
    children: [],
    color: "#2563EB",
    icon: "cpu",
    id: "cat000000000000000001",
    name: "Electronics",
    parentId: null,
    slug: "electronics",
    sortOrder: 10,
  },
  {
    children: [],
    color: "#F59E0B",
    icon: "future-icon",
    id: "cat000000000000000002",
    name: "Lighting",
    parentId: null,
    slug: "lighting",
    sortOrder: 20,
  },
];

const push = jest.fn();

function categoriesResult(
  data: GetCategories200DataItem[] | undefined,
  state: "error" | "loading" | "ready" = "ready",
) {
  return {
    data:
      data === undefined ? undefined : { data, error: null, meta: {} as const },
    isError: state === "error",
    isPending: state === "loading",
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useGetCategories>;
}

describe("Mobile Explore category grid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useRouter)
      .mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useGetCategories).mockReturnValue(categoriesResult(categories));
  });

  it("renders A-7 root categories in API order with color and icon fallback", () => {
    render(<ExploreScreen />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map(({ props }) => props.accessibilityLabel)).toEqual([
      "Browse Electronics industrial clusters",
      "Browse Lighting industrial clusters",
    ]);
    expect(screen.getByTestId("category-icon-microchip")).toBeOnTheScreen();
    expect(screen.getByTestId("category-icon-shapes")).toBeOnTheScreen();
    expect(
      screen.getByTestId("explore-category-color-electronics"),
    ).toHaveStyle({ backgroundColor: "#2563EB1F" });
  });

  it("routes an exact root slug into the nested Explore stack", () => {
    render(<ExploreScreen />);

    fireEvent.press(screen.getByTestId("explore-category-electronics"));
    expect(push).toHaveBeenCalledWith({
      params: { slug: "electronics" },
      pathname: "/explore/[slug]",
    });
  });

  it("renders loading, Retry, and no-category states", () => {
    jest
      .mocked(useGetCategories)
      .mockReturnValue(categoriesResult(undefined, "loading"));
    const { rerender } = render(<ExploreScreen />);
    expect(screen.getByTestId("explore-loading")).toBeOnTheScreen();

    const errorResult = categoriesResult(undefined, "error");
    jest.mocked(useGetCategories).mockReturnValue(errorResult);
    rerender(<ExploreScreen />);
    fireEvent.press(screen.getByText("Try again"));
    expect(errorResult.refetch).toHaveBeenCalledTimes(1);

    jest.mocked(useGetCategories).mockReturnValue(categoriesResult([]));
    rerender(<ExploreScreen />);
    expect(screen.getByTestId("explore-empty")).toBeOnTheScreen();
  });
});
