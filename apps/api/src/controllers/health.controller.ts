import type { Request, Response } from "express";
import { getHealth } from "../services/health.service";

export function health(_req: Request, res: Response) {
  res.json({ success: true, data: getHealth() });
}
