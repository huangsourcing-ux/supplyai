import { buildEmailUrl, buildPhoneUrl, safeHttpUrl } from "./external-url";

describe("mobile external URL safety", () => {
  it("accepts only HTTP(S) external URLs", () => {
    expect(safeHttpUrl("https://factory.example.test/source")).toBe(
      "https://factory.example.test/source",
    );
    expect(safeHttpUrl("http://factory.example.test")).toBe(
      "http://factory.example.test/",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/plain,unsafe")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("builds encoded email and normalized telephone URLs", () => {
    expect(buildEmailUrl("sales@example.test")).toBe(
      "mailto:sales%40example.test",
    );
    expect(buildPhoneUrl("+86 (769) 1234-5678")).toBe("tel:+8676912345678");
    expect(buildPhoneUrl("020.1234 5678")).toBe("tel:02012345678");
  });

  it.each([
    ["too short", "12"],
    ["too long", "1234567890123456"],
    ["letters", "+86 CALL NOW"],
    ["non-leading plus", "86+76912345678"],
    ["comma-separated numbers", "123,456"],
    ["semicolon pause", "123;456"],
    ["star service code", "*123"],
    ["hash service code", "123#"],
    ["slash-separated numbers", "123/456"],
    ["newline", "123\n456"],
    ["carriage return", "123\r456"],
    ["Unicode digits", "１２３４５６"],
  ])("rejects %s", (_label, value) => {
    expect(buildPhoneUrl(value)).toBeNull();
  });
});
