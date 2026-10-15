import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { healthResponseSchema } from "@primegear/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /api/v1/health", () => {
  let server: Server;
  beforeAll(
    () => new Promise<void>((resolve) => void (server = createApp().listen(0, () => resolve()))),
  );
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("returns ok", async () => {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(await res.json())).toEqual({
      success: true,
      data: { status: "ok" },
    });
  });
});
