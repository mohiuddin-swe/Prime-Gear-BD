import { Router } from "express";
import { adminLoginSchema } from "@primegear/shared";
import { login, logout, me } from "../../controllers/auth.controller";
import { requireAdmin } from "../../middleware/require-admin";
import { createRateLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";

export const adminAuthRouter = Router();

// 10 attempts / 15 min per IP + email
const loginLimiter = createRateLimiter({
  name: "admin-login",
  windowMs: 15 * 60_000,
  limit: 10,
  identity: (req) => (typeof req.body?.email === "string" ? req.body.email.toLowerCase() : undefined),
});

adminAuthRouter.post("/login", loginLimiter, validate(adminLoginSchema), login);
adminAuthRouter.post("/logout", logout);
adminAuthRouter.get("/me", requireAdmin(), me);
