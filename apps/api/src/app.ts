import cors from "cors";
import express from "express";
import { v1Router } from "./routes";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true }));
  app.use(express.json());
  app.use("/api/v1", v1Router);
  return app;
}
