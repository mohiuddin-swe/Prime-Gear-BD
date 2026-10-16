import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Browser tests against the running storefront + API (seeded catalog, docker compose services up).
 * Reuses `pnpm dev` when it is already running; otherwise starts the API and web dev servers.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-390",
      // Pixel 7 is Chromium with touch + isMobile; the width is the 390 px phone the brief targets
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @primegear/api dev",
      url: `${API}/api/v1/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @primegear/web dev",
      url: WEB,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
