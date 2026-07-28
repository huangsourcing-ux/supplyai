import { Tabs } from "expo-router";
import { render } from "@testing-library/react-native";

import "../lib/i18n";
import TabsLayout from "../app/(tabs)/_layout";

describe("M4-T3a mobile tabs", () => {
  it("shows only Map and Account while later tabs remain out of scope", () => {
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
        name: "account",
        options: expect.objectContaining({ tabBarLabel: "Account" }),
      }),
    ]);
  });
});
