import express, { Router } from "express";
import { UPLOAD_MAX_BYTES } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { sendOk } from "../lib/response";
import { getLocalStorage } from "../lib/storage";

/**
 * The local driver's stand-in for a presigned bucket URL: PUT /api/v1/uploads/local/<key>?type&max&expires&sig.
 * Authorised by the signature alone (like R2), so it sits outside the admin cookie check.
 * Only mounted when STORAGE_DRIVER=local.
 */
export const localUploadRouter = Router();

localUploadRouter.put(
  "/uploads/local/*key",
  express.raw({ type: () => true, limit: UPLOAD_MAX_BYTES }),
  async (req, res, next) => {
    try {
      const storage = getLocalStorage();
      if (!storage) throw AppError.notFound();

      const segments = req.params.key as unknown as string[];
      const key = segments.join("/").replace(/\/$/, "");
      const q = req.query as Record<string, string | undefined>;
      const grant = {
        key,
        contentType: q.type ?? "",
        maxSize: Number(q.max),
        expires: Number(q.expires),
      };
      if (!q.sig || !Number.isFinite(grant.maxSize) || !storage.verifyUpload(grant, q.sig)) {
        throw AppError.forbidden("Upload link is invalid or expired", "UPLOAD_LINK_INVALID");
      }
      if (req.get("content-type") !== grant.contentType) {
        throw AppError.badRequest("Content-Type does not match the upload link", "UPLOAD_TYPE_MISMATCH");
      }
      const body = req.body as unknown;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw AppError.badRequest("Empty upload", "UPLOAD_EMPTY");
      }
      if (body.length > grant.maxSize) {
        throw AppError.badRequest("File is larger than declared", "UPLOAD_TOO_LARGE");
      }
      await storage.write(key, body);
      sendOk(res, { key, size: body.length });
    } catch (err) {
      next(err);
    }
  },
);
