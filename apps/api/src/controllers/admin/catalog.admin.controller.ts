import type { Request, Response } from "express";
import type {
  AddProductImageInput,
  AdminProductListQuery,
  AdminSearchQuery,
  PresignUploadInput,
  ProductInputParsed,
  UpdateProductImageInput,
} from "@primegear/shared";
import { actorFrom } from "../../lib/audit";
import { sendOk } from "../../lib/response";
import {
  addProductImage,
  deleteProductImage,
  presignUpload,
  reorderProductImages,
  updateProductImage,
} from "../../services/admin/media.admin.service";
import {
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  saveProduct,
} from "../../services/admin/product.admin.service";
import {
  deleteBrand,
  deleteCategory,
  getCatalogOptions,
  listBrands,
  listCategories,
  saveBrand,
  saveCategory,
} from "../../services/admin/taxonomy.admin.service";
import {
  deleteUpsellRule,
  listUpsellRules,
  saveUpsellRule,
} from "../../services/admin/upsell.admin.service";

const param = (req: Request, name: string) => req.params[name] as string;

// ───────────── Products ─────────────

export async function listProductsHandler(req: Request, res: Response) {
  const q = req.query as unknown as AdminProductListQuery;
  const { items, total } = await listAdminProducts(req.storeId, q);
  sendOk(res, items, { page: q.page, limit: q.limit, total });
}

export async function getProductHandler(req: Request, res: Response) {
  sendOk(res, await getAdminProduct(req.storeId, param(req, "id")));
}

export async function createProductHandler(req: Request, res: Response) {
  sendOk(res, await saveProduct(actorFrom(req), null, req.body as ProductInputParsed), undefined, 201);
}

export async function updateProductHandler(req: Request, res: Response) {
  sendOk(res, await saveProduct(actorFrom(req), param(req, "id"), req.body as ProductInputParsed));
}

export async function deleteProductHandler(req: Request, res: Response) {
  await deleteProduct(actorFrom(req), param(req, "id"));
  sendOk(res, { deleted: true });
}

// ───────────── Uploads and images ─────────────

export async function presignHandler(req: Request, res: Response) {
  sendOk(res, await presignUpload(req.storeId, req.body as PresignUploadInput));
}

export async function addImageHandler(req: Request, res: Response) {
  const image = await addProductImage(actorFrom(req), param(req, "id"), req.body as AddProductImageInput);
  sendOk(res, image, undefined, 201);
}

export async function updateImageHandler(req: Request, res: Response) {
  sendOk(
    res,
    await updateProductImage(
      actorFrom(req),
      param(req, "id"),
      param(req, "imageId"),
      req.body as UpdateProductImageInput,
    ),
  );
}

export async function reorderImagesHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  sendOk(res, await reorderProductImages(actorFrom(req), param(req, "id"), ids));
}

export async function deleteImageHandler(req: Request, res: Response) {
  await deleteProductImage(actorFrom(req), param(req, "id"), param(req, "imageId"));
  sendOk(res, { deleted: true });
}

// ───────────── Upsell rules ─────────────

export async function listUpsellsHandler(req: Request, res: Response) {
  const { triggerProductId } = req.query as { triggerProductId?: string };
  sendOk(res, await listUpsellRules(req.storeId, triggerProductId));
}

export async function createUpsellHandler(req: Request, res: Response) {
  sendOk(res, await saveUpsellRule(actorFrom(req), null, req.body), undefined, 201);
}

export async function updateUpsellHandler(req: Request, res: Response) {
  sendOk(res, await saveUpsellRule(actorFrom(req), param(req, "id"), req.body));
}

export async function deleteUpsellHandler(req: Request, res: Response) {
  await deleteUpsellRule(actorFrom(req), param(req, "id"));
  sendOk(res, { deleted: true });
}

// ───────────── Categories and brands ─────────────

export async function listCategoriesHandler(req: Request, res: Response) {
  const q = req.query as unknown as AdminSearchQuery;
  const { items, total } = await listCategories(req.storeId, q);
  sendOk(res, items, { page: q.page, limit: q.limit, total });
}

export async function createCategoryHandler(req: Request, res: Response) {
  sendOk(res, await saveCategory(actorFrom(req), null, req.body), undefined, 201);
}

export async function updateCategoryHandler(req: Request, res: Response) {
  sendOk(res, await saveCategory(actorFrom(req), param(req, "id"), req.body));
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  await deleteCategory(actorFrom(req), param(req, "id"));
  sendOk(res, { deleted: true });
}

export async function listBrandsHandler(req: Request, res: Response) {
  const q = req.query as unknown as AdminSearchQuery;
  const { items, total } = await listBrands(req.storeId, q);
  sendOk(res, items, { page: q.page, limit: q.limit, total });
}

export async function createBrandHandler(req: Request, res: Response) {
  sendOk(res, await saveBrand(actorFrom(req), null, req.body), undefined, 201);
}

export async function updateBrandHandler(req: Request, res: Response) {
  sendOk(res, await saveBrand(actorFrom(req), param(req, "id"), req.body));
}

export async function deleteBrandHandler(req: Request, res: Response) {
  await deleteBrand(actorFrom(req), param(req, "id"));
  sendOk(res, { deleted: true });
}

export async function catalogOptionsHandler(req: Request, res: Response) {
  sendOk(res, await getCatalogOptions(req.storeId));
}
