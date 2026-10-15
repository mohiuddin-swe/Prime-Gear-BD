import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureProductsIndex, SEARCH_SETTINGS } from "./lib/meili";

afterEach(() => vi.restoreAllMocks());

type FetchArgs = [input: string | URL | Request, init?: RequestInit];
const calls = (fetchMock: { mock: { calls: FetchArgs[] } }) =>
  fetchMock.mock.calls.map(
    ([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`,
  );

describe("ensureProductsIndex", () => {
  it("creates the index with its settings when it is missing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockImplementation(
        async () => new Response(JSON.stringify({ taskUid: 1 }), { status: 202 }),
      );

    expect(await ensureProductsIndex()).toBe(true);

    expect(calls(fetchMock)).toEqual([
      "GET /indexes/products",
      "POST /indexes",
      "PATCH /indexes/products/settings",
    ]);
    const patch = fetchMock.mock.calls[2]![1] as RequestInit;
    expect(JSON.parse(String(patch.body))).toEqual(SEARCH_SETTINGS);
    expect(SEARCH_SETTINGS.filterableAttributes).toContain("storeId");
    expect(SEARCH_SETTINGS.sortableAttributes).toContain("price");
  });

  it("does nothing when the index already exists", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await ensureProductsIndex()).toBe(false);
    expect(calls(fetchMock)).toEqual(["GET /indexes/products"]);
  });

  it("rejects when Meilisearch is unreachable (callers decide to warn)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(ensureProductsIndex()).rejects.toMatchObject({ code: "SEARCH_UNAVAILABLE" });
  });
});
