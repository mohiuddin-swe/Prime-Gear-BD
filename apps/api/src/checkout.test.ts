import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@primegear/db";

const prisma = vi.hoisted(() => {
  const p = {
    store: { findUnique: vi.fn() },
    cart: { findFirst: vi.fn(), updateMany: vi.fn() },
    cartItem: { findMany: vi.fn(), count: vi.fn() },
    setting: { findMany: vi.fn() },
    bulkTier: { findMany: vi.fn() },
    productVariant: { updateMany: vi.fn() },
    customer: { upsert: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn() },
    incompleteOrder: { deleteMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  return p;
});
const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("./lib/redis", () => ({ getRedis: () => redis }));

import { createApp } from "./app";
import { clientIp } from "./lib/client-ip";
import { generateOrderNumber } from "./services/order.service";

const app = createApp();
const cookie = `pg_cart=${"B".repeat(32)}`;

let phoneSeq = 0;
// Every test uses its own phone: the per-phone rate limit is shared across the file
const nextPhone = () => `0171000${String(++phoneSeq).padStart(4, "0")}`;

const body = (over: object = {}) => ({
  name: "Rahim Uddin",
  phone: nextPhone(),
  address: "House 12, Road 5, Dhanmondi",
  district: "Dhaka",
  idempotencyKey: `key-${Math.random().toString(36).slice(2)}-${phoneSeq}`,
  ...over,
});

const cartRow = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  cartId: "c1",
  productId: "p1",
  variantId: "v1",
  quantity: 2,
  upsellSource: null,
  upsellRule: null,
  product: { name: "Smart Bulb", slug: "smart-bulb", categoryId: "cat", images: [] },
  variant: { name: "Warm White", sku: "BULB-WW", price: 1000, stock: 50 },
  ...over,
});

function happyPath(rows = [cartRow()]) {
  prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
  prisma.cart.updateMany.mockResolvedValue({ count: 1 });
  prisma.cartItem.findMany.mockResolvedValue(rows);
  prisma.cartItem.count.mockResolvedValue(rows.length);
  prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
  prisma.customer.upsert.mockResolvedValue({ id: "cust1" });
  prisma.order.create.mockImplementation(
    async ({ data }: { data: { orderNumber: string; total: number } }) => ({
      id: "o1",
      orderNumber: data.orderNumber,
      total: data.total,
    }),
  );
  prisma.incompleteOrder.deleteMany.mockResolvedValue({ count: 1 });
}

let ipSeq = 0;
// A fresh client IP per request, so the per-IP limiter does not couple unrelated tests
const freshIp = () => `10.0.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;
const postOrder = (b: object, cookieHeader: string | null = cookie) => {
  const r = request(app).post("/api/v1/orders").set("X-Forwarded-For", freshIp());
  return (cookieHeader ? r.set("Cookie", cookieHeader) : r).send(b);
};

const created = () => prisma.order.create.mock.calls[0]![0].data;

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.setting.findMany.mockResolvedValue([]);
  prisma.bulkTier.findMany.mockResolvedValue([]);
  redis.get.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
  redis.del.mockResolvedValue(1);
});

describe("POST /api/v1/orders", () => {
  it("creates the order in one transaction with snapshots, status log, payment and customer", async () => {
    happyPath();
    const input = body({
      thana: "Dhanmondi",
      note: "Call first",
      tracking: { fbp: "fb.1.1.2", fbclid: "" },
    });

    const res = await postOrder(input);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      leadEventId: expect.stringMatching(/^lead_PG\d{8}$/),
      total: 2060,
      customerId: "cust1",
    });
    expect(res.body.data.orderNumber).toMatch(/^PG\d{8}$/);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const data = created();
    expect(data).toMatchObject({
      storeId: "store_1",
      customerId: "cust1",
      phone: input.phone,
      name: "Rahim Uddin",
      district: "Dhaka",
      thana: "Dhanmondi",
      note: "Call first",
      subtotal: 2000,
      discount: 0,
      shippingFee: 60, // inside Dhaka default
      total: 2060,
      paymentMethod: "COD",
      status: "PENDING",
      source: "WEBSITE",
      fbp: "fb.1.1.2",
      fbclid: undefined, // empty strings are never stored
    });
    expect(data.items.create[0]).toMatchObject({
      productName: "Smart Bulb",
      variantName: "Warm White",
      sku: "BULB-WW",
      unitPrice: 1000,
      quantity: 2,
      lineTotal: 2000,
    });
    expect(data.statusLogs.create).toMatchObject({ fromStatus: null, toStatus: "PENDING" });
    expect(data.payments.create).toMatchObject({ method: "COD", status: "PENDING", amount: 2060 });
    expect(data.leadEventId).toBe(res.body.data.leadEventId);

    expect(prisma.customer.upsert.mock.calls[0]![0]).toMatchObject({
      where: { storeId_phone: { storeId: "store_1", phone: input.phone } },
    });
    expect(prisma.cart.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", status: "ACTIVE" },
      data: { status: "CONVERTED" },
    });
    // the abandoned-checkout record is removed in the same transaction
    expect(prisma.incompleteOrder.deleteMany.mock.calls[0]![0].where).toMatchObject({
      storeId: "store_1",
      status: "OPEN",
      OR: expect.arrayContaining([{ phone: input.phone }, { sessionId: "B".repeat(32) }]),
    });
  });

  it("decrements stock atomically and only while enough is left", async () => {
    happyPath();
    await postOrder(body());
    expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: "v1", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it("returns 409 and creates nothing when stock ran out", async () => {
    happyPath();
    prisma.productVariant.updateMany.mockResolvedValue({ count: 0 });
    const res = await postOrder(body());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
    expect(res.body.message).toMatch(/Smart Bulb/);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("prices on the server: ignores client totals, applies tiers, zone fee and free delivery", async () => {
    happyPath([cartRow({ quantity: 3 })]);
    prisma.bulkTier.findMany.mockResolvedValue([
      { productId: "p1", variantId: "v1", minQty: 3, unitPrice: 900 },
    ]);
    prisma.setting.findMany.mockResolvedValue([
      { key: "shipping.outsideDhaka", value: 150 },
      { key: "shipping.freeDeliveryThreshold", value: 5000 },
    ]);

    await postOrder(body({ district: "Gazipur", total: 1, subtotal: 1, shippingFee: 0 }));

    expect(created()).toMatchObject({
      subtotal: 3000,
      discount: 300,
      shippingFee: 150,
      total: 2850,
    });
    expect(created().items.create[0]).toMatchObject({ unitPrice: 900, lineTotal: 2700 });
  });

  it("charges no shipping once the free-delivery threshold is reached", async () => {
    happyPath([cartRow({ quantity: 6 })]);
    prisma.setting.findMany.mockResolvedValue([
      { key: "shipping.freeDeliveryThreshold", value: 5000 },
    ]);
    await postOrder(body({ district: "Sylhet" }));
    expect(created()).toMatchObject({ subtotal: 6000, shippingFee: 0, total: 6000 });
  });

  it("copies upsellSource onto the order item", async () => {
    happyPath([cartRow({ upsellSource: "CART_UPSELL" })]);
    await postOrder(body());
    expect(created().items.create[0].upsellSource).toBe("CART_UPSELL");
  });

  describe("client IP and user agent", () => {
    it("prefers CF-Connecting-IP and stores the user agent", async () => {
      happyPath();
      await request(app)
        .post("/api/v1/orders")
        .set("X-Forwarded-For", freshIp())
        .set("Cookie", cookie)
        .set("CF-Connecting-IP", "103.10.20.30")
        .set("User-Agent", "Mozilla/5.0 TestPhone")
        .send(body());
      expect(created()).toMatchObject({
        clientIp: "103.10.20.30",
        userAgent: "Mozilla/5.0 TestPhone",
      });
    });

    it("ignores a malformed CF-Connecting-IP and falls back to the socket address", async () => {
      happyPath();
      await request(app)
        .post("/api/v1/orders")
        .set("X-Forwarded-For", freshIp())
        .set("Cookie", cookie)
        .set("CF-Connecting-IP", "not-an-ip; drop table")
        .send(body());
      expect(created().clientIp).not.toContain("drop");
      expect(created().clientIp).toMatch(/^[\d.:a-f]+$/i);
    });

    it("clientIp() accepts IPv6 from Cloudflare", () => {
      const req = {
        get: (h: string) => (h === "cf-connecting-ip" ? "2001:db8::1" : undefined),
        ip: "10.0.0.1",
      };
      expect(clientIp(req as never)).toBe("2001:db8::1");
    });
  });

  describe("duplicate submits", () => {
    it("replays the same order for the same idempotency key without touching the database", async () => {
      const stored = {
        orderNumber: "PG12345678",
        leadEventId: "lead_PG12345678",
        total: 2060,
        customerId: "c",
      };
      redis.get.mockResolvedValue(JSON.stringify(stored));
      const res = await postOrder(body());
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(stored);
      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("stores the result under the idempotency key and releases the lock", async () => {
      happyPath();
      const input = body();
      await postOrder(input);
      const setCalls = redis.set.mock.calls.map((c) => String(c[0]));
      expect(setCalls.some((k) => k === `order:idem:store_1:${input.idempotencyKey}`)).toBe(true);
      expect(redis.del).toHaveBeenCalledWith("order:lock:c1");
    });

    it("rejects a concurrent submit while the first is in flight", async () => {
      happyPath();
      redis.set.mockResolvedValue(null); // NX failed: lock already held
      const res = await postOrder(body());
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("ORDER_IN_PROGRESS");
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("refuses a second order from a cart that was already converted", async () => {
      happyPath();
      prisma.cart.updateMany.mockResolvedValue({ count: 0 });
      const res = await postOrder(body());
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("ORDER_ALREADY_PLACED");
    });

    it("still protects against double orders when Redis is down (the cart claim is the guard)", async () => {
      happyPath();
      redis.get.mockRejectedValue(new Error("redis down"));
      redis.set.mockRejectedValue(new Error("redis down"));
      redis.del.mockRejectedValue(new Error("redis down"));
      const res = await postOrder(body());
      expect(res.status).toBe(201);
      expect(prisma.cart.updateMany).toHaveBeenCalled();
    });
  });

  it("retries with a new number on an order-number collision", async () => {
    happyPath();
    const collision = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
    });
    prisma.$transaction
      .mockImplementationOnce(async () => {
        throw collision;
      })
      .mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    const res = await postOrder(body());
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  describe("cart problems", () => {
    it("400s without a cart cookie or with an empty cart", async () => {
      let res = await postOrder(body(), null);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CART_EMPTY");

      prisma.cart.findFirst.mockResolvedValue(null);
      res = await postOrder(body());
      expect(res.body.code).toBe("CART_EMPTY");
    });

    it("409s when an item became unavailable after it was added", async () => {
      happyPath([cartRow()]);
      prisma.cartItem.count.mockResolvedValue(2); // one line no longer sellable
      const res = await postOrder(body());
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("ITEM_UNAVAILABLE");
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it.each([
      ["a bad phone", { phone: "12345" }],
      ["a short name", { name: "A" }],
      ["a short address", { address: "Dhaka" }],
      ["an unknown district", { district: "Atlantis" }],
      ["a non-COD payment", { paymentMethod: "BKASH" }],
      ["no idempotency key", { idempotencyKey: undefined }],
    ])("rejects %s", async (_l, patch) => {
      const res = await postOrder(body(patch));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
    });

    it("normalizes the phone before storing it", async () => {
      happyPath();
      await postOrder(body({ phone: "+880 1712-000001" }));
      expect(created().phone).toBe("01712000001");
    });
  });

  it("rate-limits per phone (3 per 10 minutes) on the normalized number, whatever the IP", async () => {
    const statuses: number[] = [];
    for (const variant of ["01799990001", "+8801799990001", "017 9999 0001", "01799990001"]) {
      statuses.push((await postOrder(body({ phone: variant }), null)).status); // fresh IP each time
    }
    expect(statuses).toEqual([400, 400, 400, 429]); // CART_EMPTY x3, then RATE_LIMITED
    expect((await postOrder(body({ phone: "01799990002" }), null)).status).toBe(400); // other phones unaffected
  });

  it("rate-limits per IP (20 per 10 minutes) across different phones", async () => {
    const ip = "10.9.9.9";
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const res = await request(app).post("/api/v1/orders").set("X-Forwarded-For", ip).send(body());
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});

describe("generateOrderNumber", () => {
  it("is PG + 8 digits", () => {
    for (let i = 0; i < 50; i++) expect(generateOrderNumber()).toMatch(/^PG\d{8}$/);
  });
});

describe("POST /api/v1/checkout/quote", () => {
  beforeEach(() => {
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([cartRow()]);
  });

  it("prices the cart server-side for the district's zone", async () => {
    const dhaka = await request(app)
      .post("/api/v1/checkout/quote")
      .set("Cookie", cookie)
      .send({ district: "Dhaka" });
    expect(dhaka.body.data).toMatchObject({
      zone: "INSIDE_DHAKA",
      pricing: { subtotal: 2000, shippingFee: 60, total: 2060 },
    });
    const sylhet = await request(app)
      .post("/api/v1/checkout/quote")
      .set("Cookie", cookie)
      .send({ district: "Sylhet" });
    expect(sylhet.body.data).toMatchObject({
      zone: "OUTSIDE_DHAKA",
      pricing: { shippingFee: 110, total: 2110 },
    });
  });

  it("leaves shipping open until a district is chosen", async () => {
    const res = await request(app).post("/api/v1/checkout/quote").set("Cookie", cookie).send({});
    expect(res.body.data).toMatchObject({
      zone: null,
      pricing: { shippingFee: null, total: 2000 },
    });
  });

  it("rejects unknown districts and returns an empty quote without a cart", async () => {
    expect(
      (await request(app).post("/api/v1/checkout/quote").send({ district: "Atlantis" })).status,
    ).toBe(400);
    prisma.cart.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/checkout/quote").send({ district: "Dhaka" });
    expect(res.body.data).toMatchObject({ id: null, items: [], pricing: { total: 0 } });
  });
});

describe("POST /api/v1/incomplete-orders", () => {
  const withCart = () => {
    prisma.cart.findFirst.mockResolvedValue({ id: "c1" });
    prisma.cartItem.findMany.mockResolvedValue([cartRow()]);
  };

  it("creates one OPEN record per cart session with a cart snapshot", async () => {
    withCart();
    prisma.incompleteOrder.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/incomplete-orders")
      .set("Cookie", cookie)
      .set("CF-Connecting-IP", "103.1.2.3")
      .send({
        name: "Rahim",
        phone: "+8801712111111",
        district: "Dhaka",
        tracking: { fbp: "fb.1.1.1" },
      });
    expect(res.body.data).toEqual({ saved: true });
    const data = prisma.incompleteOrder.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      storeId: "store_1",
      sessionId: "B".repeat(32),
      phone: "01712111111",
      name: "Rahim",
      district: "Dhaka",
      subtotal: 2000,
      fbp: "fb.1.1.1",
      clientIp: "103.1.2.3",
    });
    expect(data.cartSnapshot[0]).toMatchObject({ sku: "BULB-WW", quantity: 2, lineTotal: 2000 });
  });

  it("updates the existing record instead of creating another", async () => {
    withCart();
    prisma.incompleteOrder.findFirst.mockResolvedValue({ id: "inc1" });
    await request(app)
      .post("/api/v1/incomplete-orders")
      .set("Cookie", cookie)
      .send({ phone: "01712111111", address: "House 1" });
    expect(prisma.incompleteOrder.create).not.toHaveBeenCalled();
    expect(prisma.incompleteOrder.update.mock.calls[0]![0]).toMatchObject({
      where: { id: "inc1" },
      data: { address: "House 1" },
    });
  });

  it("saves nothing without a cart, and rejects an invalid phone", async () => {
    prisma.cart.findFirst.mockResolvedValue(null);
    const none = await request(app)
      .post("/api/v1/incomplete-orders")
      .set("Cookie", cookie)
      .send({ phone: "01712111111" });
    expect(none.body.data).toEqual({ saved: false });
    const bad = await request(app)
      .post("/api/v1/incomplete-orders")
      .set("Cookie", cookie)
      .send({ phone: "123" });
    expect(bad.status).toBe(400);
    expect(prisma.incompleteOrder.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/orders/:orderNumber", () => {
  it("returns the summary with a masked phone and without the address", async () => {
    prisma.order.findUnique.mockResolvedValue({
      orderNumber: "PG12345678",
      status: "PENDING",
      createdAt: new Date("2026-10-16T10:00:00Z"),
      subtotal: 2000,
      discount: 100,
      shippingFee: 60,
      total: 1960,
      paymentMethod: "COD",
      district: "Dhaka",
      phone: "01712345678",
      name: "Rahim",
      address: "secret street",
      items: [
        { productName: "Bulb", variantName: null, quantity: 2, unitPrice: 950, lineTotal: 1900 },
      ],
    });
    const res = await request(app).get("/api/v1/orders/PG12345678");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      orderNumber: "PG12345678",
      maskedPhone: "017******78",
      total: 1960,
      district: "Dhaka",
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("01712345678");
    expect(text).not.toContain("secret street");
    expect(text).not.toContain("Rahim");
  });

  it("404s for an unknown order and 400s for a malformed number", async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    expect((await request(app).get("/api/v1/orders/PG00000000")).status).toBe(404);
    expect((await request(app).get("/api/v1/orders/hello")).status).toBe(400);
  });
});
