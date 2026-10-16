import { describe, expect, it } from "vitest";
import { discountPercent, formatTaka } from "./format";

describe("formatTaka", () => {
  it("formats whole taka with the ৳ sign", () => {
    expect(formatTaka(0)).toBe("৳0");
    expect(formatTaka(990)).toBe("৳990");
    expect(formatTaka(1190)).toBe("৳1,190");
    expect(formatTaka(100000)).toBe("৳1,00,000");
  });
});

describe("discountPercent", () => {
  it("rounds and ignores non-discounts", () => {
    expect(discountPercent(800, 1000)).toBe(20);
    expect(discountPercent(1190, 1490)).toBe(20);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, null)).toBe(0);
  });
});
