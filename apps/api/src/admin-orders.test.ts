import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  order: { findFirst: vi.fn(), updateMany: vi.fn() },
  orderItem: { deleteMany: vi.fn(), createMany: vi.fn() },
  productVariant: { updateMany: vi.fn(), findMany: vi.fn() },
  orderStatusLog: { create: vi.fn() },
  payment: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const prisma = vi.hoisted(() => ({
  store: { findUnique: vi.fn() },
  adminUser: { findFirst: vi.fn() },
  order: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("./queues", () => ({ enqueueProductSync: vi.fn(), enqueueStorageDelete: vi.fn() }));

import { createApp } from "./app";
import { orderEvents, type OrderConfirmedEvent } from "./events/order-events";
import { signAdminToken } from "./services/token.service";

type Role = "OWNER" | "MANAGER" | "CALL_AGENT" | "PACKER";
const app = createApp();
const cookie = (role: Role) =>
  `pg_admin=${signAdminToken({ sub: "admin_1", storeId: "store_1", role })}`;
const asRole = (role: Role) =>
  prisma.adminUser.findFirst.mockResolvedValue({ id: "admin_1", email: "a@b.c", name: "Agent", role });

const DAY = 24 * 60 * 60 * 1000;
const order = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  orderNumber: "PG12345678",
  status: "PENDING",
  total: 1250,
  createdAt: new Date(Date.now() - DAY),
  items: [
    { variantId: "v1", quantity: 2, productName: "LED Strip" },
    { variantId: null, quantity: 1, productName: "Deleted thing" },
  ],
  ...over,
});

const confirmed: OrderConfirmedEvent[] = [];
let unsubscribe: () => void;

beforeEach(() => {
  vi.resetAllMocks();
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  tx.order.updateMany.mockResolvedValue({ count: 1 });
  tx.productVariant.updateMany.mockResolvedValue({ count: 1 });
  confirmed.length = 0;
  unsubscribe = orderEvents.on("order.confirmed", (e) => void confirmed.push(e));
});
afterEach(() => unsubscribe());

const setStatus = (role: Role, status: string, id = "o1") =>
  request(app)
    .post(`/api/v1/admin/orders/${id}/status`)
    .set("cookie", cookie(role))
    .set("cf-connecting-ip", "203.0.113.9")
    .send({ status });

describe("order status service", () => {
  it("requires a session", async () => {
    const res = await request(app).post("/api/v1/admin/orders/o1/status").send({ status: "CONFIRMED" });
    expect(res.status).toBe(401);
  });

  it("confirms a pending order: guarded update, status log, audit, one order.confirmed event", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue(order());
    const res = await setStatus("CALL_AGENT", "CONFIRMED");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: "o1",
      orderNumber: "PG12345678",
      from: "PENDING",
      status: "CONFIRMED",
      lateConfirmation: false,
    });
    const update = tx.order.updateMany.mock.calls[0]![0];
    expect(update.where).toEqual({ id: "o1", storeId: "store_1", status: "PENDING" });
    expect(update.data).toMatchObject({ status: "CONFIRMED", confirmedAt: expect.any(Date) });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: "store_1",
        orderId: "o1",
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        adminUserId: "admin_1",
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "order.status",
        entity: "Order",
        entityId: "o1",
        before: { status: "PENDING" },
        after: { status: "CONFIRMED" },
        ip: "203.0.113.9",
      }),
    });
    expect(confirmed).toEqual([
      expect.objectContaining({
        storeId: "store_1",
        orderId: "o1",
        orderNumber: "PG12345678",
        total: 1250,
        adminUserId: "admin_1",
        lateConfirmation: false,
      }),
    ]);
  });

  it("flags a confirmation more than 7 days after the order was placed", async () => {
    asRole("OWNER");
    tx.order.findFirst.mockResolvedValue(order({ createdAt: new Date(Date.now() - 8 * DAY) }));
    const res = await setStatus("OWNER", "CONFIRMED");
    expect(res.body.data.lateConfirmation).toBe(true);
    expect(confirmed[0]!.lateConfirmation).toBe(true);
  });

  it("rejects a move that is not in the transition map, with no log or event", async () => {
    asRole("OWNER");
    tx.order.findFirst.mockResolvedValue(order());
    const res = await setStatus("OWNER", "SHIPPED");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_TRANSITION");
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
    expect(confirmed).toHaveLength(0);
  });

  it("rejects a move the role may not make", async () => {
    asRole("PACKER");
    tx.order.findFirst.mockResolvedValue(order());
    const res = await setStatus("PACKER", "CONFIRMED");
    expect(res.status).toBe(403);
    expect(confirmed).toHaveLength(0);
  });

  it("reports a conflict when another agent changed the order first", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue(order());
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    const res = await setStatus("CALL_AGENT", "CONFIRMED");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ORDER_STATUS_CHANGED");
    expect(confirmed).toHaveLength(0);
  });

  it("refuses to confirm an order twice", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue(order({ status: "CONFIRMED" }));
    const res = await setStatus("CALL_AGENT", "CONFIRMED");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("STATUS_UNCHANGED");
    expect(confirmed).toHaveLength(0);
  });

  it("puts stock back when a pending order is cancelled, and emits nothing", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue(order());
    const res = await setStatus("CALL_AGENT", "CANCELLED");
    expect(res.status).toBe(200);
    // Lines whose variant was deleted are skipped
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: "v1", storeId: "store_1" },
      data: { stock: { increment: 2 } },
    });
    expect(confirmed).toHaveLength(0);
  });

  it("does not emit order.confirmed for later moves", async () => {
    asRole("PACKER");
    tx.order.findFirst.mockResolvedValue(order({ status: "CONFIRMED" }));
    const res = await setStatus("PACKER", "PACKED");
    expect(res.status).toBe(200);
    expect(confirmed).toHaveLength(0);
  });

  it("bulk confirms each order on its own and reports failures", async () => {
    asRole("MANAGER");
    tx.order.findFirst
      .mockResolvedValueOnce(order({ id: "o1" }))
      .mockResolvedValueOnce(order({ id: "o2", orderNumber: "PG22222222", status: "DELIVERED" }));
    prisma.order.findFirst.mockResolvedValue({ orderNumber: "PG22222222" });
    const res = await request(app)
      .post("/api/v1/admin/orders/bulk-status")
      .set("cookie", cookie("MANAGER"))
      .send({ ids: ["o1", "o2", "o1"], status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.data.updated.map((u: { id: string }) => u.id)).toEqual(["o1"]);
    expect(res.body.data.failed).toEqual([
      expect.objectContaining({ id: "o2", orderNumber: "PG22222222", code: "INVALID_TRANSITION" }),
    ]);
    expect(confirmed).toHaveLength(1);
  });
});

describe("order edits", () => {
  it("only edits pending orders", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue({ ...order({ status: "CONFIRMED" }), items: [] });
    const res = await request(app)
      .put("/api/v1/admin/orders/o1/items")
      .set("cookie", cookie("CALL_AGENT"))
      .send({ items: [{ variantId: "v1", quantity: 1, unitPrice: 500 }], shippingFee: 60 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ORDER_NOT_EDITABLE");
  });

  it("is closed to packers", async () => {
    asRole("PACKER");
    const res = await request(app)
      .put("/api/v1/admin/orders/o1/items")
      .set("cookie", cookie("PACKER"))
      .send({ items: [{ variantId: "v1", quantity: 1, unitPrice: 500 }], shippingFee: 60 });
    expect(res.status).toBe(403);
  });

  it("moves stock by the difference and recomputes totals", async () => {
    asRole("CALL_AGENT");
    tx.order.findFirst.mockResolvedValue({
      ...order(),
      subtotal: 1190,
      discount: 0,
      shippingFee: 60,
      items: [
        { variantId: "v1", quantity: 2, productName: "LED Strip", variantName: null, sku: "LS-1", unitPrice: 595, lineTotal: 1190, upsellSource: null },
      ],
    });
    tx.productVariant.findMany.mockResolvedValue([
      { id: "v1", name: "Default", sku: "LS-1", isActive: true, productId: "p1", product: { name: "LED Strip", status: "ACTIVE" } },
      { id: "v2", name: "Warm", sku: "BULB-W", isActive: true, productId: "p2", product: { name: "Bulb", status: "ACTIVE" } },
    ]);
    // getAdminOrder after the save: keep it out of scope
    prisma.order.findFirst.mockResolvedValue(null);

    await request(app)
      .put("/api/v1/admin/orders/o1/items")
      .set("cookie", cookie("CALL_AGENT"))
      .send({
        items: [
          { variantId: "v1", quantity: 1, unitPrice: 595 },
          { variantId: "v2", quantity: 3, unitPrice: 200 },
        ],
        discount: 50,
        shippingFee: 60,
      });

    const stockCalls = tx.productVariant.updateMany.mock.calls.map((c) => c[0]);
    expect(stockCalls).toContainEqual({ where: { id: "v1", storeId: "store_1" }, data: { stock: { increment: 1 } } });
    expect(stockCalls).toContainEqual({
      where: { id: "v2", storeId: "store_1", stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });
    const saved = tx.order.updateMany.mock.calls[0]![0];
    expect(saved.where).toMatchObject({ status: "PENDING" });
    expect(saved.data).toEqual({ subtotal: 1195, discount: 50, shippingFee: 60, total: 1205 });
    expect(tx.payment.updateMany.mock.calls[0]![0].data).toEqual({ amount: 1205 });
    expect(tx.orderItem.createMany.mock.calls[0]![0].data[1]).toMatchObject({
      productName: "Bulb",
      variantName: "Warm",
      sku: "BULB-W",
      lineTotal: 600,
    });
    expect(tx.auditLog.create.mock.calls[0]![0].data.action).toBe("order.items");
  });
});

describe("order list", () => {
  it("searches by normalized phone and returns pagination meta and history", async () => {
    asRole("CALL_AGENT");
    prisma.order.count.mockResolvedValue(1);
    prisma.order.findMany.mockResolvedValue([
      {
        ...order(),
        name: "Rahim",
        phone: "01712345678",
        district: "Dhaka",
        thana: null,
        address: "Mirpur 10",
        source: "WEBSITE",
        noAnswerCount: 1,
        lastContactAt: null,
        confirmedAt: null,
        items: [
          { productName: "LED Strip", variantName: null, quantity: 2 },
          { productName: "Plug", variantName: "EU", quantity: 1 },
          { productName: "Bulb", variantName: null, quantity: 1 },
        ],
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      { phone: "01712345678", status: "PENDING", _count: { _all: 1 } },
      { phone: "01712345678", status: "DELIVERED", _count: { _all: 2 } },
      { phone: "01712345678", status: "RETURNED", _count: { _all: 1 } },
    ]);
    const res = await request(app)
      .get("/api/v1/admin/orders?q=%2B880%201712-345678&status=PENDING&from=2026-10-01&to=2026-10-17")
      .set("cookie", cookie("CALL_AGENT"));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    const where = prisma.order.findMany.mock.calls[0]![0].where;
    expect(where).toMatchObject({ storeId: "store_1", status: "PENDING", OR: [{ phone: "01712345678" }] });
    expect(where.createdAt.gte.toISOString()).toBe("2026-09-30T18:00:00.000Z");
    expect(res.body.data[0]).toMatchObject({
      itemCount: 4,
      itemsSummary: "LED Strip ×2, Plug (EU) +1 more",
      history: { previous: 3, delivered: 2, cancelled: 0, returned: 1 },
    });
  });
});
