import { Router } from "express";
import { health } from "../controllers/health.controller";
import { storeContext } from "../middleware/store";
import { adminAuthRouter } from "./admin/auth.routes";
import { cartRouter } from "./cart.routes";
import { catalogRouter } from "./catalog.routes";
import { checkoutRouter } from "./checkout.routes";

export const v1Router = Router();

v1Router.get("/health", health);

// Everything below needs the store resolved (single default store today)
v1Router.use(storeContext);
v1Router.use("/admin/auth", adminAuthRouter);
v1Router.use(catalogRouter);
v1Router.use(cartRouter);
v1Router.use(checkoutRouter);
