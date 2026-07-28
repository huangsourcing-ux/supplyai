import {
  buildEmailUrl,
  buildPhoneUrl,
  formatVerificationMonth,
  hasFactoryContact,
  normalizeFactorySlug,
  safeHttpUrl,
} from "./factory-detail-model";

describe("factory detail model", () => {
  it("normalizes direct and array route params", () => {
    expect(normalizeFactorySlug("  yiwu-bright-goods ")).toBe(
      "yiwu-bright-goods",
    );
    expect(normalizeFactorySlug(["dongguan-vivo-mobile", "ignored"])).toBe(
      "dongguan-vivo-mobile",
    );
    expect(normalizeFactorySlug("  ")).toBeNull();
    expect(normalizeFactorySlug([])).toBeNull();
    expect(normalizeFactorySlug(undefined)).toBeNull();
  });

  it("formats the verification month without local timezone conversion", () => {
    expect(formatVerificationMonth("2026-05-31T23:30:00Z")).toBe("2026-05");
    expect(formatVerificationMonth(null)).toBeNull();
  });

  it("accepts only HTTP(S) external URLs", () => {
    expect(safeHttpUrl("https://factory.example.test/source")).toBe(
      "https://factory.example.test/source",
    );
    expect(safeHttpUrl("http://factory.example.test")).toBe(
      "http://factory.example.test/",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("detects usable contact fields and creates platform URLs", () => {
    expect(hasFactoryContact(null)).toBe(false);
    expect(hasFactoryContact({})).toBe(false);
    expect(hasFactoryContact({ website: "https://factory.example.test" })).toBe(
      true,
    );
    expect(buildEmailUrl("sales@example.test")).toBe(
      "mailto:sales%40example.test",
    );
    expect(buildPhoneUrl("+86 769 1234 5678")).toBe(
      "tel:%2B86%20769%201234%205678",
    );
  });
});
