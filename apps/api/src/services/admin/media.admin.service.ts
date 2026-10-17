import {
  UPLOAD_CONTENT_TYPES,
  UPLOAD_MAX_BYTES,
  type AddProductImageInput,
  type AdminProductImage,
  type PresignedUpload,
  type PresignUploadInput,
  type UpdateProductImageInput,
} from "@primegear/shared";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import { belongsToStore, getStorage, newObjectKey } from "../../lib/storage";
import { afterCatalogWrite, deleteStoredFiles } from "./catalog-effects";

/**
 * Upload flow: 1) presign → the browser PUTs the file straight to storage, 2) attach the key to a
 * product (addProductImage) or put its publicUrl on a category/brand. The API never streams the file.
 */
export async function presignUpload(storeId: string, input: PresignUploadInput): Promise<PresignedUpload> {
  const storage = getStorage();
  const key = newObjectKey(storeId, input.folder, input.contentType);
  const target = await storage.createUpload({ key, contentType: input.contentType, size: input.size });
  return {
    key,
    url: target.url,
    method: target.method,
    headers: target.headers,
    publicUrl: storage.publicUrl(key),
    expiresAt: target.expiresAt.toISOString(),
  };
}

const toImage = (i: AdminProductImage & Record<string, unknown>): AdminProductImage => ({
  id: i.id,
  url: i.url,
  alt: i.alt,
  kind: i.kind,
  variantId: i.variantId,
  sortOrder: i.sortOrder,
});

async function ownProduct(storeId: string, productId: string) {
  const found = await getPrisma().product.count({ where: { id: productId, storeId } });
  if (!found) throw AppError.notFound("Product not found", "PRODUCT_NOT_FOUND");
}

/** Checks the uploaded object really exists and is an acceptable image before pointing a record at it. */
async function verifyUploaded(storeId: string, key: string) {
  if (!belongsToStore(key, storeId) || !key.startsWith(`stores/${storeId}/products/`)) {
    throw AppError.badRequest("Unknown upload", "UPLOAD_NOT_FOUND");
  }
  const storage = getStorage();
  const object = await storage.head(key);
  if (!object) throw AppError.badRequest("The upload did not finish, try again", "UPLOAD_NOT_FOUND");
  const typeOk =
    object.contentType === null ||
    (UPLOAD_CONTENT_TYPES as readonly string[]).includes(object.contentType);
  if (object.size > UPLOAD_MAX_BYTES || !typeOk) {
    await storage.delete(key).catch(() => undefined);
    throw AppError.badRequest("The file is too large or not an image", "UPLOAD_REJECTED");
  }
  return storage.publicUrl(key);
}

export async function addProductImage(actor: Actor, productId: string, input: AddProductImageInput) {
  await ownProduct(actor.storeId, productId);
  const url = await verifyUploaded(actor.storeId, input.key);
  const image = await getPrisma().$transaction(async (tx) => {
    const last = await tx.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } });
    const created = await tx.productImage.create({
      data: {
        storeId: actor.storeId,
        productId,
        url,
        alt: input.alt ?? null,
        kind: input.kind ?? "STANDARD",
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await audit(tx, actor, {
      action: "product.image.add",
      entity: "ProductImage",
      entityId: created.id,
      after: created,
    });
    return created;
  });
  await afterCatalogWrite(actor.storeId, [productId]);
  return toImage(image);
}

async function loadImage(storeId: string, productId: string, imageId: string) {
  const image = await getPrisma().productImage.findFirst({ where: { id: imageId, productId, storeId } });
  if (!image) throw AppError.notFound("Image not found", "IMAGE_NOT_FOUND");
  return image;
}

export async function updateProductImage(
  actor: Actor,
  productId: string,
  imageId: string,
  input: UpdateProductImageInput,
) {
  const before = await loadImage(actor.storeId, productId, imageId);
  if (input.variantId) {
    const found = await getPrisma().productVariant.count({
      where: { id: input.variantId, productId, storeId: actor.storeId },
    });
    if (!found) throw AppError.badRequest("Unknown variant", "VARIANT_NOT_FOUND");
  }
  const image = await getPrisma().$transaction(async (tx) => {
    const updated = await tx.productImage.update({
      where: { id: imageId },
      data: {
        ...(input.alt !== undefined && { alt: input.alt }),
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.variantId !== undefined && { variantId: input.variantId ?? null }),
      },
    });
    await audit(tx, actor, {
      action: "product.image.update",
      entity: "ProductImage",
      entityId: imageId,
      before,
      after: updated,
    });
    return updated;
  });
  await afterCatalogWrite(actor.storeId, [productId]);
  return toImage(image);
}

/** `ids` must be exactly the product's images, in the new order (first = main image). */
export async function reorderProductImages(actor: Actor, productId: string, ids: string[]) {
  await ownProduct(actor.storeId, productId);
  const images = await getPrisma().$transaction(async (tx) => {
    const current = await tx.productImage.findMany({
      where: { productId, storeId: actor.storeId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    const same =
      current.length === ids.length &&
      new Set(ids).size === ids.length &&
      current.every((c) => ids.includes(c.id));
    if (!same) throw AppError.badRequest("The image list changed, reload and try again", "IMAGES_CHANGED");

    for (const [sortOrder, id] of ids.entries()) {
      await tx.productImage.update({ where: { id }, data: { sortOrder } });
    }
    await audit(tx, actor, {
      action: "product.image.reorder",
      entity: "Product",
      entityId: productId,
      before: current.map((c) => c.id),
      after: ids,
    });
    return tx.productImage.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
  });
  await afterCatalogWrite(actor.storeId, [productId]);
  return images.map(toImage);
}

export async function deleteProductImage(actor: Actor, productId: string, imageId: string) {
  const before = await loadImage(actor.storeId, productId, imageId);
  await getPrisma().$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    await audit(tx, actor, {
      action: "product.image.delete",
      entity: "ProductImage",
      entityId: imageId,
      before,
    });
  });
  await deleteStoredFiles(actor.storeId, [before.url]);
  await afterCatalogWrite(actor.storeId, [productId]);
}
