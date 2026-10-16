import type { AddToCartInput, CartView, UpsellOffer } from "@primegear/shared";

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

export class CartApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CartApiError";
  }
}

/** Browser-side calls to the API (cart + checkout). The guest cart id travels in an httpOnly cookie set by the API. */
export async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new CartApiError("NETWORK_ERROR", "Could not reach the shop. Check your connection.");
  }
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    code?: string;
    message?: string;
  } | null;
  if (!res.ok || !body?.success) {
    throw new CartApiError(body?.code ?? "API_ERROR", body?.message ?? "Something went wrong");
  }
  return body.data as T;
}

export const cartApi = {
  get: () => call<CartView>("/cart"),
  add: (input: Pick<AddToCartInput, "variantId" | "upsellRuleId"> & { quantity: number }) =>
    call<CartView>("/cart", { method: "POST", body: input }),
  update: (itemId: string, quantity: number) =>
    call<CartView>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: { quantity },
    }),
  remove: (itemId: string) =>
    call<CartView>(`/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
  upsells: (productId: string) =>
    call<UpsellOffer[]>(`/cart/upsells?productId=${encodeURIComponent(productId)}`),
};
