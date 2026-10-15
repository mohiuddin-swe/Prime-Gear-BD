import { afterEach, describe, expect, it, vi } from "vitest";

async function loadOptions(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const mod = await import("./services/token.service");
  return mod.adminCookieOptions;
}

describe("admin cookie options", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets Secure in production", async () => {
    const options = await loadOptions("production");
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
  });

  it("does not set Secure outside production", async () => {
    expect((await loadOptions("development")).secure).toBe(false);
  });
});
