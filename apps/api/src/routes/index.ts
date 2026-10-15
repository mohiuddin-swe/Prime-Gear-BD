import { Router } from "express";
import { health } from "../controllers/health.controller";

export const v1Router = Router();

v1Router.get("/health", health);
