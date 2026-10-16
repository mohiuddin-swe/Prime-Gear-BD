import { describe, expect, it } from "vitest";
import { createOrderSchema, incompleteOrderSchema } from "./checkout";

const valid = {
  name: "Rahim Uddin",
  phone: "+880 1712-345678",
  address: "House 12, Road 5, Dhanmondi",
  district: "Dhaka",
  idempotencyKey: "abcdef123456",
};

describe("createOrderSchema", () => {
  it("normalizes the phone and defaults to COD", () => {
    const r = createOrderSchema.parse(valid);
    expect(r.phone).toBe("01712345678");
    expect(r.paymentMethod).toBe("COD");
    expect(r.tracking).toEqual({});
  });

  it("drops empty optional strings instead of keeping them", () => {
    const r = createOrderSchema.parse({
      ...valid,
      thana: "  ",
      note: "",
      tracking: { fbp: "", fbc: "fb.1.1.x" },
    });
    expect(r.thana).toBeUndefined();
    expect(r.note).toBeUndefined();
    expect(r.tracking).toEqual({ fbc: "fb.1.1.x" });
  });

  it.each([
    ["bad phone", { phone: "12345" }],
    ["short name", { name: "A" }],
    ["short address", { address: "Dhaka" }],
    ["unknown district", { district: "Atlantis" }],
    ["non-COD payment", { paymentMethod: "BKASH" }],
    ["missing idempotency key", { idempotencyKey: undefined }],
  ])("rejects %s", (_label, patch) => {
    expect(createOrderSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("incompleteOrderSchema", () => {
  it("needs only a valid phone", () => {
    expect(incompleteOrderSchema.parse({ phone: "01712345678" }).phone).toBe("01712345678");
    expect(incompleteOrderSchema.safeParse({ name: "x" }).success).toBe(false);
  });
});
