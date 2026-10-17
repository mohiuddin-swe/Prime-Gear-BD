// Server only: next/headers fails loudly if this is ever imported into a client component
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminProfile, ApiMeta } from "@primegear/shared";
import { ApiRequestError } from "./api";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
export const ADMIN_LOGIN_PATH = "/admin/login/";

/**
 * Server components in /admin: calls the API directly with the visitor's admin cookie, never cached.
 * A 401 (no / expired session) sends the visitor to the login page.
 */
export async function adminGet<T>(path: string): Promise<{ data: T; meta?: ApiMeta }> {
  const jar = await cookies();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    cache: "no-store",
    headers: { cookie: jar.toString() },
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    meta?: ApiMeta;
    code?: string;
    message?: string;
  } | null;
  if (res.status === 401) redirect(ADMIN_LOGIN_PATH);
  if (!res.ok || !body?.success) {
    throw new ApiRequestError(res.status, body?.code ?? "API_ERROR", body?.message ?? `API request failed (${res.status})`);
  }
  return { data: body.data as T, meta: body.meta };
}

/** The signed-in admin, or null. Used by the panel layout (redirects) and the login page (skips the form). */
export async function getAdminSession(): Promise<AdminProfile | null> {
  const jar = await cookies();
  if (!jar.has("pg_admin")) return null;
  const res = await fetch(`${API_URL}/api/v1/admin/auth/me`, {
    cache: "no-store",
    headers: { cookie: jar.toString() },
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { data?: AdminProfile } | null;
  return body?.data ?? null;
}

/** Query string from searchParams, dropping empty values (GET filter forms submit blanks). */
export function toQuery(params: Record<string, string | string[] | undefined>, keys: string[]) {
  const sp = new URLSearchParams();
  for (const key of keys) {
    const v = params[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) sp.set(key, value);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
