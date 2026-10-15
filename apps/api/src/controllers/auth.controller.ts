import type { Request, Response } from "express";
import type { AdminLoginInput } from "@primegear/shared";
import { sendOk } from "../lib/response";
import { loginAdmin } from "../services/auth.service";
import { ADMIN_COOKIE, adminCookieMaxAgeMs, adminCookieOptions } from "../services/token.service";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as AdminLoginInput;
  const { token, admin } = await loginAdmin(req.storeId, email, password);
  res.cookie(ADMIN_COOKIE, token, { ...adminCookieOptions, maxAge: adminCookieMaxAgeMs });
  sendOk(res, admin);
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(ADMIN_COOKIE, adminCookieOptions);
  sendOk(res, { loggedOut: true });
}

export function me(req: Request, res: Response) {
  sendOk(res, req.admin);
}
