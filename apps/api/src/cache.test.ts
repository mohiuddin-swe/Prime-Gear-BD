import { beforeEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), incr: vi.fn() }));
vi.mock("./lib/redis", () => ({ getRedis: () => redis }));

import { cached, invalidateCatalogCache } from "./lib/cache";

beforeEach(() => vi.resetAllMocks());

describe("catalog cache", () => {
  it("returns the cached value without calling the loader", async () => {
    redis.get.mockResolvedValueOnce("3").mockResolvedValueOnce(JSON.stringify({ n: 1 }));
    const load = vi.fn();
    expect(await cached("s1", "k", load)).toEqual({ n: 1 });
    expect(load).not.toHaveBeenCalled();
    expect(redis.get).toHaveBeenLastCalledWith("catalog:s1:3:k");
  });

  it("loads on a miss and stores for 5 minutes", async () => {
    redis.get.mockResolvedValue(null);
    expect(await cached("s1", "k", async () => ({ n: 2 }))).toEqual({ n: 2 });
    expect(redis.set).toHaveBeenCalledWith("catalog:s1:0:k", '{"n":2}', "EX", 300);
  });

  it("does not cache when the loader throws (e.g. 404)", async () => {
    redis.get.mockResolvedValue(null);
    await expect(
      cached("s1", "k", async () => {
        throw new Error("not found");
      }),
    ).rejects.toThrow("not found");
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("falls back to the loader when Redis is down", async () => {
    redis.get.mockRejectedValue(new Error("down"));
    expect(await cached("s1", "k", async () => "fresh")).toBe("fresh");
  });

  it("invalidation bumps the store version so old keys are never read again", async () => {
    await invalidateCatalogCache("s1");
    expect(redis.incr).toHaveBeenCalledWith("catalog:ver:s1");
  });
});
