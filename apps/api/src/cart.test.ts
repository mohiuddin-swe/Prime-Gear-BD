import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => {
  const p = {
    store: { findUnique: vi.fn() },
    productVariant: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    cart: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cartItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    upsellRule: { findFirst: vi.fn(), findMany: vi.fn() },
    bulkTier: { findMany: vi.fn() },
    setting: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation((fn: (tx: typeof p) => unknown) => fn(p));
  return p;
});
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));

import { createApp } from "./app";
import {
  assertQuantityAllowed,
  mergeGuestCartIntoCustomer,
  mergedQuantity,
} from "./services/cart.service";

const app = createApp();
const SESSION = "A".repeat(32);
const cookie = `pg_cart=${SESSION}`;

const variant = (over: object = {}) => ({ id: "v1", productId: "p1", stock: 50, ...over });
const line = (over: object = {}) => ({
  id: "i1",
  cartId: "c1",
  productId: "p1",
  variantId: "v1",
  quantity: 1,
  upsellRuleId: null,
  upsellSource: null,
  product: { categoryId: "cat1" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.setting.findMany.mockResolvedValue([]);
  prisma.bulkTier.findMany.mockResolvedValue([]);
  prisma.cartItem.findMany.mockResolvedValue([]);
});

describe("assertQuantityAllowed / mergedQuantity", () => {
  it("allows up to 10 per product across lines and rejects 11", () => {
    expect(() =>
      assertQuantityAllowed({ otherLinesQty: 4, newLineQty: 6, stock: 99 }),
    ).not.toThrow();
    expect(() => assertQuantityAllowed({ otherLinesQty: 4, newLineQty: 7, stock: 99 })).toThrow(
      expect.objectContaining({ code: "CART_LIMIT_EXCEEDED" }),
    );
  });

  it("rejects out of stock and more than stock", () => {
    expect(() => assertQuantityAllowed({ otherLinesQty: 0, newLineQty: 1, stock: 0 })).toThrow(
      expect.objectContaining({ code: "OUT_OF_STOCK" }),
    );
    expect(() => assertQuantityAllowed({ otherLinesQty: 0, newLineQty: 4, stock: 3 })).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_STOCK" }),
    );
  });

  it("merged quantity is capped by product limit and stock", () => {
    expect(mergedQuantity({ existing: 2, incoming: 3, otherLinesQty: 0, stock: 50 })).toBe(5);
    expect(mergedQuantity({ existing: 8, incoming: 5, otherLinesQty: 0, stock: 50 })).toBe(10);
    expect(mergedQuantity({ existing: 4, incoming: 4, otherLinesQty: 5, stock: 50 })).toBe(5);
    expect(mergedQuantity({ existing: 4, incoming: 4, otherLinesQty: 0, stock: 6 })).toBe(6);
  });
});

describe("GET /api/v1/cart", () => {
  it("returns an empty cart with shipping settings and defaults when there is no cookie", async () => {
    const res = await request(app).get("/api/v1/cart");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: null,
      items: [],
      itemCount: 0,
      maxQtyPerProduct: 10,
      shipping: { insideDhaka: 60, outsideDhaka: 110 },
      deliveryEta: { insideDhaka: "1–2 days", outsideDhaka: "2–4 days" },
      freeDelivery: { threshold: null, qualifies: false },
      whatsappNumber: null,
    });
    expect(prisma.cart.findFirst).not.toHaveBeenCalled();
  });

  it("reads shipping, threshold and WhatsApp from Setting and prices by zone", async () => {
    prisma.setting.findMany.mockResolvedValue([
      { key: "shipping.insideDhaka", value: 70 },
      { key: "shipping.outsideDhaka", value: 150 },
      { key: "shipping.freeDeliveryThreshold", value: 2000 },
      { key: "contact.whatsapp", value: "8801700000000" },
    ]);
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([
      {
        ...line({ quantity: 1 }),
        product: {
          name: "Bulb",
          slug: "bulb",
          categoryId: "cat1",
          images: [{ url: "https://img/b.jpg" }],
        },
        variant: { name: "Default", sku: "B1", price: 1000, stock: 9 },
        upsellRule: null,
      },
    ]);

    const res = await request(app).get("/api/v1/cart?zone=OUTSIDE_DHAKA").set("Cookie", cookie);

    expect(res.body.data.pricing).toEqual({
      subtotal: 1000,
      discount: 0,
      shippingFee: 150,
      total: 1150,
    });
    expect(res.body.data.freeDelivery).toEqual({
      threshold: 2000,
      remaining: 1000,
      qualifies: false,
    });
    expect(res.body.data.whatsappNumber).toBe("8801700000000");
    expect(res.body.data.items[0]).toMatchObject({
      name: "Bulb",
      variantName: null,
      imageUrl: "https://img/b.jpg",
    });
  });

  it("scopes the lookup to the cookie session and ignores a malformed cookie", async () => {
    prisma.cart.findFirst.mockResolvedValue(null);
    await request(app).get("/api/v1/cart").set("Cookie", cookie);
    expect(prisma.cart.findFirst.mock.calls[0]![0].where).toMatchObject({
      storeId: "store_1",
      sessionId: SESSION,
      customerId: null,
    });

    prisma.cart.findFirst.mockClear();
    await request(app).get("/api/v1/cart").set("Cookie", "pg_cart=short");
    expect(prisma.cart.findFirst).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/cart", () => {
  it("creates a cart, sets an httpOnly cookie and returns the cart", async () => {
    prisma.productVariant.findFirst.mockResolvedValue(variant());
    prisma.cart.findFirst.mockResolvedValue(null);
    prisma.cart.create.mockImplementation(async ({ data }: { data: { sessionId: string } }) => ({
      id: "c1",
      ...data,
    }));

    const res = await request(app).post("/api/v1/cart").send({ variantId: "v1", quantity: 2 });

    expect(res.status).toBe(200);
    const set = String(res.headers["set-cookie"]);
    expect(set).toMatch(/pg_cart=[\w-]{20,}/);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=Lax/i);
    expect(prisma.cartItem.upsert.mock.calls[0]![0].create).toMatchObject({
      variantId: "v1",
      quantity: 2,
    });
  });

  it("validates the body with Zod (quantity 1-10)", async () => {
    for (const body of [{}, { variantId: "v1", quantity: 0 }, { variantId: "v1", quantity: 11 }]) {
      const res = await request(app).post("/api/v1/cart").send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    }
  });

  it("404s for an unknown or inactive variant", async () => {
    prisma.productVariant.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/cart").send({ variantId: "nope" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("VARIANT_NOT_FOUND");
  });

  it("returns CART_LIMIT_EXCEEDED above 10 per product, counting other variants of it", async () => {
    prisma.productVariant.findFirst.mockResolvedValue(variant({ id: "v2" }));
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([line({ variantId: "v1", quantity: 8 })]);

    const res = await request(app)
      .post("/api/v1/cart")
      .set("Cookie", cookie)
      .send({ variantId: "v2", quantity: 3 });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: "CART_LIMIT_EXCEEDED" });
    expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
  });

  it("returns INSUFFICIENT_STOCK when the line would exceed stock", async () => {
    prisma.productVariant.findFirst.mockResolvedValue(variant({ stock: 3 }));
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([line({ quantity: 2 })]);
    const res = await request(app)
      .post("/api/v1/cart")
      .set("Cookie", cookie)
      .send({ variantId: "v1", quantity: 2 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
  });

  it("increments an existing line instead of duplicating it", async () => {
    prisma.productVariant.findFirst.mockResolvedValue(variant());
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValueOnce([line({ quantity: 2 })]);
    await request(app)
      .post("/api/v1/cart")
      .set("Cookie", cookie)
      .send({ variantId: "v1", quantity: 3 });
    expect(prisma.cartItem.upsert.mock.calls[0]![0].update).toMatchObject({
      quantity: { increment: 3 },
    });
  });

  describe("upsell", () => {
    const rule = {
      id: "r1",
      type: "CART_UPSELL",
      triggerProductId: "trigger",
      triggerCategoryId: null,
    };
    const offerVariant = variant({ id: "vo", productId: "offer" });

    it("records upsellSource and the rule when the trigger product is in the cart", async () => {
      prisma.productVariant.findFirst.mockResolvedValue(offerVariant);
      prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
      prisma.cartItem.findMany.mockResolvedValueOnce([
        line({ productId: "trigger", variantId: "vt" }),
      ]);
      prisma.upsellRule.findFirst.mockResolvedValue(rule);

      const res = await request(app)
        .post("/api/v1/cart")
        .set("Cookie", cookie)
        .send({ variantId: "vo", upsellRuleId: "r1" });

      expect(res.status).toBe(200);
      expect(prisma.cartItem.upsert.mock.calls[0]![0].create).toMatchObject({
        upsellRuleId: "r1",
        upsellSource: "CART_UPSELL",
      });
      // The rule must belong to this store and offer exactly this product
      expect(prisma.upsellRule.findFirst.mock.calls[0]![0].where).toMatchObject({
        storeId: "store_1",
        isActive: true,
        offerProductId: "offer",
      });
    });

    it("accepts a category trigger", async () => {
      prisma.productVariant.findFirst.mockResolvedValue(offerVariant);
      prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
      prisma.cartItem.findMany.mockResolvedValueOnce([
        line({ productId: "other", product: { categoryId: "led" } }),
      ]);
      prisma.upsellRule.findFirst.mockResolvedValue({
        ...rule,
        triggerProductId: null,
        triggerCategoryId: "led",
      });
      const res = await request(app)
        .post("/api/v1/cart")
        .set("Cookie", cookie)
        .send({ variantId: "vo", upsellRuleId: "r1" });
      expect(res.status).toBe(200);
    });

    it("rejects an unknown rule and a rule whose trigger is not in the cart", async () => {
      prisma.productVariant.findFirst.mockResolvedValue(offerVariant);
      prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
      prisma.cartItem.findMany.mockResolvedValue([line({ productId: "unrelated" })]);

      prisma.upsellRule.findFirst.mockResolvedValue(null);
      let res = await request(app)
        .post("/api/v1/cart")
        .set("Cookie", cookie)
        .send({ variantId: "vo", upsellRuleId: "bad" });
      expect(res.body.code).toBe("UPSELL_INVALID");

      prisma.upsellRule.findFirst.mockResolvedValue(rule);
      res = await request(app)
        .post("/api/v1/cart")
        .set("Cookie", cookie)
        .send({ variantId: "vo", upsellRuleId: "r1" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("UPSELL_INVALID");
      expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    });
  });
});

describe("PATCH / DELETE /api/v1/cart/items/:id", () => {
  const owned = () => {
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findFirst.mockResolvedValue({
      ...line({ quantity: 2 }),
      variant: { stock: 20 },
    });
    prisma.cartItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
  };

  it("updates the quantity", async () => {
    owned();
    const res = await request(app)
      .patch("/api/v1/cart/items/i1")
      .set("Cookie", cookie)
      .send({ quantity: 5 });
    expect(res.status).toBe(200);
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { quantity: 5 },
    });
  });

  it("enforces the 10 cap using the product's other lines", async () => {
    owned();
    prisma.cartItem.aggregate.mockResolvedValue({ _sum: { quantity: 6 } });
    const res = await request(app)
      .patch("/api/v1/cart/items/i1")
      .set("Cookie", cookie)
      .send({ quantity: 5 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CART_LIMIT_EXCEEDED");
  });

  it("404s for an item that is not in the caller's cart", async () => {
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findFirst.mockResolvedValue(null);
    const patch = await request(app)
      .patch("/api/v1/cart/items/x")
      .set("Cookie", cookie)
      .send({ quantity: 2 });
    const del = await request(app).delete("/api/v1/cart/items/x").set("Cookie", cookie);
    expect([patch.status, del.status]).toEqual([404, 404]);
    expect(prisma.cartItem.findFirst.mock.calls[0]![0].where).toMatchObject({
      id: "x",
      cartId: "c1",
    });
  });

  it("404s without a cart cookie", async () => {
    const res = await request(app).delete("/api/v1/cart/items/i1");
    expect(res.status).toBe(404);
  });

  it("deletes an owned item", async () => {
    owned();
    const res = await request(app).delete("/api/v1/cart/items/i1").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
  });
});

describe("GET /api/v1/cart/upsells", () => {
  const ruleRow = (id: string, offerId: string, over: object = {}) => ({
    id,
    type: "CART_UPSELL",
    name: `Offer ${id}`,
    discountType: "PERCENT",
    discountValue: 10,
    offerProduct: {
      id: offerId,
      name: `Product ${offerId}`,
      slug: offerId,
      status: "ACTIVE",
      images: [{ url: `https://img/${offerId}.jpg` }],
      variants: [{ id: `var-${offerId}`, price: 1000 }],
      ...over,
    },
  });

  it("returns at most 3 priced offers triggered by the product or its category", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: "p1", categoryId: "cat1" });
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([{ productId: "p1" }]);
    prisma.upsellRule.findMany.mockResolvedValue([
      ruleRow("r1", "a"),
      ruleRow("r2", "b"),
      ruleRow("r3", "c"),
      ruleRow("r4", "d"),
    ]);

    const res = await request(app).get("/api/v1/cart/upsells?productId=p1").set("Cookie", cookie);

    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toMatchObject({
      ruleId: "r1",
      variantId: "var-a",
      originalPrice: 1000,
      offerPrice: 900,
    });
    const where = prisma.upsellRule.findMany.mock.calls[0]![0].where;
    expect(where).toMatchObject({ storeId: "store_1", isActive: true, type: "CART_UPSELL" });
    expect(where.OR).toEqual([{ triggerProductId: "p1" }, { triggerCategoryId: "cat1" }]);
  });

  it("skips products already in the cart, the trigger itself, duplicates, inactive and out-of-stock offers", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: "p1", categoryId: null });
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([{ productId: "p1" }, { productId: "a" }]);
    prisma.upsellRule.findMany.mockResolvedValue([
      ruleRow("r1", "a"), // in cart
      ruleRow("r2", "p1"), // the trigger itself
      ruleRow("r3", "b", { status: "DRAFT" }),
      ruleRow("r4", "c", { variants: [] }), // nothing in stock
      ruleRow("r5", "d"),
      ruleRow("r6", "d"), // duplicate offer product
    ]);
    const res = await request(app).get("/api/v1/cart/upsells?productId=p1").set("Cookie", cookie);
    expect(res.body.data.map((o: { ruleId: string }) => o.ruleId)).toEqual(["r5"]);
    // No category: only the product trigger is queried
    expect(prisma.upsellRule.findMany.mock.calls[0]![0].where.OR).toEqual([
      { triggerProductId: "p1" },
    ]);
  });

  it("returns [] for an unknown product and requires productId", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    expect((await request(app).get("/api/v1/cart/upsells?productId=zz")).body.data).toEqual([]);
    expect((await request(app).get("/api/v1/cart/upsells")).status).toBe(400);
  });
});

describe("mergeGuestCartIntoCustomer", () => {
  const guestItem = (over: object = {}) => ({
    id: "g1",
    productId: "p1",
    variantId: "v1",
    quantity: 3,
    upsellRuleId: null,
    upsellSource: null,
    variant: { stock: 50 },
    ...over,
  });

  it("does nothing without a guest cart", async () => {
    prisma.cart.findFirst.mockResolvedValue(null);
    expect(await mergeGuestCartIntoCustomer("s", "sess", "cust")).toBeNull();
  });

  it("hands the guest cart to the customer when they have none", async () => {
    prisma.cart.findFirst
      .mockResolvedValueOnce({ id: "guest", items: [guestItem()] })
      .mockResolvedValueOnce(null);
    expect(await mergeGuestCartIntoCustomer("s", "sess", "cust")).toBe("guest");
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: "guest" },
      data: { customerId: "cust" },
    });
  });

  it("merges into the customer's cart: sums matching variants (capped) and moves new ones", async () => {
    prisma.cart.findFirst
      .mockResolvedValueOnce({
        id: "guest",
        items: [
          guestItem({ quantity: 5 }),
          guestItem({ id: "g2", productId: "p2", variantId: "v2", quantity: 2 }),
        ],
      })
      .mockResolvedValueOnce({
        id: "mine",
        items: [
          {
            id: "m1",
            cartId: "mine",
            productId: "p1",
            variantId: "v1",
            quantity: 8,
            upsellRuleId: null,
            upsellSource: null,
          },
        ],
      });
    prisma.cartItem.create.mockImplementation(async ({ data }: { data: object }) => ({
      id: "new",
      ...data,
    }));

    expect(await mergeGuestCartIntoCustomer("s", "sess", "cust")).toBe("mine");

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { quantity: 10 },
    }); // 8 + 5 capped
    expect(prisma.cartItem.create.mock.calls[0]![0].data).toMatchObject({
      cartId: "mine",
      variantId: "v2",
      quantity: 2,
    });
    expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: "guest" } });
  });
});
