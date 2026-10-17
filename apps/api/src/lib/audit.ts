import type { Prisma } from "@primegear/db";
import type { AdminRole } from "@primegear/shared";
import type { Request } from "express";
import { clientIp } from "./client-ip";

/** Who is making an admin write: every admin service takes this and records it in AuditLog. */
export type Actor = { storeId: string; adminUserId: string; ip?: string; role?: AdminRole };

export const actorFrom = (req: Request): Actor => ({
  storeId: req.storeId,
  adminUserId: req.admin!.id, // routes behind requireAdmin()
  ip: clientIp(req),
  role: req.admin!.role,
});

type Tx = Pick<Prisma.TransactionClient, "auditLog">;

// JSON-safe copy: Dates become ISO strings, undefined fields disappear
const snapshot = (v: unknown) =>
  v === undefined || v === null ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

/** Writes one AuditLog row. Call inside the same transaction as the change it describes. */
export function audit(
  tx: Tx,
  actor: Actor,
  entry: { action: string; entity: string; entityId?: string; before?: unknown; after?: unknown },
) {
  return tx.auditLog.create({
    data: {
      storeId: actor.storeId,
      adminUserId: actor.adminUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: snapshot(entry.before),
      after: snapshot(entry.after),
      ip: actor.ip,
    },
  });
}
