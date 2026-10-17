import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UploadContentType } from "@primegear/shared";
import { isSafeKey, type StorageProvider, type StoredObject } from "./types";

type LocalConfig = {
  /** Absolute folder the files are written to */
  root: string;
  /** Base URL the files are served from (/uploads) */
  publicUrl: string;
  /** Base URL of the signed PUT endpoint (/api/v1/uploads/local) */
  uploadUrl: string;
  /** HMAC secret for upload signatures */
  secret: string;
};

const UPLOAD_TTL_SECONDS = 10 * 60;

const EXTENSION_TYPES: Record<string, UploadContentType> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export type LocalUploadGrant = { key: string; contentType: string; maxSize: number; expires: number };

/**
 * Development driver: behaves like a presigned bucket. createUpload returns a URL to the API's own
 * PUT endpoint carrying an HMAC of (key, type, max size, expiry); that endpoint (local-upload.routes)
 * checks it with verifyUpload and writes the file. Files are served by express.static at /uploads.
 */
export function createLocalStorage(config: LocalConfig) {
  const publicBase = config.publicUrl.replace(/\/+$/, "");
  const uploadBase = config.uploadUrl.replace(/\/+$/, "");

  const signature = (g: LocalUploadGrant) =>
    createHmac("sha256", config.secret)
      .update(`local-upload\n${g.key}\n${g.contentType}\n${g.maxSize}\n${g.expires}`)
      .digest("hex");

  const fileFor = (key: string) => {
    if (!isSafeKey(key)) throw new Error(`Unsafe storage key: ${key}`);
    return path.join(config.root, ...key.split("/"));
  };

  const storage: StorageProvider & {
    root: string;
    verifyUpload(g: LocalUploadGrant, sig: string): boolean;
    write(key: string, data: Buffer): Promise<void>;
  } = {
    driver: "local",
    root: config.root,

    async createUpload({ key, contentType, size }) {
      const expires = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
      const grant = { key, contentType, maxSize: size, expires };
      const query = new URLSearchParams({
        type: contentType,
        max: String(size),
        expires: String(expires),
        sig: signature(grant),
      });
      return {
        url: `${uploadBase}/${key}?${query}`,
        method: "PUT",
        headers: { "content-type": contentType },
        expiresAt: new Date(expires * 1000),
      };
    },

    verifyUpload(g, sig) {
      if (!isSafeKey(g.key) || g.expires < Date.now() / 1000) return false;
      const expected = Buffer.from(signature(g), "hex");
      const given = Buffer.from(sig, "hex");
      return given.length === expected.length && timingSafeEqual(given, expected);
    },

    /** Writes via a temp file so a half-written upload is never served */
    async write(key, data) {
      const file = fileFor(key);
      await mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, data);
      await rename(tmp, file);
    },

    async head(key): Promise<StoredObject | null> {
      try {
        const s = await stat(fileFor(key));
        return { size: s.size, contentType: EXTENSION_TYPES[path.extname(key)] ?? null };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },

    async delete(key) {
      await rm(fileFor(key), { force: true });
    },

    publicUrl: (key) => `${publicBase}/${key}`,

    keyFromUrl: (url) => (url.startsWith(`${publicBase}/`) ? url.slice(publicBase.length + 1) : null),
  };
  return storage;
}

export type LocalStorage = ReturnType<typeof createLocalStorage>;
