import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { globalLimiter } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { v1Router } from "./routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // behind Cloudflare / a reverse proxy: req.ip must be the client
  app.use(requestLogger);
  app.use(helmet());
  // The storefront calls the API same-origin through the Next.js /api/v1 proxy, so it needs no
  // CORS; this is for callers on another origin (e.g. a separate admin or tools domain)
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(globalLimiter());
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/v1", v1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
