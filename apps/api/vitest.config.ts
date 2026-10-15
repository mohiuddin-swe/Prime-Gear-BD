import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-test-secret-test-secret-123",
      DEFAULT_STORE_SLUG: "teststore",
    },
  },
});
