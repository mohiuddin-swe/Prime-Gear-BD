import { Router } from "express";
import { health } from "../controllers/health.controller";
import { storeContext } from "../middleware/store";
import { adminAuthRouter } from "./admin/auth.routes";
import { adminCatalogRouter } from "./admin/catalog.routes";
import { adminOrderRouter } from "./admin/order.routes";
import { cartRouter } from "./cart.routes";
import { catalogRouter } from "./catalog.routes";
import { checkoutRouter } from "./checkout.routes";
import { localUploadRouter } from "./local-upload.routes";

export const v1Router = Router();

v1Router.get("/health", health);
// Local storage driver's signed PUT endpoint (the key carries the store, no lookup needed)
v1Router.use(localUploadRouter);

// Everything below needs the store resolved (single default store today)
v1Router.use(storeContext);
v1Router.use("/admin/auth", adminAuthRouter);
v1Router.use("/admin", adminOrderRouter);
v1Router.use("/admin", adminCatalogRouter);
v1Router.use(catalogRouter);
v1Router.use(cartRouter);
v1Router.use(checkoutRouter);
