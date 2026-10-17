import type {
  AddProductImageInput,
  AdminIncompleteOrder,
  AdminOrderDetail,
  AdminVariantOption,
  BulkOrderStatusResult,
  ConvertIncompleteInput,
  OrderAddressInput,
  OrderItemsInput,
  OrderStatus,
  OrderStatusResult,
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductImage,
  AdminProductRow,
  AdminProfile,
  AdminUpsellRule,
  BrandInput,
  CategoryInput,
  PresignedUpload,
  PresignUploadInput,
  ProductInput,
  UpdateProductImageInput,
  UpsellRuleInput,
} from "@primegear/shared";
import { call, CartApiError } from "./cart-api";

/** Browser-side admin calls, same-origin through the /api/v1 proxy (the admin cookie is first-party). */
export const adminApi = {
  login: (email: string, password: string) =>
    call<AdminProfile>("/admin/auth/login", { method: "POST", body: { email, password } }),
  logout: () => call<{ loggedOut: true }>("/admin/auth/logout", { method: "POST" }),

  searchProducts: (q: string) =>
    call<AdminProductRow[]>(`/admin/products?limit=10&q=${encodeURIComponent(q)}`),
  createProduct: (body: ProductInput) => call<AdminProduct>("/admin/products", { method: "POST", body }),
  updateProduct: (id: string, body: ProductInput) =>
    call<AdminProduct>(`/admin/products/${id}`, { method: "PUT", body }),
  deleteProduct: (id: string) => call<{ deleted: true }>(`/admin/products/${id}`, { method: "DELETE" }),

  presign: (body: PresignUploadInput) =>
    call<PresignedUpload>("/admin/uploads/presign", { method: "POST", body }),
  addImage: (productId: string, body: AddProductImageInput) =>
    call<AdminProductImage>(`/admin/products/${productId}/images`, { method: "POST", body }),
  updateImage: (productId: string, imageId: string, body: UpdateProductImageInput) =>
    call<AdminProductImage>(`/admin/products/${productId}/images/${imageId}`, { method: "PATCH", body }),
  reorderImages: (productId: string, ids: string[]) =>
    call<AdminProductImage[]>(`/admin/products/${productId}/images/order`, {
      method: "PUT",
      body: { ids },
    }),
  deleteImage: (productId: string, imageId: string) =>
    call<{ deleted: true }>(`/admin/products/${productId}/images/${imageId}`, { method: "DELETE" }),

  upsells: (productId: string) =>
    call<AdminUpsellRule[]>(`/admin/upsell-rules?triggerProductId=${encodeURIComponent(productId)}`),
  createUpsell: (body: UpsellRuleInput) =>
    call<AdminUpsellRule>("/admin/upsell-rules", { method: "POST", body }),
  updateUpsell: (id: string, body: UpsellRuleInput) =>
    call<AdminUpsellRule>(`/admin/upsell-rules/${id}`, { method: "PUT", body }),
  deleteUpsell: (id: string) =>
    call<{ deleted: true }>(`/admin/upsell-rules/${id}`, { method: "DELETE" }),

  createCategory: (body: CategoryInput) =>
    call<AdminCategory>("/admin/categories", { method: "POST", body }),
  updateCategory: (id: string, body: CategoryInput) =>
    call<AdminCategory>(`/admin/categories/${id}`, { method: "PUT", body }),
  deleteCategory: (id: string) =>
    call<{ deleted: true }>(`/admin/categories/${id}`, { method: "DELETE" }),

  createBrand: (body: BrandInput) => call<AdminBrand>("/admin/brands", { method: "POST", body }),
  updateBrand: (id: string, body: BrandInput) =>
    call<AdminBrand>(`/admin/brands/${id}`, { method: "PUT", body }),
  deleteBrand: (id: string) => call<{ deleted: true }>(`/admin/brands/${id}`, { method: "DELETE" }),

  setOrderStatus: (id: string, status: OrderStatus, note?: string) =>
    call<OrderStatusResult>(`/admin/orders/${id}/status`, { method: "POST", body: { status, note } }),
  bulkOrderStatus: (ids: string[], status: OrderStatus) =>
    call<BulkOrderStatusResult>("/admin/orders/bulk-status", { method: "POST", body: { ids, status } }),
  noAnswer: (id: string) =>
    call<{ noAnswerCount: number; lastContactAt: string }>(`/admin/orders/${id}/no-answer`, {
      method: "POST",
    }),
  addOrderNote: (id: string, body: string) =>
    call<AdminOrderDetail["notes"][number]>(`/admin/orders/${id}/notes`, { method: "POST", body: { body } }),
  updateOrderAddress: (id: string, body: OrderAddressInput) =>
    call<AdminOrderDetail>(`/admin/orders/${id}/address`, { method: "PUT", body }),
  updateOrderItems: (id: string, body: OrderItemsInput) =>
    call<AdminOrderDetail>(`/admin/orders/${id}/items`, { method: "PUT", body }),
  variantOptions: (q: string) =>
    call<AdminVariantOption[]>(`/admin/orders/variant-options?q=${encodeURIComponent(q)}`),

  setIncompleteStatus: (id: string, status: "OPEN" | "CONTACTED" | "DISCARDED") =>
    call<AdminIncompleteOrder>(`/admin/incomplete-orders/${id}`, { method: "PATCH", body: { status } }),
  convertIncomplete: (id: string, body: ConvertIncompleteInput) =>
    call<{ orderId: string; orderNumber: string; total: number }>(
      `/admin/incomplete-orders/${id}/convert`,
      { method: "POST", body },
    ),
};

/**
 * Presign, then PUT the file straight to storage (R2 in production, the API's local driver in
 * development). Returns the object key and its public URL. `onProgress` gets 0-1.
 */
export async function uploadFile(
  file: File,
  folder: PresignUploadInput["folder"],
  onProgress?: (fraction: number) => void,
): Promise<{ key: string; publicUrl: string }> {
  const target = await adminApi.presign({
    folder,
    contentType: file.type as PresignUploadInput["contentType"],
    size: file.size,
  });
  // XHR rather than fetch: fetch has no upload progress events
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new CartApiError("UPLOAD_FAILED", `Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new CartApiError("UPLOAD_FAILED", "Upload failed. Check your connection."));
    xhr.send(file);
  });
  return { key: target.key, publicUrl: target.publicUrl };
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";
