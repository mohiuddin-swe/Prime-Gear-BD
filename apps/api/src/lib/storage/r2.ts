import type { StorageProvider, StoredObject } from "./types";
import { presignUrl } from "./sigv4";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

const UPLOAD_TTL_SECONDS = 10 * 60;
const OP_TTL_SECONDS = 60;

/**
 * Cloudflare R2 through its S3-compatible API (path-style, region "auto"). The bucket needs a CORS
 * rule allowing PUT with Content-Type from the site origin; see .env.example.
 * R2 presigned PUTs can't cap the size, so the API checks it with head() before attaching the image.
 */
export function createR2Storage(config: R2Config): StorageProvider {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const publicBase = config.publicUrl.replace(/\/+$/, "");

  const sign = (
    method: "GET" | "HEAD" | "PUT" | "DELETE",
    key: string,
    expiresInSeconds: number,
    headers?: Record<string, string>,
  ) =>
    presignUrl({
      method,
      host,
      path: `/${config.bucket}/${key}`,
      region: "auto",
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      expiresInSeconds,
      headers,
    });

  return {
    driver: "r2",

    async createUpload({ key, contentType }) {
      return {
        url: sign("PUT", key, UPLOAD_TTL_SECONDS, { "content-type": contentType }),
        method: "PUT",
        headers: { "content-type": contentType },
        expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000),
      };
    },

    async head(key): Promise<StoredObject | null> {
      const res = await fetch(sign("HEAD", key, OP_TTL_SECONDS), {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 HEAD ${key} failed (${res.status})`);
      return {
        size: Number(res.headers.get("content-length") ?? 0),
        contentType: res.headers.get("content-type"),
      };
    },

    async delete(key) {
      const res = await fetch(sign("DELETE", key, OP_TTL_SECONDS), {
        method: "DELETE",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${key} failed (${res.status})`);
    },

    publicUrl: (key) => `${publicBase}/${key}`,

    keyFromUrl: (url) => (url.startsWith(`${publicBase}/`) ? url.slice(publicBase.length + 1) : null),
  };
}
