import { Router } from "express";
import {
  ORDER_ADMIN_ROLES,
  ORDER_EDIT_ROLES,
  adminOrderListQuerySchema,
  bulkOrderStatusSchema,
  convertIncompleteSchema,
  idParamsSchema,
  incompleteListQuerySchema,
  incompleteStatusSchema,
  orderAddressSchema,
  orderFilterSchema,
  orderItemsInputSchema,
  orderNoteInputSchema,
  orderStatusChangeSchema,
  variantSearchQuerySchema,
} from "@primegear/shared";
import * as c from "../../controllers/admin/order.admin.controller";
import { requireAdmin } from "../../middleware/require-admin";
import { validate } from "../../middleware/validate";

/**
 * /api/v1/admin orders and incomplete checkouts. Every admin role can read orders and change status
 * (the status service checks which moves each role may make); editing is for the call-center roles.
 */
export const adminOrderRouter = Router();

const anyRole = requireAdmin(...ORDER_ADMIN_ROLES);
const editor = requireAdmin(...ORDER_EDIT_ROLES);
const byId = { params: idParamsSchema };

adminOrderRouter.get("/orders", anyRole, validate({ query: adminOrderListQuerySchema }), c.listOrdersHandler);
adminOrderRouter.get("/orders/counts", anyRole, validate({ query: orderFilterSchema }), c.orderCountsHandler);
adminOrderRouter.get("/orders/shipping-fees", editor, c.shippingFeesHandler);
adminOrderRouter.get(
  "/orders/variant-options",
  editor,
  validate({ query: variantSearchQuerySchema }),
  c.searchVariantsHandler,
);
adminOrderRouter.post(
  "/orders/bulk-status",
  anyRole,
  validate({ body: bulkOrderStatusSchema }),
  c.bulkStatusHandler,
);
adminOrderRouter.get("/orders/:id", anyRole, validate(byId), c.getOrderHandler);
adminOrderRouter.post(
  "/orders/:id/status",
  anyRole,
  validate({ ...byId, body: orderStatusChangeSchema }),
  c.changeStatusHandler,
);
adminOrderRouter.put(
  "/orders/:id/address",
  editor,
  validate({ ...byId, body: orderAddressSchema }),
  c.updateAddressHandler,
);
adminOrderRouter.put(
  "/orders/:id/items",
  editor,
  validate({ ...byId, body: orderItemsInputSchema }),
  c.updateItemsHandler,
);
adminOrderRouter.post(
  "/orders/:id/notes",
  editor,
  validate({ ...byId, body: orderNoteInputSchema }),
  c.addNoteHandler,
);
adminOrderRouter.post("/orders/:id/no-answer", editor, validate(byId), c.noAnswerHandler);

adminOrderRouter.get(
  "/incomplete-orders",
  editor,
  validate({ query: incompleteListQuerySchema }),
  c.listIncompleteHandler,
);
adminOrderRouter.patch(
  "/incomplete-orders/:id",
  editor,
  validate({ ...byId, body: incompleteStatusSchema }),
  c.incompleteStatusHandler,
);
adminOrderRouter.post(
  "/incomplete-orders/:id/convert",
  editor,
  validate({ ...byId, body: convertIncompleteSchema }),
  c.convertIncompleteHandler,
);
