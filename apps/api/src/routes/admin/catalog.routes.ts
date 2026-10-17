import { Router } from "express";
import {
  CATALOG_ADMIN_ROLES,
  addProductImageSchema,
  adminProductListQuerySchema,
  adminSearchQuerySchema,
  brandInputSchema,
  categoryInputSchema,
  idParamsSchema,
  presignUploadSchema,
  productImageParamsSchema,
  productInputSchema,
  reorderImagesSchema,
  updateProductImageSchema,
  upsellRuleInputSchema,
  upsellRuleListQuerySchema,
} from "@primegear/shared";
import * as c from "../../controllers/admin/catalog.admin.controller";
import { requireAdmin } from "../../middleware/require-admin";
import { validate } from "../../middleware/validate";

/** /api/v1/admin catalog: products, images, upsell rules, categories, brands. OWNER and MANAGER only. */
export const adminCatalogRouter = Router();

adminCatalogRouter.use(requireAdmin(...CATALOG_ADMIN_ROLES));

const byId = { params: idParamsSchema };

adminCatalogRouter.get("/catalog-options", c.catalogOptionsHandler);

adminCatalogRouter.get("/products", validate({ query: adminProductListQuerySchema }), c.listProductsHandler);
adminCatalogRouter.post("/products", validate({ body: productInputSchema }), c.createProductHandler);
adminCatalogRouter.get("/products/:id", validate(byId), c.getProductHandler);
adminCatalogRouter.put("/products/:id", validate({ ...byId, body: productInputSchema }), c.updateProductHandler);
adminCatalogRouter.delete("/products/:id", validate(byId), c.deleteProductHandler);

adminCatalogRouter.post("/uploads/presign", validate({ body: presignUploadSchema }), c.presignHandler);
adminCatalogRouter.post(
  "/products/:id/images",
  validate({ ...byId, body: addProductImageSchema }),
  c.addImageHandler,
);
adminCatalogRouter.put(
  "/products/:id/images/order",
  validate({ ...byId, body: reorderImagesSchema }),
  c.reorderImagesHandler,
);
adminCatalogRouter.patch(
  "/products/:id/images/:imageId",
  validate({ params: productImageParamsSchema, body: updateProductImageSchema }),
  c.updateImageHandler,
);
adminCatalogRouter.delete(
  "/products/:id/images/:imageId",
  validate({ params: productImageParamsSchema }),
  c.deleteImageHandler,
);

adminCatalogRouter.get("/upsell-rules", validate({ query: upsellRuleListQuerySchema }), c.listUpsellsHandler);
adminCatalogRouter.post("/upsell-rules", validate({ body: upsellRuleInputSchema }), c.createUpsellHandler);
adminCatalogRouter.put(
  "/upsell-rules/:id",
  validate({ ...byId, body: upsellRuleInputSchema }),
  c.updateUpsellHandler,
);
adminCatalogRouter.delete("/upsell-rules/:id", validate(byId), c.deleteUpsellHandler);

adminCatalogRouter.get("/categories", validate({ query: adminSearchQuerySchema }), c.listCategoriesHandler);
adminCatalogRouter.post("/categories", validate({ body: categoryInputSchema }), c.createCategoryHandler);
adminCatalogRouter.put(
  "/categories/:id",
  validate({ ...byId, body: categoryInputSchema }),
  c.updateCategoryHandler,
);
adminCatalogRouter.delete("/categories/:id", validate(byId), c.deleteCategoryHandler);

adminCatalogRouter.get("/brands", validate({ query: adminSearchQuerySchema }), c.listBrandsHandler);
adminCatalogRouter.post("/brands", validate({ body: brandInputSchema }), c.createBrandHandler);
adminCatalogRouter.put("/brands/:id", validate({ ...byId, body: brandInputSchema }), c.updateBrandHandler);
adminCatalogRouter.delete("/brands/:id", validate(byId), c.deleteBrandHandler);
