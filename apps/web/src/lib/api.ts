import type {
  ApiMeta,
  OrderSummary,
  CategoryDetail,
  CategoryNode,
  ProductCard,
  ProductDetail,
  ProductListQuery,
} from "@primegear/shared";

/** Server-side only (server components, actions): straight to the API, not through the /api/v1 proxy. */
const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
/** ISR window for every catalog fetch, matching each page's `revalidate`. */
export const REVALIDATE = 300;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export const isNotFound = (err: unknown) => err instanceof ApiRequestError && err.status === 404;

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

/** `revalidate: false` = never cache (order pages hold personal data). */
async function apiGet<T>(path: string, revalidate: number | false = REVALIDATE) {
  const res = await fetch(
    `${API_URL}/api/v1${path}`,
    revalidate === false ? { cache: "no-store" } : { next: { revalidate } },
  );
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    meta?: ApiMeta;
    code?: string;
    message?: string;
  } | null;
  if (!res.ok || !body?.success) {
    throw new ApiRequestError(
      res.status,
      body?.code ?? "API_ERROR",
      body?.message ?? `API request failed (${res.status})`,
    );
  }
  return { data: body.data as T, meta: body.meta };
}

type ProductListInput = Partial<
  Pick<
    ProductListQuery,
    "category" | "sort" | "page" | "limit" | "minPrice" | "maxPrice" | "inStock"
  >
>;

export async function getProducts(query: ProductListInput = {}) {
  const { data, meta } = await apiGet<ProductCard[]>(`/products${qs(query)}`);
  return { items: data, total: meta?.total ?? data.length };
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  const { data } = await apiGet<Partial<ProductDetail>>(`/products/${encodeURIComponent(slug)}`);
  // A response cached (ISR) before the product page content fields existed lacks them:
  // render those sections as empty rather than failing the page
  return {
    subtitle: null,
    features: [],
    boxContents: [],
    lightModes: [],
    specs: [],
    darkImage: null,
    reviews: { average: 0, count: 0, allVerified: false, latest: [] },
    ...data,
  } as ProductDetail;
}

export const getCategories = async () => (await apiGet<CategoryNode[]>("/categories")).data;

export const getCategory = async (slug: string) =>
  (await apiGet<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`)).data;

export async function searchProducts(q: string, page = 1, limit = 20) {
  const { data, meta } = await apiGet<ProductCard[]>(`/search${qs({ q, page, limit })}`);
  return { items: data, total: meta?.total ?? data.length };
}

export const getOrder = async (orderNumber: string) =>
  (await apiGet<OrderSummary>(`/orders/${encodeURIComponent(orderNumber)}`, false)).data;
