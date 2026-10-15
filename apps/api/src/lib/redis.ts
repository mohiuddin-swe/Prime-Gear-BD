import { Redis } from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

let client: Redis | undefined;

/** Shared Redis client for rate limiting and cache. BullMQ uses its own connection (queues/connection.ts). */
export function getRedis() {
  if (!client) {
    client = new Redis(env.REDIS_URL, { lazyConnect: false });
    client.on("error", (err) => logger.error({ err }, "redis error"));
  }
  return client;
}
