import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { adminRoleSchema } from "@primegear/shared";
import { env, isProd } from "../config/env";

export const ADMIN_COOKIE = "pg_admin";

const claimsSchema = z.object({ sub: z.string(), storeId: z.string(), role: adminRoleSchema });
export type AdminClaims = z.infer<typeof claimsSchema>;

export function signAdminToken(claims: AdminClaims) {
  return jwt.sign(claims, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
}

export function verifyAdminToken(token: string): AdminClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    const parsed = claimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const adminCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

export const adminCookieMaxAgeMs = env.JWT_EXPIRES_IN_SECONDS * 1000;
