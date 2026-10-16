import { isIP } from "node:net";
import type { Request } from "express";

/** Behind Cloudflare the real visitor is in CF-Connecting-IP; otherwise Express resolves it (trust proxy). */
export function clientIp(req: Request): string | undefined {
  const cf = req.get("cf-connecting-ip")?.trim();
  if (cf && isIP(cf)) return cf;
  return req.ip && isIP(req.ip) ? req.ip : undefined;
}

export const clientUserAgent = (req: Request) => req.get("user-agent")?.slice(0, 512) || undefined;
