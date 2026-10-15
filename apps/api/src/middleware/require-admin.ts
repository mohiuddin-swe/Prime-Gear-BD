import type { RequestHandler } from "express";
import type { AdminProfile, AdminRole } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { getPrisma } from "../lib/prisma";
import { ADMIN_COOKIE, verifyAdminToken } from "../services/token.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the only way to augment Express.Request
  namespace Express {
    interface Request {
      admin?: AdminProfile;
    }
  }
}

/** Requires a valid admin session. Pass roles to restrict; omit to allow any admin role. */
export function requireAdmin(...roles: AdminRole[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      const token = req.cookies?.[ADMIN_COOKIE];
      if (typeof token !== "string") throw AppError.unauthorized();

      const claims = verifyAdminToken(token);
      if (!claims || claims.storeId !== req.storeId) throw AppError.unauthorized();

      // Load fresh so deactivated users and role changes apply immediately
      const user = await getPrisma().adminUser.findFirst({
        where: { id: claims.sub, storeId: req.storeId, isActive: true },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) throw AppError.unauthorized();
      if (roles.length > 0 && !roles.includes(user.role)) throw AppError.forbidden();

      req.admin = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
