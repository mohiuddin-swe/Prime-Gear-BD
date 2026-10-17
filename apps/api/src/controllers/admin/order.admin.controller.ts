import type { Request, Response } from "express";
import type {
  AdminOrderListQuery,
  BulkOrderStatusInput,
  ConvertIncompleteInput,
  OrderAddressInput,
  OrderFilter,
  OrderItemsInput,
  OrderStatus,
} from "@primegear/shared";
import { actorFrom } from "../../lib/audit";
import { sendOk } from "../../lib/response";
import {
  convertIncompleteOrder,
  listIncompleteOrders,
  setIncompleteStatus,
} from "../../services/admin/incomplete.admin.service";
import {
  addOrderNote,
  countAdminOrders,
  getAdminOrder,
  getShippingFees,
  listAdminOrders,
  recordNoAnswer,
  searchOrderVariants,
  updateOrderAddress,
  updateOrderItems,
} from "../../services/admin/order.admin.service";
import { bulkChangeOrderStatus, changeOrderStatus } from "../../services/admin/order-status.service";

const param = (req: Request, name: string) => req.params[name] as string;

// ───────────── Orders ─────────────

export async function listOrdersHandler(req: Request, res: Response) {
  const q = req.query as unknown as AdminOrderListQuery;
  const { items, total } = await listAdminOrders(req.storeId, q);
  sendOk(res, items, { page: q.page, limit: q.limit, total });
}

export async function orderCountsHandler(req: Request, res: Response) {
  sendOk(res, await countAdminOrders(req.storeId, req.query as unknown as OrderFilter));
}

export async function shippingFeesHandler(req: Request, res: Response) {
  sendOk(res, await getShippingFees(req.storeId));
}

export async function searchVariantsHandler(req: Request, res: Response) {
  const { q } = req.query as { q: string };
  sendOk(res, await searchOrderVariants(req.storeId, q));
}

export async function getOrderHandler(req: Request, res: Response) {
  sendOk(res, await getAdminOrder(req.storeId, param(req, "id")));
}

export async function changeStatusHandler(req: Request, res: Response) {
  const { status, note } = req.body as { status: OrderStatus; note?: string };
  sendOk(res, await changeOrderStatus(actorFrom(req), param(req, "id"), status, note));
}

export async function bulkStatusHandler(req: Request, res: Response) {
  const { ids, status, note } = req.body as BulkOrderStatusInput;
  sendOk(res, await bulkChangeOrderStatus(actorFrom(req), ids, status, note));
}

export async function updateAddressHandler(req: Request, res: Response) {
  const body = req.body as OrderAddressInput & { phone: string };
  sendOk(res, await updateOrderAddress(actorFrom(req), param(req, "id"), body));
}

export async function updateItemsHandler(req: Request, res: Response) {
  const body = req.body as OrderItemsInput & { discount: number };
  sendOk(res, await updateOrderItems(actorFrom(req), param(req, "id"), body));
}

export async function addNoteHandler(req: Request, res: Response) {
  const { body } = req.body as { body: string };
  sendOk(res, await addOrderNote(actorFrom(req), param(req, "id"), body), undefined, 201);
}

export async function noAnswerHandler(req: Request, res: Response) {
  sendOk(res, await recordNoAnswer(actorFrom(req), param(req, "id")));
}

// ───────────── Incomplete checkouts ─────────────

export async function listIncompleteHandler(req: Request, res: Response) {
  const q = req.query as unknown as OrderFilter & { page: number; limit: number };
  const { items, total } = await listIncompleteOrders(req.storeId, q);
  sendOk(res, items, { page: q.page, limit: q.limit, total });
}

export async function incompleteStatusHandler(req: Request, res: Response) {
  const { status } = req.body as { status: "OPEN" | "CONTACTED" | "DISCARDED" };
  sendOk(res, await setIncompleteStatus(actorFrom(req), param(req, "id"), status));
}

export async function convertIncompleteHandler(req: Request, res: Response) {
  const body = req.body as ConvertIncompleteInput & { phone: string; discount: number };
  sendOk(res, await convertIncompleteOrder(actorFrom(req), param(req, "id"), body), undefined, 201);
}
