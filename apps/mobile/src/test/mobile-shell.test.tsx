import { render, screen } from "@testing-library/react-native";

import "../lib/i18n";
import MobileShellScreen from "../app/index";

describe("mobile shell", () => {
  it("renders the English i18n shell without template demo content", () => {
    render(<MobileShellScreen />);

    expect(screen.getByText("ChinaSupply.AI")).toBeOnTheScreen();
    expect(
      screen.getByText("Expo application shell is ready"),
    ).toBeOnTheScreen();
  });
});
