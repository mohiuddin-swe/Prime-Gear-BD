import { afterEach, describe, expect, it, vi } from "vitest";

const loadEnv = () => {
  vi.resetModules();
  return import("./config/env");
};

describe("storage driver env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the local driver outside production", async () => {
    expect((await loadEnv()).env.STORAGE_DRIVER).toBe("local");
  });

  it("accepts the blank R2 settings copied from .env.example", async () => {
    vi.stubEnv("R2_PUBLIC_URL", "");
    vi.stubEnv("R2_BUCKET", "");
    expect((await loadEnv()).env.R2_PUBLIC_URL).toBeUndefined();
  });

  it("refuses the local driver in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(loadEnv()).rejects.toThrow(/STORAGE_DRIVER=r2/);
  });

  it("needs every R2 setting when the driver is r2", async () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    vi.stubEnv("R2_ACCOUNT_ID", "acc");
    await expect(loadEnv()).rejects.toThrow(/R2_BUCKET/);
  });
});
