import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  store: { findUnique: vi.fn() },
  category: { findMany: vi.fn(), findFirst: vi.fn() },
  product: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  orderItem: { groupBy: vi.fn() },
}));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));
// Caching has its own tests; here every read goes straight to the loader
vi.mock("./lib/cache", () => ({ cached: (_s: string, _k: string, load: () => unknown) => load() }));

import { createApp } from "./app";

const app = createApp();

const categories = [
  { id: "c_home", parentId: null, name: "Smart Home", slug: "smart-home", imageUrl: null },
  { id: "c_plug", parentId: "c_home", name: "Smart Plugs", slug: "smart-plugs", imageUrl: null },
  { id: "c_led", parentId: null, name: "LED Lighting", slug: "led-lighting", imageUrl: null },
];

const row = (id: string, price: number, day: number, extra: object = {}) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  shortDescription: null,
  isFeatured: false,
  status: "ACTIVE",
  tags: [],
  createdAt: new Date(2026, 0, day),
  category: { name: "LED Lighting", slug: "led-lighting" },
  brand: null,
  variants: [{ sku: `SKU-${id}`, price, comparePrice: null, stock: 5 }],
  images: [{ url: `https://img/${id}.jpg` }],
  ...extra,
});

beforeEach(() => {
  vi.resetAllMocks();
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.category.findMany.mockResolvedValue(categories);
});

describe("GET /api/v1/products", () => {
  it("paginates newest-first with meta", async () => {
    prisma.product.count.mockResolvedValue(45);
    prisma.product.findMany.mockResolvedValue([row("a", 1190, 2), row("b", 500, 1)]);

    const res = await request(app).get("/api/v1/products?page=3&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 3, limit: 10, total: 45 });
    expect(res.body.data[0]).toMatchObject({
      id: "a",
      price: 1190,
      inStock: true,
      imageUrl: "https://img/a.jpg",
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("defaults to page 1, limit 20", async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/v1/products");
    expect(res.body).toEqual({ success: true, data: [], meta: { page: 1, limit: 20, total: 0 } });
  });

  it("applies category (with sub-categories), brand, price and stock filters", async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);

    await request(app).get(
      "/api/v1/products?category=smart-home&brand=tp-link&minPrice=500&maxPrice=2000&inStock=true",
    );

    const where = prisma.product.count.mock.calls[0]![0].where;
    expect(where).toEqual({
      storeId: "store_1",
      status: "ACTIVE",
      categoryId: { in: ["c_home", "c_plug"] },
      brand: { slug: "tp-link" },
      variants: { some: { isActive: true, price: { gte: 500, lte: 2000 }, stock: { gt: 0 } } },
    });
  });

  it("treats inStock=false as no stock filter", async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    await request(app).get("/api/v1/products?inStock=false");
    expect(prisma.product.count.mock.calls[0]![0].where.variants).toEqual({
      some: { isActive: true },
    });
  });

  it("matches nothing for an unknown category", async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    await request(app).get("/api/v1/products?category=nope");
    expect(prisma.product.count.mock.calls[0]![0].where.categoryId).toEqual({ in: [] });
  });

  it("sorts by price ascending across pages", async () => {
    prisma.product.findMany
      .mockResolvedValueOnce([
        { id: "a", createdAt: new Date(2026, 0, 1), variants: [{ price: 900 }] },
        { id: "b", createdAt: new Date(2026, 0, 2), variants: [{ price: 300 }, { price: 800 }] },
        { id: "c", createdAt: new Date(2026, 0, 3), variants: [{ price: 600 }] },
      ])
      .mockResolvedValueOnce([row("c", 600, 3)]);

    const res = await request(app).get("/api/v1/products?sort=price_asc&page=2&limit=1");

    expect(res.body.meta).toEqual({ page: 2, limit: 1, total: 3 });
    // ranking is b(300), c(600), a(900) → page 2 of size 1 is c
    expect(prisma.product.findMany.mock.calls[1]![0].where).toEqual({ id: { in: ["c"] } });
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual(["c"]);
  });

  it("sorts by price descending", async () => {
    prisma.product.findMany
      .mockResolvedValueOnce([
        { id: "a", createdAt: new Date(2026, 0, 1), variants: [{ price: 900 }] },
        { id: "b", createdAt: new Date(2026, 0, 2), variants: [{ price: 300 }] },
      ])
      .mockResolvedValueOnce([row("a", 900, 1), row("b", 300, 2)]);

    const res = await request(app).get("/api/v1/products?sort=price_desc");
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual(["a", "b"]);
  });

  it("sorts bestselling by units sold, ignoring cancelled/returned orders, ties newest first", async () => {
    prisma.product.findMany
      .mockResolvedValueOnce([
        { id: "a", createdAt: new Date(2026, 0, 1), variants: [{ price: 100 }] },
        { id: "b", createdAt: new Date(2026, 0, 2), variants: [{ price: 100 }] },
        { id: "c", createdAt: new Date(2026, 0, 3), variants: [{ price: 100 }] },
      ])
      .mockResolvedValueOnce([row("a", 100, 1), row("b", 100, 2), row("c", 100, 3)]);
    prisma.orderItem.groupBy.mockResolvedValue([
      { productId: "a", _sum: { quantity: 10 } },
      { productId: "b", _sum: { quantity: 2 } },
    ]);

    const res = await request(app).get("/api/v1/products?sort=bestselling");

    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual(["a", "b", "c"]);
    expect(prisma.orderItem.groupBy.mock.calls[0]![0].where.order).toEqual({
      status: { notIn: ["CANCELLED", "RETURNED"] },
    });
  });

  it.each([
    ["page=0"],
    ["limit=101"],
    ["sort=cheapest"],
    ["inStock=maybe"],
    ["minPrice=-5"],
    ["minPrice=900&maxPrice=100"],
  ])("rejects invalid query %s with 400", async (qs) => {
    const res = await request(app).get(`/api/v1/products?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/products/:slug", () => {
  const detail = {
    ...row("a", 1190, 1, { categoryId: "c_led", description: "Long text" }),
    variants: [
      {
        id: "v1",
        name: "Warm",
        sku: "SKU-a",
        price: 1190,
        comparePrice: 1500,
        stock: 3,
        isDefault: true,
        sortOrder: 0,
        attributes: [
          { attributeValue: { value: "Warm White", swatch: null, attribute: { name: "Color" } } },
        ],
      },
    ],
    images: [{ id: "i1", url: "https://img/a.jpg", alt: null, kind: "STANDARD", variantId: null }],
    bulkTiers: [{ id: "t1", variantId: null, minQty: 3, unitPrice: 1000, label: "Buy 3" }],
  };

  it("returns variants, images, bulk tiers and related products from the same category", async () => {
    prisma.product.findFirst.mockResolvedValue(detail);
    prisma.product.findMany.mockResolvedValue([row("b", 700, 2)]);

    const res = await request(app).get("/api/v1/products/product-a");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: "product-a",
      price: 1190,
      comparePrice: 1500,
      description: "Long text",
      variants: [
        { id: "v1", attributes: [{ attribute: "Color", value: "Warm White", swatch: null }] },
      ],
      images: [{ id: "i1" }],
      bulkTiers: [{ minQty: 3, unitPrice: 1000 }],
      relatedProducts: [{ id: "b" }],
    });
    expect(prisma.product.findFirst.mock.calls[0]![0].where).toEqual({
      storeId: "store_1",
      slug: "product-a",
      status: "ACTIVE",
    });
    expect(prisma.product.findMany.mock.calls[0]![0].where).toMatchObject({
      categoryId: "c_led",
      id: { not: "a" },
    });
  });

  it("returns 404 for an unknown slug", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/products/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found",
    });
  });
});

describe("categories", () => {
  it("GET /categories returns the tree", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual([
      "smart-home",
      "led-lighting",
    ]);
    expect(res.body.data[0].children).toMatchObject([{ slug: "smart-plugs", children: [] }]);
  });

  it("GET /categories/:slug returns children and ancestors", async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: "c_plug",
      name: "Smart Plugs",
      slug: "smart-plugs",
      description: null,
      imageUrl: null,
      seoTitle: null,
      seoDescription: null,
    });
    const res = await request(app).get("/api/v1/categories/smart-plugs");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: "smart-plugs",
      ancestors: [{ name: "Smart Home", slug: "smart-home" }],
      children: [],
    });
  });

  it("GET /categories/:slug returns 404 for an unknown slug", async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/categories/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: "CATEGORY_NOT_FOUND" });
  });
});

describe("GET /api/v1/search", () => {
  it("requires q", async () => {
    const res = await request(app).get("/api/v1/search");
    expect(res.status).toBe(400);
  });

  it("queries Meilisearch scoped to the store and returns plain product cards", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: [
            {
              id: "a",
              name: "Smart Plug",
              slug: "smart-plug",
              price: 800,
              storeId: "store_1",
              skus: ["X"],
              tags: [],
              categoryName: "Smart Home",
              brandName: null,
            },
          ],
          estimatedTotalHits: 7,
        }),
        { status: 200 },
      ),
    );

    const res = await request(app).get("/api/v1/search?q=plug&page=2&limit=5");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 2, limit: 5, total: 7 });
    expect(res.body.data).toEqual([
      { id: "a", name: "Smart Plug", slug: "smart-plug", price: 800 },
    ]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/indexes/products/search");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      q: "plug",
      filter: 'storeId = "store_1"',
      offset: 5,
      limit: 5,
    });
    fetchMock.mockRestore();
  });

  it("falls back to Postgres ILIKE search when Meilisearch is down", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([row("a", 800, 1)]);

    const res = await request(app).get("/api/v1/search?q=Plug&page=2&limit=5");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 2, limit: 5, total: 1 });
    expect(res.body.data[0]).toMatchObject({ id: "a", price: 800 });
    const args = prisma.product.findMany.mock.calls[0]![0];
    expect(args).toMatchObject({ skip: 5, take: 5 });
    expect(args.where).toMatchObject({ storeId: "store_1", status: "ACTIVE" });
    expect(args.where.OR[0]).toEqual({ name: { contains: "Plug", mode: "insensitive" } });
    fetchMock.mockRestore();
  });

  it("falls back when the index is missing (404) instead of returning SEARCH_ERROR", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 404 }));
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/v1/search?q=plug");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [], meta: { total: 0 } });
    fetchMock.mockRestore();
  });
});
