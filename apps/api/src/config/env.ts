import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MEILI_URL: z.string().default("http://localhost:7700"),
  MEILI_MASTER_KEY: z.string().optional(),
  CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().default(300),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .default(60 * 60 * 24 * 7),
  DEFAULT_STORE_SLUG: z.string().default("primegearbd"),
  LOG_LEVEL: z.string().default("info"),

  // Image storage. `local` writes to disk and serves /uploads (development only); `r2` is Cloudflare R2.
  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  /** local: folder for uploaded files, relative to the API's working directory */
  LOCAL_UPLOAD_DIR: z.string().default("./uploads"),
  /** local: base URL files are served from. Relative = through the web app's /uploads proxy */
  LOCAL_PUBLIC_URL: z.string().default("/uploads"),
  /** local: base of the signed upload URL the browser PUTs to (same-origin /api/v1 proxy by default) */
  LOCAL_UPLOAD_URL: z.string().default("/api/v1/uploads/local"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Public bucket domain, e.g. https://media.primegearbd.com (add the host to the web's IMAGE_HOSTS) */
  // Empty (as copied from .env.example) counts as unset
  R2_PUBLIC_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
});

export type Env = z.infer<typeof envSchema>;

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

export const env: Env = envSchema
  .superRefine((e, ctx) => {
    if (e.STORAGE_DRIVER === "r2") {
      for (const key of R2_KEYS) {
        if (!e[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required when STORAGE_DRIVER=r2" });
      }
    }
    // Local files vanish on redeploy and aren't shared between instances
    if (e.STORAGE_DRIVER === "local" && e.NODE_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message: "Use STORAGE_DRIVER=r2 in production",
      });
    }
  })
  .parse(process.env);
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
