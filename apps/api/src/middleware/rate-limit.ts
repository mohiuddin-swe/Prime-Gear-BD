import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { isTest } from "../config/env";
import { getRedis } from "../lib/redis";

type Options = {
  name: string;
  windowMs: number;
  limit: number;
  /** Extra key part, e.g. the phone or email from the body, to limit per identity as well as per IP */
  identity?: (req: Request) => string | undefined;
};

/** Redis-backed limiter (shared across API instances). In tests it falls back to the in-memory store. */
export function createRateLimiter({ name, windowMs, limit, identity }: Options) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? "unknown");
      const id = identity?.(req);
      return id ? `${ip}:${id}` : ip;
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later",
      });
    },
    ...(isTest
      ? {}
      : {
          store: new RedisStore({
            prefix: `rl:${name}:`,
            sendCommand: (...args: string[]) => getRedis().call(args[0]!, ...args.slice(1)) as never,
          }),
        }),
  });
}

/** Coarse per-IP limiter for the whole API. */
export const globalLimiter = () =>
  createRateLimiter({ name: "global", windowMs: 60_000, limit: 300 });
