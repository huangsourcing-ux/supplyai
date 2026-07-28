import {
  formatVerificationMonth,
  hasFactoryContact,
  normalizeFactorySlug,
} from "./factory-detail-model";

describe("factory detail model", () => {
  it("accepts only one bounded lowercase slug from the route", () => {
    expect(normalizeFactorySlug("yiwu-bright-goods")).toBe("yiwu-bright-goods");
    expect(normalizeFactorySlug(["dongguan-vivo-mobile", "ignored"])).toBe(
      "dongguan-vivo-mobile",
    );
    expect(normalizeFactorySlug("a".repeat(160))).toBe("a".repeat(160));
    expect(normalizeFactorySlug("../../admin/factories")).toBeNull();
    expect(normalizeFactorySlug("..%2F..%2Fadmin")).toBeNull();
    expect(normalizeFactorySlug("Invalid Slug")).toBeNull();
    expect(normalizeFactorySlug("a".repeat(161))).toBeNull();
    expect(normalizeFactorySlug("  yiwu-bright-goods ")).toBeNull();
    expect(normalizeFactorySlug([])).toBeNull();
    expect(normalizeFactorySlug(undefined)).toBeNull();
  });

  it("formats the verification month without local timezone conversion", () => {
    expect(formatVerificationMonth("2026-05-31T23:30:00Z")).toBe("2026-05");
    expect(formatVerificationMonth(null)).toBeNull();
  });

  it("detects usable contact fields", () => {
    expect(hasFactoryContact(null)).toBe(false);
    expect(hasFactoryContact({})).toBe(false);
    expect(hasFactoryContact({ website: "https://factory.example.test" })).toBe(
      true,
    );
  });
});
