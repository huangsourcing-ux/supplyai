import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { ClusterMarkdown } from "./cluster-markdown";

describe("mobile cluster Markdown", () => {
  it("renders common Markdown and omits raw HTML", () => {
    render(
      <ClusterMarkdown
        imageFallbackAlt="Cluster description"
        markdown={
          "## Export network\n\n**Export ready.**\n\n- Lighting\n- Gifts\n\n<script>alert('unsafe')</script>"
        }
      />,
    );

    expect(screen.getByText("Export network")).toBeOnTheScreen();
    expect(screen.getByText("Export ready.")).toBeOnTheScreen();
    expect(screen.getByText("Lighting")).toBeOnTheScreen();
    expect(screen.getByText("Gifts")).toBeOnTheScreen();
    expect(screen.queryByText(/unsafe/u)).toBeNull();
  });

  it("opens HTTP links but renders unsafe schemes as plain text", () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    render(
      <ClusterMarkdown
        imageFallbackAlt="Cluster description"
        markdown={
          "[Source](https://example.com/source) and [unsafe](javascript:alert(1))"
        }
      />,
    );

    fireEvent.press(screen.getByText("Source"));
    expect(openUrl).toHaveBeenCalledWith("https://example.com/source");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull();

    openUrl.mockRestore();
  });

  it("uses fallback alt text for Markdown images", () => {
    render(
      <ClusterMarkdown
        imageFallbackAlt="Yiwu industrial cluster"
        markdown="![](https://media.example.test/cluster.webp)"
      />,
    );

    expect(screen.getByLabelText("Yiwu industrial cluster")).toHaveProp(
      "source",
      { uri: "https://media.example.test/cluster.webp" },
    );
  });
});
