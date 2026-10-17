import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  brand: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  product: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const prisma = vi.hoisted(() => ({
  store: { findUnique: vi.fn() },
  adminUser: { findFirst: vi.fn() },
  product: { count: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("./lib/cache", () => ({ invalidateCatalogCache: vi.fn(), cached: vi.fn() }));
const queues = vi.hoisted(() => ({ enqueueProductSync: vi.fn(), enqueueStorageDelete: vi.fn() }));
vi.mock("./queues", () => queues);

import { createApp } from "./app";
import { signAdminToken } from "./services/token.service";

const app = createApp();
const cookie = (role: "OWNER" | "MANAGER" | "PACKER") =>
  `pg_admin=${signAdminToken({ sub: "admin_1", storeId: "store_1", role })}`;

beforeEach(() => {
  vi.resetAllMocks();
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
});

const asRole = (role: "OWNER" | "MANAGER" | "PACKER") =>
  prisma.adminUser.findFirst.mockResolvedValue({ id: "admin_1", email: "a@b.c", name: "A", role });

describe("admin catalog access", () => {
  it("requires a session", async () => {
    const res = await request(app).get("/api/v1/admin/products");
    expect(res.status).toBe(401);
  });

  it("is closed to packers and call agents", async () => {
    asRole("PACKER");
    const res = await request(app).get("/api/v1/admin/products").set("cookie", cookie("PACKER"));
    expect(res.status).toBe(403);
  });

  it("lists products for a manager with pagination meta", async () => {
    asRole("MANAGER");
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Lamp",
        slug: "lamp",
        status: "ACTIVE",
        updatedAt: new Date("2026-10-01"),
        category: { name: "Lights" },
        brand: null,
        variants: [
          { price: 1190, stock: 3, isActive: true },
          { price: 990, stock: 9, isActive: false },
        ],
        images: [],
      },
    ]);
    const res = await request(app)
      .get("/api/v1/admin/products?q=lamp&status=ACTIVE&limit=10")
      .set("cookie", cookie("MANAGER"));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 1 });
    // Price and stock count active variants only
    expect(res.body.data[0]).toMatchObject({ price: 1190, stock: 3, variantCount: 2, category: "Lights" });
    expect(prisma.product.findMany.mock.calls[0]![0].where).toMatchObject({ storeId: "store_1", status: "ACTIVE" });
  });
});

describe("admin writes", () => {
  it("validates the product body with the shared schema", async () => {
    asRole("OWNER");
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("cookie", cookie("OWNER"))
      .send({
        name: "Lamp",
        slug: "Not A Slug",
        status: "ACTIVE",
        variants: [
          { name: "A", sku: "X", price: 100, stock: 1 },
          { name: "B", sku: "x", price: 100, comparePrice: 90, stock: 1 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("body.slug");
    expect(res.body.message).toContain("SKU is used twice");
    expect(res.body.message).toContain("Compare price must be higher");
  });

  it("creates a brand and writes an AuditLog row in the same transaction", async () => {
    asRole("OWNER");
    tx.brand.create.mockResolvedValue({
      id: "b1",
      name: "Baseus",
      slug: "baseus",
      logoUrl: null,
      _count: { products: 0 },
    });
    const res = await request(app)
      .post("/api/v1/admin/brands")
      .set("cookie", cookie("OWNER"))
      .set("cf-connecting-ip", "203.0.113.9")
      .send({ name: "Baseus", slug: "baseus", logoUrl: "" });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: "b1", name: "Baseus", slug: "baseus", logoUrl: null, productCount: 0 });
    expect(tx.brand.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Baseus", slug: "baseus", logoUrl: null, storeId: "store_1" } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: "store_1",
        adminUserId: "admin_1",
        action: "brand.create",
        entity: "Brand",
        entityId: "b1",
        ip: "203.0.113.9",
      }),
    });
  });

  it("maps a duplicate slug to 409", async () => {
    asRole("OWNER");
    tx.brand.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002", meta: { modelName: "Brand" } }));
    const res = await request(app)
      .post("/api/v1/admin/brands")
      .set("cookie", cookie("OWNER"))
      .send({ name: "Baseus", slug: "baseus" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SLUG_TAKEN");
  });

  it("queues the old logo for deletion and resyncs products when a brand changes", async () => {
    asRole("OWNER");
    tx.brand.findFirst.mockResolvedValue({ id: "b1", name: "Old", slug: "old", logoUrl: "/uploads/stores/store_1/brands/a.png" });
    tx.brand.update.mockResolvedValue({ id: "b1", name: "New", slug: "old", logoUrl: null, _count: { products: 2 } });
    tx.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    const res = await request(app)
      .put("/api/v1/admin/brands/b1")
      .set("cookie", cookie("OWNER"))
      .send({ name: "New", slug: "old", logoUrl: null });
    expect(res.status).toBe(200);
    expect(queues.enqueueStorageDelete).toHaveBeenCalledWith(["stores/store_1/brands/a.png"]);
    expect(queues.enqueueProductSync.mock.calls.map((c) => c[0])).toEqual(["p1", "p2"]);
  });
});
