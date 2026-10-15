import type { Response } from "express";
import type { ApiMeta } from "@primegear/shared";

export function sendOk<T>(res: Response, data: T, meta?: ApiMeta, status = 200) {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, code, message });
}
