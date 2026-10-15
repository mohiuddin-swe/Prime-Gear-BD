import { Redis } from "ioredis";
import { env } from "../config/env";

/** BullMQ requires maxRetriesPerRequest: null, so it gets its own connection (not lib/redis). */
export function createQueueConnection() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
