import type { AddToCartInput, CartView, UpsellOffer } from "@primegear/shared";

// Same-origin: next.config rewrites /api/v1/* to the API, so the cart cookie is first-party
const BASE = "/api/v1";

/**
 * "/cart/items/x?zone=y" -> "/api/v1/cart/items/x/?zone=y". The site uses trailingSlash, so Next
 * would 308-redirect a slashless path before the proxy; Express routes both forms the same.
 */
const apiUrl = (path: string) => {
  const [pathname, query] = path.split("?", 2);
  return `${BASE}${pathname!.replace(/\/?$/, "/")}${query === undefined ? "" : `?${query}`}`;
};

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
    res = await fetch(apiUrl(path), {
      method: init.method ?? "GET",
      credentials: "same-origin",
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
