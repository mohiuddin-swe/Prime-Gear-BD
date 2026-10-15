import { Router } from "express";
import { productListQuerySchema, searchQuerySchema, slugParamsSchema } from "@primegear/shared";
import {
  getCategoryHandler,
  getProductHandler,
  listCategoriesHandler,
  listProductsHandler,
  searchHandler,
} from "../controllers/catalog.controller";
import { validate } from "../middleware/validate";

export const catalogRouter = Router();

catalogRouter.get("/products", validate({ query: productListQuerySchema }), listProductsHandler);
catalogRouter.get("/products/:slug", validate({ params: slugParamsSchema }), getProductHandler);
catalogRouter.get("/categories", listCategoriesHandler);
catalogRouter.get("/categories/:slug", validate({ params: slugParamsSchema }), getCategoryHandler);
catalogRouter.get("/search", validate({ query: searchQuerySchema }), searchHandler);
