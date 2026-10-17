import { describe, expect, it } from "vitest";
import {
  canTransition,
  convertIncompleteSchema,
  dhakaDate,
  dhakaRange,
  isAllowedTransition,
  isLateConfirmation,
  nextStatuses,
  orderItemsInputSchema,
} from "./orders";

describe("order transitions", () => {
  it("allows the normal flow and rejects skips and terminal moves", () => {
    expect(isAllowedTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(isAllowedTransition("CONFIRMED", "PACKED")).toBe(true);
    expect(isAllowedTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(isAllowedTransition("PENDING", "SHIPPED")).toBe(false);
    expect(isAllowedTransition("CONFIRMED", "PENDING")).toBe(false);
    expect(isAllowedTransition("RETURNED", "PENDING")).toBe(false);
    expect(isAllowedTransition("PENDING", "PENDING")).toBe(false);
  });

  it("limits moves by role", () => {
    expect(canTransition("PENDING", "CONFIRMED", "CALL_AGENT")).toBe(true);
    expect(canTransition("PENDING", "CONFIRMED", "PACKER")).toBe(false);
    expect(canTransition("CONFIRMED", "PACKED", "PACKER")).toBe(true);
    expect(canTransition("CONFIRMED", "PACKED", "CALL_AGENT")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED", "OWNER")).toBe(true);
    expect(nextStatuses("PENDING", "CALL_AGENT")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(nextStatuses("PENDING", "PACKER")).toEqual([]);
  });
});

describe("late confirmation", () => {
  it("is late only after 7 full days", () => {
    const placed = new Date("2026-10-01T10:00:00Z");
    expect(isLateConfirmation(placed, new Date("2026-10-08T10:00:00Z"))).toBe(false);
    expect(isLateConfirmation(placed, new Date("2026-10-08T10:00:01Z"))).toBe(true);
  });
});

describe("Dhaka dates", () => {
  it("uses the Bangladesh calendar day", () => {
    // 20:00 UTC is 02:00 the next day in Dhaka
    expect(dhakaDate(new Date("2026-10-16T20:00:00Z"))).toBe("2026-10-17");
  });

  it("covers whole days, end exclusive", () => {
    const r = dhakaRange("2026-10-01", "2026-10-31");
    expect(r.gte?.toISOString()).toBe("2026-09-30T18:00:00.000Z");
    expect(r.lt?.toISOString()).toBe("2026-10-31T18:00:00.000Z");
    expect(dhakaRange()).toEqual({ gte: undefined, lt: undefined });
  });
});

describe("order item edits", () => {
  const item = { variantId: "v1", quantity: 2, unitPrice: 500 };

  it("rejects duplicate lines and a discount above the subtotal", () => {
    const r = orderItemsInputSchema.safeParse({
      items: [item, item],
      discount: 5000,
      shippingFee: 60,
    });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Item is listed twice");
    expect(messages).toContain("Discount is more than the subtotal");
  });

  it("normalizes the phone when converting an incomplete checkout", () => {
    const r = convertIncompleteSchema.parse({
      name: "Rahim",
      phone: "+880 1712-345678",
      address: "House 1, Road 2, Mirpur",
      district: "Dhaka",
      items: [item],
      shippingFee: 60,
    });
    expect(r.phone).toBe("01712345678");
    expect(r.discount).toBe(0);
  });
});
