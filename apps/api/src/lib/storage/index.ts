import { randomBytes } from "node:crypto";
import path from "node:path";
import type { UploadContentType } from "@primegear/shared";
import { env } from "../../config/env";
import { createLocalStorage, type LocalStorage } from "./local";
import { createR2Storage } from "./r2";
import type { StorageProvider } from "./types";

export type { StorageProvider, StoredObject, UploadTarget } from "./types";

let storage: StorageProvider | undefined;

/** The configured driver (STORAGE_DRIVER), created once. */
export function getStorage(): StorageProvider {
  if (storage) return storage;
  if (env.STORAGE_DRIVER === "r2") {
    // env.ts guarantees these are set when the driver is r2
    storage = createR2Storage({
      accountId: env.R2_ACCOUNT_ID!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucket: env.R2_BUCKET!,
      publicUrl: env.R2_PUBLIC_URL!,
    });
  } else {
    storage = createLocalStorage({
      root: path.resolve(env.LOCAL_UPLOAD_DIR),
      publicUrl: env.LOCAL_PUBLIC_URL,
      uploadUrl: env.LOCAL_UPLOAD_URL,
      secret: env.JWT_SECRET,
    });
  }
  return storage;
}

/** The local driver, or null when another driver is configured (the PUT endpoint and /uploads only exist for local). */
export function getLocalStorage(): LocalStorage | null {
  const s = getStorage();
  return s.driver === "local" ? (s as LocalStorage) : null;
}

/** Tests swap the driver */
export function setStorage(s: StorageProvider | undefined) {
  storage = s;
}

const EXTENSIONS: Record<UploadContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** stores/<storeId>/<folder>/<yyyy>/<mm>/<random>.<ext>: unguessable, never reused, scoped to the store */
export function newObjectKey(storeId: string, folder: string, contentType: UploadContentType, now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `stores/${storeId}/${folder}/${yyyy}/${mm}/${randomBytes(12).toString("hex")}.${EXTENSIONS[contentType]}`;
}

/** Only keys under the store's own prefix may be attached to its records or deleted for it */
export const belongsToStore = (key: string, storeId: string) => key.startsWith(`stores/${storeId}/`);
