import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  store: { findUnique: vi.fn() },
  adminUser: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));

import { createApp } from "./app";

const user = {
  id: "admin_1",
  email: "owner@primegearbd.com",
  name: "Owner",
  role: "OWNER" as const,
  isActive: true,
  passwordHash: bcrypt.hashSync("correct-password", 4),
};

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
  prisma.store.findUnique.mockResolvedValue({ id: "store_1" });
  prisma.adminUser.findUnique.mockResolvedValue(user);
  prisma.adminUser.findFirst.mockResolvedValue(user);
  prisma.adminUser.update.mockResolvedValue(user);
});

describe("POST /api/v1/admin/auth/login", () => {
  it("logs in and sets an httpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/v1/admin/auth/login")
      .send({ email: "Owner@PrimeGearBD.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { id: "admin_1", email: user.email, name: "Owner", role: "OWNER" },
    });
    expect(res.body.data.passwordHash).toBeUndefined();
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toContain("pg_admin=");
    expect(cookie).toContain("HttpOnly");
    expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
      where: { storeId_email: { storeId: "store_1", email: "owner@primegearbd.com" } },
    });
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/v1/admin/auth/login")
      .send({ email: user.email, password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects an unknown email the same way", async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/admin/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 400 for an invalid body", async () => {
    const res = await request(app).post("/api/v1/admin/auth/login").send({ email: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/admin/auth/me (protected)", () => {
  it("returns 401 without a cookie", async () => {
    const res = await request(app).get("/api/v1/admin/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("returns the admin with a valid session cookie", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/v1/admin/auth/login")
      .send({ email: user.email, password: "correct-password" })
      .expect(200);

    const res = await agent.get("/api/v1/admin/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: "admin_1", role: "OWNER" });
  });

  it("returns 401 once the account is deactivated", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/v1/admin/auth/login")
      .send({ email: user.email, password: "correct-password" });
    prisma.adminUser.findFirst.mockResolvedValue(null);

    expect((await agent.get("/api/v1/admin/auth/me")).status).toBe(401);
  });

  it("clears the cookie on logout", async () => {
    const res = await request(app).post("/api/v1/admin/auth/logout");
    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("pg_admin=;");
  });
});
