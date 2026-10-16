import { describe, expect, it } from "vitest";
import { BD_DISTRICTS, shippingZoneForDistrict } from "./districts";
import { maskPhone, normalizeBdPhone } from "./phone";

describe("normalizeBdPhone", () => {
  it.each([
    ["01712345678", "01712345678"],
    ["017 1234 5678", "01712345678"],
    ["017-1234-5678", "01712345678"],
    ["+8801712345678", "01712345678"],
    ["8801712345678", "01712345678"],
    ["008801712345678", "01712345678"],
    ["1712345678", "01712345678"],
    ["+880 1712-345678", "01712345678"],
    ["০১৭১২৩৪৫৬৭৮", "01712345678"],
    ["  01912345678 ", "01912345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "0171234567", // 10 digits
    "017123456789", // 12 digits
    "01212345678", // 012 is not a mobile operator
    "01012345678",
    "02712345678", // landline-ish
    "abcdefghijk",
    "+8801712345678x",
    "8801712", // truncated
    "+1 415 555 2671", // foreign
  ])("rejects %j", (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });

  it("handles null and undefined", () => {
    expect(normalizeBdPhone(null)).toBeNull();
    expect(normalizeBdPhone(undefined)).toBeNull();
  });
});

describe("maskPhone", () => {
  it("keeps the operator prefix and last two digits", () => {
    expect(maskPhone("01712345678")).toBe("017******78");
  });
});

describe("districts", () => {
  it("has all 64 unique districts", () => {
    expect(BD_DISTRICTS).toHaveLength(64);
    expect(new Set(BD_DISTRICTS).size).toBe(64);
  });

  it("only Dhaka is inside Dhaka for shipping", () => {
    expect(shippingZoneForDistrict("Dhaka")).toBe("INSIDE_DHAKA");
    expect(shippingZoneForDistrict("Gazipur")).toBe("OUTSIDE_DHAKA");
    expect(shippingZoneForDistrict("Sylhet")).toBe("OUTSIDE_DHAKA");
  });
});
