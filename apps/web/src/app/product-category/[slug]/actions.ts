"use server";

import { productListQuerySchema, type ProductCard } from "@primegear/shared";
import { getProducts } from "@/lib/api";

/** Sort / filter / load-more for the category page. Input comes from the browser, so it is validated. */
export async function fetchCategoryProducts(
  input: unknown,
): Promise<{ items: ProductCard[]; total: number }> {
  const query = productListQuerySchema.parse(input);
  return getProducts(query);
}
