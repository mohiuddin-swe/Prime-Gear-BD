import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/app-error";
import { sendError } from "../lib/response";

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found");
};

// Express identifies error handlers by their 4-argument signature, so `next` must stay
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message);
  }
  // body-parser / http-errors style errors (malformed JSON, payload too large)
  const status = typeof err?.status === "number" && err.status >= 400 && err.status < 500;
  if (status) {
    return sendError(res, err.status, "BAD_REQUEST", "Invalid request");
  }
  req.log.error({ err }, "unhandled error");
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong");
};
