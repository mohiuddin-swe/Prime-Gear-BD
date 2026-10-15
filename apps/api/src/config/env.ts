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
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
