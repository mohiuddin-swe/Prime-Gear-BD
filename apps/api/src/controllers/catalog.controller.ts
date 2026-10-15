import type { Request, Response } from "express";
import type { ProductListQuery, SearchQuery } from "@primegear/shared";
import { sendOk } from "../lib/response";
import { getCategoryBySlug, getCategoryTree } from "../services/category.service";
import { getProductBySlug, listProducts } from "../services/product.service";
import { searchProducts } from "../services/search.service";

export async function listProductsHandler(req: Request, res: Response) {
  const query = req.query as unknown as ProductListQuery;
  const { items, total } = await listProducts(req.storeId, query);
  sendOk(res, items, { page: query.page, limit: query.limit, total });
}

export async function getProductHandler(req: Request, res: Response) {
  sendOk(res, await getProductBySlug(req.storeId, req.params.slug as string));
}

export async function listCategoriesHandler(req: Request, res: Response) {
  sendOk(res, await getCategoryTree(req.storeId));
}

export async function getCategoryHandler(req: Request, res: Response) {
  sendOk(res, await getCategoryBySlug(req.storeId, req.params.slug as string));
}

export async function searchHandler(req: Request, res: Response) {
  const query = req.query as unknown as SearchQuery;
  const { items, total } = await searchProducts(req.storeId, query);
  sendOk(res, items, { page: query.page, limit: query.limit, total });
}
