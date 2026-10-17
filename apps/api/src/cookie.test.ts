import { afterEach, describe, expect, it, vi } from "vitest";

async function loadOptions(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  if (nodeEnv === "production") {
    // Production refuses the local storage driver, so give it an R2 config
    vi.stubEnv("STORAGE_DRIVER", "r2");
    vi.stubEnv("R2_ACCOUNT_ID", "acc");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET", "media");
    vi.stubEnv("R2_PUBLIC_URL", "https://media.example.com");
  }
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
