import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health";

describe("healthResponseSchema", () => {
  it("accepts the ok payload", () => {
    expect(healthResponseSchema.safeParse({ success: true, data: { status: "ok" } }).success).toBe(
      true,
    );
  });
  it("rejects other statuses", () => {
    expect(
      healthResponseSchema.safeParse({ success: true, data: { status: "down" } }).success,
    ).toBe(false);
  });
});
