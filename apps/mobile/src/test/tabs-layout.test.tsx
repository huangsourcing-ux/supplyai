import { Tabs } from "expo-router";
import { render } from "@testing-library/react-native";

import "../lib/i18n";
import TabsLayout from "../app/(tabs)/_layout";

describe("M4-T4 mobile tabs", () => {
  it("shows Map, Explore, Saved, and Account in the frozen order", () => {
    render(<TabsLayout />);

    const options = jest
      .mocked(Tabs.Screen)
      .mock.calls.map(([props]) => props)
      .filter(Boolean);

    expect(options).toEqual([
      expect.objectContaining({
        name: "index",
        options: expect.objectContaining({ tabBarLabel: "Map" }),
      }),
      expect.objectContaining({
        name: "explore",
        options: expect.objectContaining({ tabBarLabel: "Explore" }),
      }),
      expect.objectContaining({
        name: "saved",
        options: expect.objectContaining({ tabBarLabel: "Saved" }),
      }),
      expect.objectContaining({
        name: "account",
        options: expect.objectContaining({ tabBarLabel: "Account" }),
      }),
    ]);
  });
});
